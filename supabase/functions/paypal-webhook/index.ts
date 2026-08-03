// ============================================================
// AI MARKET EXPERT - PayPal subscription webhook
// Supabase Edge Function / Deno
//
// Security contract:
// - PayPal signs every accepted webhook.
// - Browser approval never grants access by itself.
// - A verified PayPal plan ID maps to explicit product entitlements.
// - CREATED events are stored but do not grant access.
// - ACTIVATED / verified completed payments grant access.
// - Multiple active subscriptions are aggregated per user, so cancelling
//   one product cannot revoke another product that is still paid.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

type PayPalEnv = "sandbox" | "live";
type JsonObject = Record<string, any>;
type Entitlements = {
  product: "models" | "outlook" | "complete";
  modelsAccess: boolean;
  outlookAccess: boolean;
};
type ProfileFallbackStatus = "cancelled" | "expired" | "past_due";

export const HANDLED_PAYPAL_EVENT_TYPES = new Set([
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.DENIED",
  "PAYMENT.SALE.REVERSED",
  "PAYMENT.SALE.REFUNDED",
]);

type FetchRetryOptions = {
  fetchImpl?: typeof fetch;
  maxAttempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleepImpl?: (milliseconds: number) => Promise<void>;
  randomImpl?: () => number;
  nowImpl?: () => number;
};

const DEFAULT_FETCH_ATTEMPTS = 4;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_BASE_DELAY_MS = 300;
const DEFAULT_RETRY_MAX_DELAY_MS = 5_000;

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function isHandledPayPalEventType(eventType: unknown) {
  return HANDLED_PAYPAL_EVENT_TYPES.has(String(eventType ?? ""));
}

export function getPayPalEventId(event: JsonObject) {
  const eventId = typeof event?.id === "string" ? event.id.trim() : "";
  return eventId || null;
}

export function parseRetryAfterMs(
  value: string | null,
  now = Date.now(),
): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1_000);
  }

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  return Math.max(0, retryAt - now);
}

function shouldRetryStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function retryDelayMs(
  attempt: number,
  response: Response | null,
  options: Required<
    Pick<
      FetchRetryOptions,
      "baseDelayMs" | "maxDelayMs" | "randomImpl" | "nowImpl"
    >
  >,
) {
  const retryAfter = parseRetryAfterMs(
    response?.headers.get("retry-after") ?? null,
    options.nowImpl(),
  );

  if (retryAfter !== null) {
    return Math.min(retryAfter, options.maxDelayMs);
  }

  const exponential = Math.min(
    options.baseDelayMs * 2 ** Math.max(0, attempt - 1),
    options.maxDelayMs,
  );
  const jitter = Math.round(exponential * 0.2 * options.randomImpl());
  return Math.min(exponential + jitter, options.maxDelayMs);
}

