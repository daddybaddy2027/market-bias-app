// ============================================================
// AI MARKET EXPERT - PayPal subscription webhook
// Supabase Edge Function / Deno
//
// What it does:
// - Receives PayPal webhook events
// - Verifies PayPal webhook signature through PayPal API
// - Uses subscription custom_id = Supabase auth user.id
// - Automatically activates / downgrades Pro access in public.profiles
//
// Deploy with verify_jwt=false because PayPal will not send Supabase JWT.
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type PayPalEnv = "sandbox" | "live";

type JsonObject = Record<string, any>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paypal-auth-algo, paypal-cert-url, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time",
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
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getPayPalBaseUrl() {
  const env = (Deno.env.get("PAYPAL_ENV") ?? "live").toLowerCase() as PayPalEnv;
  return env === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

function getSupabaseAdmin() {
  const url = requiredEnv("SUPABASE_URL");

  // New Supabase projects expose SUPABASE_SECRET_KEYS as JSON.
  // Older projects expose SUPABASE_SERVICE_ROLE_KEY directly.
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  let key = serviceRoleKey;

  if (!key && secretKeysJson) {
    try {
      const parsed = JSON.parse(secretKeysJson);
      key = parsed.default ?? Object.values(parsed)[0];
    } catch (_) {
      // ignored, handled below
    }
  }

  if (!key || typeof key !== "string") {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEYS.default");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getPayPalAccessToken() {
  const clientId = requiredEnv("PAYPAL_CLIENT_ID");
  const clientSecret = requiredEnv("PAYPAL_CLIENT_SECRET");
  const baseUrl = getPayPalBaseUrl();

  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`PayPal OAuth failed: ${response.status} ${JSON.stringify(data)}`);
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
    if (!value) {
      throw new Error(`Missing PayPal verification field: ${key}`);
    }
  }

  const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`PayPal webhook verification request failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data.verification_status === "SUCCESS";
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function safeIso(value: unknown): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function estimateExpiry(resource: JsonObject, fallbackDays = 32) {
  return (
    safeIso(resource?.billing_info?.next_billing_time) ??
    safeIso(resource?.billing_info?.last_payment?.time) ??
    addDays(new Date(), fallbackDays).toISOString()
  );
}

function looksLikeUuid(value: unknown) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

async function resolveUserId(admin: any, resource: JsonObject) {
  const customId = resource?.custom_id;

  if (looksLikeUuid(customId)) {
    return customId as string;
  }

  const email = resource?.subscriber?.email_address ?? resource?.payer?.email_address ?? null;

  if (email) {
    const { data, error } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("email", String(email))
      .maybeSingle();

    if (!error && data?.user_id) {
      return data.user_id as string;
    }
  }

  return null;
}

async function saveEvent(admin: any, event: JsonObject) {
  const eventId = String(event.id ?? crypto.randomUUID());
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
    // Duplicate event = PayPal retry. Treat as already handled.
    if (error.code === "23505") {
      return { eventId, duplicate: true };
    }

    throw error;
  }

  return { eventId, duplicate: false };
}

async function markEvent(admin: any, eventId: string, processed: boolean, processingError?: string) {
  await admin
    .from("paypal_webhook_events")
    .update({
      processed,
      processing_error: processingError ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
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

async function upsertSubscription(admin: any, resource: JsonObject, userId: string | null, statusOverride?: string) {
  const subscriptionId = getSubscriptionIdFromResource(resource);
  if (!subscriptionId) {
    return null;
  }

  const email = resource?.subscriber?.email_address ?? resource?.payer?.email_address ?? null;
  const payerId = resource?.subscriber?.payer_id ?? resource?.payer?.payer_id ?? null;
  const planId = resource?.plan_id ?? null;
  const status = statusOverride ?? resource?.status ?? "unknown";
  const nextBillingTime = safeIso(resource?.billing_info?.next_billing_time);
  const lastPaymentTime = safeIso(resource?.billing_info?.last_payment?.time);

  const { error } = await admin
    .from("paypal_subscriptions")
    .upsert(
      {
        paypal_subscription_id: String(subscriptionId),
        user_id: userId,
        email,
        status,
        plan_id: planId,
        payer_id: payerId,
        next_billing_time: nextBillingTime,
        last_payment_time: lastPaymentTime,
        raw: resource,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paypal_subscription_id" },
    );

  if (error) {
    throw error;
  }

  return String(subscriptionId);
}

async function activateProfile(admin: any, userId: string, resource: JsonObject) {
  const subscriptionId = getSubscriptionIdFromResource(resource);
  const expiry = estimateExpiry(resource, 32);

  const { error } = await admin
    .from("profiles")
    .update({
      plan: "pro",
      subscription_status: "active",
      subscription_provider: "paypal",
      provider_customer_id: resource?.subscriber?.payer_id ?? resource?.payer?.payer_id ?? null,
      provider_subscription_id: subscriptionId,
      paypal_plan_id: resource?.plan_id ?? null,
      subscription_started_at: resource?.start_time ? safeIso(resource.start_time) : undefined,
      subscription_expires_at: expiry,
      subscription_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function downgradeProfile(admin: any, userId: string, status: "cancelled" | "expired" | "past_due") {
  const { error } = await admin
    .from("profiles")
    .update({
      plan: "free",
      subscription_status: status,
      subscription_expires_at: new Date().toISOString(),
      subscription_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function handleSubscriptionEvent(admin: any, eventType: string, resource: JsonObject) {
  let userId = await resolveUserId(admin, resource);
  const subscriptionId = getSubscriptionIdFromResource(resource);

  // If renewal/cancel webhook lacks custom_id, recover user from stored subscription record.
  if (!userId && subscriptionId) {
    const { data } = await admin
      .from("paypal_subscriptions")
      .select("user_id")
      .eq("paypal_subscription_id", String(subscriptionId))
      .maybeSingle();

    userId = data?.user_id ?? null;
  }

  if (!userId) {
    throw new Error("Could not resolve Supabase user_id from PayPal custom_id/email/subscription record.");
  }

  if (
    eventType === "BILLING.SUBSCRIPTION.ACTIVATED" ||
    eventType === "BILLING.SUBSCRIPTION.CREATED" ||
    eventType === "BILLING.SUBSCRIPTION.UPDATED"
  ) {
    await upsertSubscription(admin, resource, userId, resource?.status ?? "ACTIVE");

    if (String(resource?.status ?? "").toUpperCase() !== "CANCELLED") {
      await activateProfile(admin, userId, resource);
    }

    return { userId, action: "activated", subscriptionId };
  }

  if (eventType === "PAYMENT.SALE.COMPLETED") {
    await upsertSubscription(admin, resource, userId, "ACTIVE");
    await activateProfile(admin, userId, resource);
    return { userId, action: "payment_completed", subscriptionId };
  }

  if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
    await upsertSubscription(admin, resource, userId, "CANCELLED");
    await downgradeProfile(admin, userId, "cancelled");
    return { userId, action: "cancelled", subscriptionId };
  }

  if (eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
    await upsertSubscription(admin, resource, userId, "EXPIRED");
    await downgradeProfile(admin, userId, "expired");
    return { userId, action: "expired", subscriptionId };
  }

  if (
    eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
    eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" ||
    eventType === "PAYMENT.SALE.DENIED" ||
    eventType === "PAYMENT.SALE.REVERSED" ||
    eventType === "PAYMENT.SALE.REFUNDED"
  ) {
    await upsertSubscription(admin, resource, userId, "PAST_DUE");
    await downgradeProfile(admin, userId, "past_due");
    return { userId, action: "past_due", subscriptionId };
  }

  return { userId, action: "ignored", subscriptionId };
}

serve(async (req: Request) => {
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

  const admin = getSupabaseAdmin();
  let eventId = String(event.id ?? crypto.randomUUID());

  try {
    const verified = await verifyPayPalWebhook(req, event);

    if (!verified) {
      return jsonResponse({ error: "PayPal webhook signature verification failed" }, 401);
    }

    const saved = await saveEvent(admin, event);
    eventId = saved.eventId;

    if (saved.duplicate) {
      return jsonResponse({ ok: true, duplicate: true, event_id: eventId });
    }

    const eventType = String(event.event_type ?? "UNKNOWN");
    const resource = event.resource ?? {};

    const result = await handleSubscriptionEvent(admin, eventType, resource);

    await markEvent(admin, eventId, true);

    return jsonResponse({
      ok: true,
      event_id: eventId,
      event_type: eventType,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      await markEvent(admin, eventId, false, message);
    } catch (_) {
      // ignore event update failure
    }

    console.error("PayPal webhook error:", message);

    return jsonResponse({
      ok: false,
      error: message,
    }, 500);
  }
});
