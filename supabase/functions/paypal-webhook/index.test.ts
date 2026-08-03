import {
  fetchWithRetry,
  getPayPalEventId,
  handlePayPalWebhookRequest,
  isHandledPayPalEventType,
  parseRetryAfterMs,
  reserveEvent,
} from "./index.ts";
import {
  buildSubscriptionDebugSummary,
  maskEmail,
} from "../../../scripts/debug-paypal-subscription.ts";

function assert(
  condition: unknown,
  message = "Assertion failed",
): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T, message?: string) {
  if (Object.is(actual, expected)) return;
  throw new Error(
    message ??
      `Expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
  );
}

function duplicateAdmin(processed: boolean) {
  return {
    from(table: string) {
      assertEquals(table, "paypal_webhook_events");
      return {
        insert: async () => ({ error: { code: "23505" } }),
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                processed,
                processing_error: processed ? null : "temporary",
              },
              error: null,
            }),
          }),
        }),
      };
    },
  };
}

Deno.test("PayPal event allowlist accepts only subscription safety events", () => {
  assert(isHandledPayPalEventType("BILLING.SUBSCRIPTION.ACTIVATED"));
  assert(isHandledPayPalEventType("PAYMENT.SALE.REFUNDED"));
  assert(!isHandledPayPalEventType("CUSTOMER.DISPUTE.CREATED"));
  assert(!isHandledPayPalEventType(""));
});

Deno.test("PayPal event IDs must be stable non-empty strings", () => {
  assertEquals(getPayPalEventId({ id: " WH-123 " }), "WH-123");
  assertEquals(getPayPalEventId({ id: "" }), null);
  assertEquals(getPayPalEventId({}), null);
});

Deno.test("Retry-After supports seconds and HTTP dates", () => {
  assertEquals(parseRetryAfterMs("2"), 2_000);
  assertEquals(
    parseRetryAfterMs(
      "Tue, 04 Aug 2026 12:00:05 GMT",
      Date.parse("2026-08-04T12:00:00Z"),
    ),
    5_000,
  );
  assertEquals(parseRetryAfterMs("not-a-date"), null);
});

Deno.test("PayPal API calls retry 429 and 5xx responses before succeeding", async () => {
  const statuses = [429, 503, 200];
  const delays: number[] = [];
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    const status = statuses[calls++] ?? 500;
    return new Response(JSON.stringify({ status }), {
      status,
      headers: status === 429 ? { "Retry-After": "1" } : undefined,
    });
  };

  const response = await fetchWithRetry("https://api-m.paypal.com/test", {}, {
    fetchImpl,
    maxAttempts: 4,
    baseDelayMs: 100,
    maxDelayMs: 2_000,
    randomImpl: () => 0,
    sleepImpl: async (milliseconds) => {
      delays.push(milliseconds);
    },
  });

  assertEquals(response.status, 200);
  assertEquals(calls, 3);
  assertEquals(JSON.stringify(delays), JSON.stringify([1_000, 200]));
});

Deno.test("PayPal API calls do not retry permanent 4xx responses", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response("bad request", { status: 400 });
  };

  const response = await fetchWithRetry("https://api-m.paypal.com/test", {}, {
    fetchImpl,
    sleepImpl: async () => {
      throw new Error("sleep should not be called");
    },
  });

  assertEquals(response.status, 400);
  assertEquals(calls, 1);
});

Deno.test("A processed duplicate PayPal event returns the idempotent fast path", async () => {
  const reservation = await reserveEvent(duplicateAdmin(true), {
    id: "WH-PROCESSED",
    event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
    resource: { id: "I-SUBSCRIPTION" },
  });

  assertEquals(reservation.eventId, "WH-PROCESSED");
  assertEquals(reservation.alreadyProcessed, true);
  assertEquals(reservation.retryingFailedEvent, false);
});

Deno.test("A failed duplicate PayPal event is eligible for safe retry", async () => {
  const reservation = await reserveEvent(duplicateAdmin(false), {
    id: "WH-FAILED",
    event_type: "BILLING.SUBSCRIPTION.CANCELLED",
    resource: { id: "I-SUBSCRIPTION" },
  });

  assertEquals(reservation.eventId, "WH-FAILED");
  assertEquals(reservation.alreadyProcessed, false);
  assertEquals(reservation.retryingFailedEvent, true);
});

Deno.test("Webhook rejects a missing event ID before touching credentials", async () => {
  const response = await handlePayPalWebhookRequest(
    new Request("https://example.test/paypal-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
        resource: {},
      }),
    }),
  );

  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.error, "PayPal webhook event ID is required");
});

Deno.test("Read-only debug output masks payer email and omits credentials", () => {
  assertEquals(maskEmail("customer@example.com"), "cu******@example.com");

  const summary = buildSubscriptionDebugSummary({
    id: "I-TEST",
    status: "ACTIVE",
    plan_id: "P-PLAN",
    custom_id: "00000000-0000-4000-8000-000000000000",
    subscriber: {
      email_address: "customer@example.com",
      payer_id: "PAYER",
    },
    client_secret: "must-not-leak",
    access_token: "must-not-leak",
  });
  const serialized = JSON.stringify(summary);

  assert(serialized.includes("cu******@example.com"));
  assert(!serialized.includes("must-not-leak"));
  assert(!serialized.includes("client_secret"));
  assert(!serialized.includes("access_token"));
});