export async function fetchWithRetry(
  input: string | URL | Request,
  init: RequestInit = {},
  options: FetchRetryOptions = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxAttempts = Math.max(
    1,
    options.maxAttempts ?? DEFAULT_FETCH_ATTEMPTS,
  );
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS);
  const baseDelayMs = Math.max(
    0,
    options.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS,
  );
  const maxDelayMs = Math.max(
    baseDelayMs,
    options.maxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS,
  );
  const sleepImpl = options.sleepImpl ?? sleep;
  const randomImpl = options.randomImpl ?? Math.random;
  const nowImpl = options.nowImpl ?? Date.now;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const upstreamSignal = init.signal;
    const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);

    if (upstreamSignal?.aborted) {
      abortFromUpstream();
    } else {
      upstreamSignal?.addEventListener("abort", abortFromUpstream, {
        once: true,
      });
    }

    const timeoutId = setTimeout(
      () =>
        controller.abort(
          new DOMException("PayPal request timed out", "TimeoutError"),
        ),
      timeoutMs,
    );
    let response: Response | null = null;

    try {
      response = await fetchImpl(input, {
        ...init,
        signal: controller.signal,
      });

      if (!shouldRetryStatus(response.status) || attempt === maxAttempts) {
        return response;
      }

      await response.body?.cancel().catch(() => undefined);
    } catch (error) {
      if (upstreamSignal?.aborted) throw error;
      lastError = error;

      if (attempt === maxAttempts) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `PayPal request failed after ${maxAttempts} attempts: ${detail}`,
        );
      }
    } finally {
      clearTimeout(timeoutId);
      upstreamSignal?.removeEventListener("abort", abortFromUpstream);
    }

    await sleepImpl(
      retryDelayMs(attempt, response, {
        baseDelayMs,
        maxDelayMs,
        randomImpl,
        nowImpl,
      }),
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("PayPal request failed without a response.");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, paypal-auth-algo, paypal-cert-url, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: JsonObject, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optionalEnv(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  return null;
}

export function getPayPalEnvironment(): PayPalEnv {
  const env = (Deno.env.get("PAYPAL_ENV") ?? "").trim().toLowerCase();

  if (env !== "sandbox" && env !== "live") {
    throw new Error("PAYPAL_ENV must be explicitly set to sandbox or live.");
  }

  return env;
}

export function getPayPalBaseUrl() {
  const env = getPayPalEnvironment();
  return env === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

function safePayPalErrorData(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const source = data as JsonObject;
  return {
    name: typeof source.name === "string"
      ? source.name.slice(0, 160)
      : undefined,
    message: typeof source.message === "string"
      ? source.message.slice(0, 500)
      : undefined,
    debug_id: typeof source.debug_id === "string"
      ? source.debug_id.slice(0, 160)
      : undefined,
    details: Array.isArray(source.details)
      ? source.details.slice(0, 10)
      : undefined,
  };
}

function paypalApiError(operation: string, response: Response, data: unknown) {
  const safeData = safePayPalErrorData(data);
  const detail = safeData ? ` ${JSON.stringify(safeData)}` : "";
  return new Error(`${operation} failed: HTTP ${response.status}.${detail}`);
}

async function responseJson(response: Response) {
  try {
    return (await response.json()) as JsonObject;
  } catch (_) {
    return {} as JsonObject;
  }
}

function getSupabaseAdmin() {
  const url = requiredEnv("SUPABASE_URL");
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  let key = serviceRoleKey;

  if (!key && secretKeysJson) {
    try {
      const parsed = JSON.parse(secretKeysJson);
      key = parsed.default ?? Object.values(parsed)[0];
    } catch (_) {
      // handled below
    }
  }

  if (!key || typeof key !== "string") {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEYS.default",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getPayPalAccessToken() {
  const clientId = requiredEnv("PAYPAL_CLIENT_ID");
  const clientSecret = requiredEnv("PAYPAL_CLIENT_SECRET");
  const baseUrl = getPayPalBaseUrl();
  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetchWithRetry(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await responseJson(response);

  if (!response.ok || !data.access_token) {
    throw paypalApiError("PayPal OAuth", response, data);
  }

  return data.access_token as string;
}

async function verifyPayPalWebhook(req: Request, event: JsonObject) {
  const webhookId = requiredEnv("PAYPAL_WEBHOOK_ID");
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const payload = {
    transmission_id: req.headers.get("paypal-transmission-id"),
    transmission_time: req.headers.get("paypal-transmission-time"),
    cert_url: req.headers.get("paypal-cert-url"),
    auth_algo: req.headers.get("paypal-auth-algo"),
    transmission_sig: req.headers.get("paypal-transmission-sig"),
    webhook_id: webhookId,
    webhook_event: event,
  };

  for (const [key, value] of Object.entries(payload)) {
    if (!value) throw new Error(`Missing PayPal verification field: ${key}`);
  }

  const response = await fetchWithRetry(
    `${baseUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await responseJson(response);

  if (!response.ok) {
    throw paypalApiError("PayPal webhook verification", response, data);
  }

  return data.verification_status === "SUCCESS";
}

export async function fetchPayPalSubscription(subscriptionId: string) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetchWithRetry(
    `${getPayPalBaseUrl()}/v1/billing/subscriptions/${
      encodeURIComponent(
        subscriptionId,
      )
    }`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  const data = await responseJson(response);

  if (!response.ok) {
    throw paypalApiError("PayPal subscription lookup", response, data);
  }

  return data as JsonObject;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function safeIso(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function estimateExpiry(resource: JsonObject, fallbackDays = 32) {
  const nextBilling = safeIso(resource?.billing_info?.next_billing_time);
  if (nextBilling) return nextBilling;

  const lastPayment = safeIso(resource?.billing_info?.last_payment?.time);
  if (lastPayment) {
    return addDays(new Date(lastPayment), fallbackDays).toISOString();
  }

  return addDays(new Date(), fallbackDays).toISOString();
}

function looksLikeUuid(value: unknown) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(
        value,
      )
  );
}

function getSubscriptionIdFromResource(resource: JsonObject) {
  return (
    resource?.id ??
      resource?.billing_agreement_id ??
      resource?.subscription_id ??
      resource?.supplementary_data?.related_ids?.billing_agreement_id ??
      null
  );
}

function entitlementsForPlan(planId: unknown): Entitlements {
  const normalized = String(planId ?? "").trim();
  const modelsPlan = optionalEnv(
    "PAYPAL_MODELS_PLAN_ID",
    "PAYPAL_PRO_MONTHLY_PLAN_ID",
  );
  const outlookPlan = optionalEnv("PAYPAL_OUTLOOK_PLAN_ID");
  const completePlan = optionalEnv("PAYPAL_COMPLETE_PLAN_ID");

  if (modelsPlan && normalized === modelsPlan) {
    return {
      product: "models",
      modelsAccess: true,
      outlookAccess: false,
    };
  }

  if (outlookPlan && normalized === outlookPlan) {
    return {
      product: "outlook",
      modelsAccess: false,
      outlookAccess: true,
    };
  }

  if (completePlan && normalized === completePlan) {
    return {
      product: "complete",
      modelsAccess: true,
      outlookAccess: true,
    };
  }

  throw new Error(
    `PayPal plan is not mapped to an entitlement: ${
      normalized || "missing plan_id"
    }`,
  );
}

function isActiveSubscriptionStatus(value: unknown) {
  return String(value ?? "").toUpperCase() === "ACTIVE";
}

async function canonicalSubscriptionResource(resource: JsonObject) {
  if (
    resource?.plan_id && resource?.id && String(resource.id).startsWith("I-")
  ) {
    return resource;
  }

  const subscriptionId = getSubscriptionIdFromResource(resource);
  if (!subscriptionId) {
    throw new Error(
      "Could not resolve PayPal subscription ID from event resource.",
    );
  }

  return await fetchPayPalSubscription(String(subscriptionId));
}

async function resolveUserId(admin: any, resource: JsonObject) {
  const customId = resource?.custom_id;
  if (looksLikeUuid(customId)) return customId as string;

  const email = resource?.subscriber?.email_address ??
    resource?.payer?.email_address ?? null;

  if (email) {
    const { data, error } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("email", String(email))
      .maybeSingle();

    if (!error && data?.user_id) return data.user_id as string;
  }

  return null;
}

async function resolveUserIdWithStoredSubscription(
  admin: any,
  resource: JsonObject,
) {
  let userId = await resolveUserId(admin, resource);
  const subscriptionId = getSubscriptionIdFromResource(resource);

  if (!userId && subscriptionId) {
    const { data } = await admin
      .from("paypal_subscriptions")
      .select("user_id")
      .eq("paypal_subscription_id", String(subscriptionId))
      .maybeSingle();

    userId = data?.user_id ?? null;
  }

  return userId;
}

export async function reserveEvent(admin: any, event: JsonObject) {
  const eventId = getPayPalEventId(event);
  if (!eventId) {
    throw new Error("PayPal webhook event is missing a stable event ID.");
  }

  const eventType = String(event.event_type ?? "UNKNOWN");
  const resource = event.resource ?? {};
  const subscriptionId = getSubscriptionIdFromResource(resource);

  const { error } = await admin.from("paypal_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    resource_id: resource?.id ?? null,
    paypal_subscription_id: subscriptionId,
    payload: event,
  });

  if (error) {
    if (error.code === "23505") {
      const { data, error: lookupError } = await admin
        .from("paypal_webhook_events")
        .select("processed,processing_error")
        .eq("event_id", eventId)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!data) {
        throw new Error("Duplicate PayPal event could not be reloaded.");
      }

      return {
        eventId,
        alreadyProcessed: data.processed === true,
        retryingFailedEvent: data.processed !== true,
      };
    }

    throw error;
  }

  return {
    eventId,
    alreadyProcessed: false,
    retryingFailedEvent: false,
  };
}

async function markEvent(
  admin: any,
  eventId: string,
  processed: boolean,
  processingError?: string,
) {
  const { error } = await admin
    .from("paypal_webhook_events")
    .update({
      processed,
      processing_error: processingError ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);

  if (error) throw error;
}

async function upsertSubscription(
  admin: any,
  resource: JsonObject,
  userId: string,
  statusOverride?: string,
) {
  const subscriptionId = getSubscriptionIdFromResource(resource);
  if (!subscriptionId) {
    throw new Error("Missing subscription ID during upsert.");
  }

  const email = resource?.subscriber?.email_address ??
    resource?.payer?.email_address ?? null;
  const payerId = resource?.subscriber?.payer_id ?? resource?.payer?.payer_id ??
    null;
  const planId = resource?.plan_id ?? null;
  const status = statusOverride ?? resource?.status ?? "UNKNOWN";

  const { error } = await admin.from("paypal_subscriptions").upsert(
    {
      paypal_subscription_id: String(subscriptionId),
      user_id: userId,
      email,
      status,
      plan_id: planId,
      payer_id: payerId,
      next_billing_time: safeIso(resource?.billing_info?.next_billing_time),
      last_payment_time: safeIso(resource?.billing_info?.last_payment?.time),
      raw: resource,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paypal_subscription_id" },
  );

  if (error) throw error;
  return String(subscriptionId);
}

async function recomputeProfileEntitlements(
  admin: any,
  userId: string,
  fallbackStatus: ProfileFallbackStatus = "cancelled",
) {
  const { data, error } = await admin
    .from("paypal_subscriptions")
    .select(
      "paypal_subscription_id,status,plan_id,payer_id,next_billing_time,raw,updated_at",
    )
    .eq("user_id", userId);

  if (error) throw error;

  const activeRows = (data ?? []).filter((row: JsonObject) =>
    isActiveSubscriptionStatus(row.status)
  );

  let modelsAccess = false;
  let outlookAccess = false;
  const products: string[] = [];

  for (const row of activeRows) {
    const mapped = entitlementsForPlan(row.plan_id);
    modelsAccess ||= mapped.modelsAccess;
    outlookAccess ||= mapped.outlookAccess;
    products.push(mapped.product);
  }

  if (!activeRows.length) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        plan: "free",
        subscription_status: fallbackStatus,
        subscription_provider: "paypal",
        subscription_expires_at: new Date().toISOString(),
        subscription_updated_at: new Date().toISOString(),
        models_access: false,
        outlook_access: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (profileError) throw profileError;

    return {
      activeSubscriptions: 0,
      products: [],
      modelsAccess: false,
      outlookAccess: false,
    };
  }

  const sorted = [...activeRows].sort((left: JsonObject, right: JsonObject) =>
    String(right.updated_at ?? "").localeCompare(String(left.updated_at ?? ""))
  );
  const representative = sorted[0];

  const expiryCandidates = activeRows
    .map((row: JsonObject) => safeIso(row.next_billing_time))
    .filter((value: string | null): value is string => Boolean(value))
    .sort();
  const expiry = expiryCandidates[expiryCandidates.length - 1] ??
    estimateExpiry(representative.raw ?? {}, 32);

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      plan: "pro",
      subscription_status: "active",
      subscription_provider: "paypal",
      provider_customer_id: representative.payer_id ?? null,
      provider_subscription_id: representative.paypal_subscription_id ?? null,
      paypal_plan_id: activeRows.length === 1
        ? representative.plan_id ?? null
        : null,
      subscription_expires_at: expiry,
      subscription_updated_at: new Date().toISOString(),
      models_access: modelsAccess,
      outlook_access: outlookAccess,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (profileError) throw profileError;

  return {
    activeSubscriptions: activeRows.length,
    products: [...new Set(products)],
    modelsAccess,
    outlookAccess,
  };
}

async function handleSubscriptionEvent(
  admin: any,
  eventType: string,
  eventResource: JsonObject,
) {
  const canonical = await canonicalSubscriptionResource(eventResource);
  const subscriptionId = getSubscriptionIdFromResource(canonical);
  let userId = await resolveUserIdWithStoredSubscription(admin, canonical);

  if (!userId) {
    userId = await resolveUserIdWithStoredSubscription(admin, eventResource);
  }

  if (!userId) {
    throw new Error(
      "Could not resolve Supabase user_id from PayPal custom_id, email or stored subscription.",
    );
  }

  const status = String(canonical?.status ?? "").toUpperCase();

  if (eventType === "BILLING.SUBSCRIPTION.CREATED") {
    await upsertSubscription(admin, canonical, userId, status || "CREATED");
    return { userId, action: "stored_without_access", subscriptionId, status };
  }

  if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
    await upsertSubscription(admin, canonical, userId, "ACTIVE");
    const entitlements = await recomputeProfileEntitlements(admin, userId);
    return { userId, action: "activated", subscriptionId, entitlements };
  }

  if (eventType === "BILLING.SUBSCRIPTION.UPDATED") {
    await upsertSubscription(admin, canonical, userId, status || "UPDATED");

    if (status === "ACTIVE") {
      const entitlements = await recomputeProfileEntitlements(admin, userId);
      return { userId, action: "updated_active", subscriptionId, entitlements };
    }

    if (status === "CANCELLED") {
      const entitlements = await recomputeProfileEntitlements(
        admin,
        userId,
        "cancelled",
      );
      return {
        userId,
        action: "updated_cancelled",
        subscriptionId,
        entitlements,
      };
    }

    if (status === "EXPIRED") {
      const entitlements = await recomputeProfileEntitlements(
        admin,
        userId,
        "expired",
      );
      return {
        userId,
        action: "updated_expired",
        subscriptionId,
        entitlements,
      };
    }

    if (status === "SUSPENDED") {
      const entitlements = await recomputeProfileEntitlements(
        admin,
        userId,
        "past_due",
      );
      return {
        userId,
        action: "updated_suspended",
        subscriptionId,
        entitlements,
      };
    }

    return {
      userId,
      action: "updated_no_entitlement_change",
      subscriptionId,
      status,
    };
  }

  if (eventType === "PAYMENT.SALE.COMPLETED") {
    await upsertSubscription(admin, canonical, userId, "ACTIVE");
    const entitlements = await recomputeProfileEntitlements(admin, userId);
    return {
      userId,
      action: "payment_completed",
      subscriptionId,
      entitlements,
    };
  }

  if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
    await upsertSubscription(admin, canonical, userId, "CANCELLED");
    const entitlements = await recomputeProfileEntitlements(
      admin,
      userId,
      "cancelled",
    );
    return { userId, action: "cancelled", subscriptionId, entitlements };
  }

  if (eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
    await upsertSubscription(admin, canonical, userId, "EXPIRED");
    const entitlements = await recomputeProfileEntitlements(
      admin,
      userId,
      "expired",
    );
    return { userId, action: "expired", subscriptionId, entitlements };
  }

  if (
    eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
    eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" ||
    eventType === "PAYMENT.SALE.DENIED" ||
    eventType === "PAYMENT.SALE.REVERSED" ||
    eventType === "PAYMENT.SALE.REFUNDED"
  ) {
    await upsertSubscription(admin, canonical, userId, "PAST_DUE");
    const entitlements = await recomputeProfileEntitlements(
      admin,
      userId,
      "past_due",
    );
    return { userId, action: "past_due", subscriptionId, entitlements };
  }

  await upsertSubscription(admin, canonical, userId, status || "IGNORED");
  return { userId, action: "ignored", subscriptionId, status };
}

export async function handlePayPalWebhookRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let event: JsonObject;

  try {
    event = await req.json();
  } catch (_) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const eventId = getPayPalEventId(event);
  if (!eventId) {
    return jsonResponse({ error: "PayPal webhook event ID is required" }, 400);
  }

  let admin: any = null;

  try {
    const verified = await verifyPayPalWebhook(req, event);

    if (!verified) {
      return jsonResponse(
        { error: "PayPal webhook signature verification failed" },
        401,
      );
    }

    admin = getSupabaseAdmin();
    const saved = await reserveEvent(admin, event);

    if (saved.alreadyProcessed) {
      return jsonResponse({
        ok: true,
        duplicate: true,
        event_id: eventId,
      });
    }

    const eventType = String(event.event_type ?? "UNKNOWN");

    if (!isHandledPayPalEventType(eventType)) {
      await markEvent(admin, eventId, true);
      return jsonResponse({
        ok: true,
        ignored: true,
        event_id: eventId,
        event_type: eventType,
      });
    }

    const resource = event.resource ?? {};
    const result = await handleSubscriptionEvent(admin, eventType, resource);

    await markEvent(admin, eventId, true);

    return jsonResponse({
      ok: true,
      event_id: eventId,
      event_type: eventType,
      retried: saved.retryingFailedEvent,
      result,
    });
  } catch (error) {
    const message = (
      error instanceof Error ? error.message : String(error)
    ).slice(0, 2_000);

    if (admin) {
      try {
        await markEvent(admin, eventId, false, message);
      } catch (markError) {
        console.error(
          "PayPal webhook event status update failed:",
          markError instanceof Error ? markError.message : String(markError),
        );
      }
    }

    console.error("PayPal webhook error:", message);

    return jsonResponse(
      {
        ok: false,
        error: "Webhook processing failed",
        event_id: eventId,
      },
      500,
    );
  }
}

if (import.meta.main) {
  Deno.serve(handlePayPalWebhookRequest);
}
