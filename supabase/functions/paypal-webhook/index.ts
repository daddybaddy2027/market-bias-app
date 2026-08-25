// ============================================================
// AI MARKET EXPERT - PayPal subscription webhook
// Security contract:
// - PayPal signature is verified server-side before any mutation.
// - Browser approval alone never grants access.
// - Live plan IDs are canonical public identifiers shared with checkout.
// - Sandbox plan IDs remain environment-driven and isolated.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

type JsonObject = Record<string, any>;
type PayPalEnv = "sandbox" | "live";
type Product = "models" | "outlook" | "complete";
type Entitlements = { product: Product; modelsAccess: boolean; outlookAccess: boolean };
type FallbackStatus = "cancelled" | "expired" | "past_due";

export const LIVE_PAYPAL_PLANS: Record<Product, string> = {
  models: "P-92W44013XU174414BNJXCG5Y",
  outlook: "P-24809402WE5679705NJXCG6A",
  complete: "P-7V480941TT869584MNJXCG6A",
};

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, paypal-auth-algo, paypal-cert-url, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: JsonObject, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optionalEnv(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

export function getPayPalEnvironment(): PayPalEnv {
  const value = String(Deno.env.get("PAYPAL_ENV") ?? "").trim().toLowerCase();
  if (value !== "sandbox" && value !== "live") {
    throw new Error("PAYPAL_ENV must be explicitly set to sandbox or live.");
  }
  return value;
}

function paypalBaseUrl() {
  return getPayPalEnvironment() === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

function getSupabaseAdmin() {
  const url = requiredEnv("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  let key = serviceRole;

  if (!key && secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      key = parsed.default ?? Object.values(parsed)[0];
    } catch {
      // handled below
    }
  }

  if (!key || typeof key !== "string") {
    throw new Error("Missing Supabase service-role credentials.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function paypalJson(url: string, init: RequestInit, operation: string) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const name = typeof data?.name === "string" ? data.name : "PAYPAL_ERROR";
    const message = typeof data?.message === "string" ? data.message : "Request failed";
    throw new Error(`${operation} failed: HTTP ${response.status} ${name}: ${message}`);
  }
  return data as JsonObject;
}

async function getAccessToken() {
  const clientId = requiredEnv("PAYPAL_CLIENT_ID");
  const clientSecret = requiredEnv("PAYPAL_CLIENT_SECRET");
  const auth = btoa(`${clientId}:${clientSecret}`);
  const data = await paypalJson(
    `${paypalBaseUrl()}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    },
    "PayPal OAuth",
  );
  if (!data.access_token) throw new Error("PayPal OAuth returned no access token.");
  return String(data.access_token);
}

async function verifyWebhook(req: Request, event: JsonObject) {
  const accessToken = await getAccessToken();
  const payload = {
    transmission_id: req.headers.get("paypal-transmission-id"),
    transmission_time: req.headers.get("paypal-transmission-time"),
    cert_url: req.headers.get("paypal-cert-url"),
    auth_algo: req.headers.get("paypal-auth-algo"),
    transmission_sig: req.headers.get("paypal-transmission-sig"),
    webhook_id: requiredEnv("PAYPAL_WEBHOOK_ID"),
    webhook_event: event,
  };

  for (const [key, value] of Object.entries(payload)) {
    if (!value) throw new Error(`Missing PayPal verification field: ${key}`);
  }

  const data = await paypalJson(
    `${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "PayPal webhook verification",
  );

  return data.verification_status === "SUCCESS";
}

function planMap(): Record<Product, string | null> {
  if (getPayPalEnvironment() === "live") return LIVE_PAYPAL_PLANS;
  return {
    models: optionalEnv("PAYPAL_MODELS_PLAN_ID", "PAYPAL_PRO_MONTHLY_PLAN_ID"),
    outlook: optionalEnv("PAYPAL_OUTLOOK_PLAN_ID"),
    complete: optionalEnv("PAYPAL_COMPLETE_PLAN_ID"),
  };
}

export function entitlementsForPlan(planId: unknown): Entitlements {
  const normalized = String(planId ?? "").trim();
  const plans = planMap();

  if (plans.models && normalized === plans.models) {
    return { product: "models", modelsAccess: true, outlookAccess: false };
  }
  if (plans.outlook && normalized === plans.outlook) {
    return { product: "outlook", modelsAccess: false, outlookAccess: true };
  }
  if (plans.complete && normalized === plans.complete) {
    return { product: "complete", modelsAccess: true, outlookAccess: true };
  }
  throw new Error(`PayPal plan is not mapped to an entitlement: ${normalized || "missing plan_id"}`);
}

function subscriptionId(resource: JsonObject) {
  return resource?.id ?? resource?.billing_agreement_id ?? resource?.subscription_id ??
    resource?.supplementary_data?.related_ids?.billing_agreement_id ?? null;
}

function safeIso(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function looksLikeUuid(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function fetchSubscription(id: string) {
  const token = await getAccessToken();
  return await paypalJson(
    `${paypalBaseUrl()}/v1/billing/subscriptions/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
    "PayPal subscription lookup",
  );
}

async function canonicalResource(resource: JsonObject) {
  if (resource?.plan_id && resource?.id && String(resource.id).startsWith("I-")) return resource;
  const id = subscriptionId(resource);
  if (!id) throw new Error("Could not resolve PayPal subscription ID from event resource.");
  return await fetchSubscription(String(id));
}

async function resolveUserId(admin: any, resource: JsonObject) {
  if (looksLikeUuid(resource?.custom_id)) return String(resource.custom_id);

  const id = subscriptionId(resource);
  if (id) {
    const { data } = await admin.from("paypal_subscriptions")
      .select("user_id").eq("paypal_subscription_id", String(id)).maybeSingle();
    if (data?.user_id) return String(data.user_id);
  }

  const email = resource?.subscriber?.email_address ?? resource?.payer?.email_address;
  if (email) {
    const { data } = await admin.from("profiles")
      .select("user_id").ilike("email", String(email)).maybeSingle();
    if (data?.user_id) return String(data.user_id);
  }
  return null;
}

async function upsertSubscription(admin: any, resource: JsonObject, userId: string, statusOverride?: string) {
  const id = subscriptionId(resource);
  if (!id) throw new Error("Missing subscription ID during upsert.");
  const { error } = await admin.from("paypal_subscriptions").upsert({
    paypal_subscription_id: String(id),
    user_id: userId,
    email: resource?.subscriber?.email_address ?? resource?.payer?.email_address ?? null,
    status: statusOverride ?? resource?.status ?? "UNKNOWN",
    plan_id: resource?.plan_id ?? null,
    payer_id: resource?.subscriber?.payer_id ?? resource?.payer?.payer_id ?? null,
    next_billing_time: safeIso(resource?.billing_info?.next_billing_time),
    last_payment_time: safeIso(resource?.billing_info?.last_payment?.time),
    raw: resource,
    updated_at: new Date().toISOString(),
  }, { onConflict: "paypal_subscription_id" });
  if (error) throw error;
}

async function recomputeEntitlements(admin: any, userId: string, fallback: FallbackStatus = "cancelled") {
  const { data, error } = await admin.from("paypal_subscriptions")
    .select("paypal_subscription_id,status,plan_id,payer_id,next_billing_time,updated_at")
    .eq("user_id", userId);
  if (error) throw error;

  const active = (data ?? []).filter((row: JsonObject) => String(row.status ?? "").toUpperCase() === "ACTIVE");
  let modelsAccess = false;
  let outlookAccess = false;

  for (const row of active) {
    const entitlement = entitlementsForPlan(row.plan_id);
    modelsAccess ||= entitlement.modelsAccess;
    outlookAccess ||= entitlement.outlookAccess;
  }

  if (!active.length) {
    const { error: profileError } = await admin.from("profiles").update({
      plan: "free",
      subscription_status: fallback,
      subscription_provider: "paypal",
      subscription_expires_at: new Date().toISOString(),
      subscription_updated_at: new Date().toISOString(),
      models_access: false,
      outlook_access: false,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    if (profileError) throw profileError;
    return { modelsAccess: false, outlookAccess: false, activeSubscriptions: 0 };
  }

  const representative = [...active].sort((a: JsonObject, b: JsonObject) =>
    String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))[0];
  const expiry = active.map((row: JsonObject) => safeIso(row.next_billing_time)).filter(Boolean).sort().at(-1) ??
    new Date(Date.now() + 32 * 86400_000).toISOString();

  const { error: profileError } = await admin.from("profiles").update({
    plan: "pro",
    subscription_status: "active",
    subscription_provider: "paypal",
    provider_customer_id: representative.payer_id ?? null,
    provider_subscription_id: representative.paypal_subscription_id ?? null,
    paypal_plan_id: active.length === 1 ? representative.plan_id ?? null : null,
    subscription_expires_at: expiry,
    subscription_updated_at: new Date().toISOString(),
    models_access: modelsAccess,
    outlook_access: outlookAccess,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  if (profileError) throw profileError;
  return { modelsAccess, outlookAccess, activeSubscriptions: active.length };
}

async function reserveEvent(admin: any, event: JsonObject) {
  const eventId = String(event?.id ?? "").trim();
  if (!eventId) throw new Error("PayPal webhook event ID is required.");

  const { error } = await admin.from("paypal_webhook_events").insert({
    event_id: eventId,
    event_type: String(event.event_type ?? "UNKNOWN"),
    resource_id: event?.resource?.id ?? null,
    paypal_subscription_id: subscriptionId(event?.resource ?? {}),
    payload: event,
  });

  if (!error) return { duplicate: false };
  if (error.code !== "23505") throw error;

  const { data, error: lookupError } = await admin.from("paypal_webhook_events")
    .select("processed").eq("event_id", eventId).maybeSingle();
  if (lookupError) throw lookupError;
  return { duplicate: data?.processed === true };
}

async function markEvent(admin: any, eventId: string, processed: boolean, processingError?: string) {
  const { error } = await admin.from("paypal_webhook_events").update({
    processed,
    processing_error: processingError ?? null,
    processed_at: new Date().toISOString(),
  }).eq("event_id", eventId);
  if (error) throw error;
}

async function processEvent(admin: any, eventType: string, eventResource: JsonObject) {
  const canonical = await canonicalResource(eventResource);
  const userId = await resolveUserId(admin, canonical) ?? await resolveUserId(admin, eventResource);
  if (!userId) throw new Error("Could not resolve Supabase user from PayPal subscription.");

  const status = String(canonical?.status ?? "").toUpperCase();

  if (eventType === "BILLING.SUBSCRIPTION.CREATED") {
    await upsertSubscription(admin, canonical, userId, status || "CREATED");
    return { action: "stored_without_access", userId };
  }

  if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" || eventType === "PAYMENT.SALE.COMPLETED") {
    await upsertSubscription(admin, canonical, userId, "ACTIVE");
    return { action: "activated", userId, entitlements: await recomputeEntitlements(admin, userId) };
  }

  if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" || status === "CANCELLED") {
    await upsertSubscription(admin, canonical, userId, "CANCELLED");
    return { action: "cancelled", userId, entitlements: await recomputeEntitlements(admin, userId, "cancelled") };
  }

  if (eventType === "BILLING.SUBSCRIPTION.EXPIRED" || status === "EXPIRED") {
    await upsertSubscription(admin, canonical, userId, "EXPIRED");
    return { action: "expired", userId, entitlements: await recomputeEntitlements(admin, userId, "expired") };
  }

  if (
    eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
    eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED" ||
    eventType === "PAYMENT.SALE.DENIED" ||
    eventType === "PAYMENT.SALE.REVERSED" ||
    eventType === "PAYMENT.SALE.REFUNDED" ||
    status === "SUSPENDED"
  ) {
    await upsertSubscription(admin, canonical, userId, "PAST_DUE");
    return { action: "past_due", userId, entitlements: await recomputeEntitlements(admin, userId, "past_due") };
  }

  await upsertSubscription(admin, canonical, userId, status || "UPDATED");
  if (status === "ACTIVE") {
    return { action: "updated_active", userId, entitlements: await recomputeEntitlements(admin, userId) };
  }
  return { action: "updated_no_entitlement_change", userId, status };
}

export async function handlePayPalWebhookRequest(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let event: JsonObject;
  try {
    event = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const eventId = String(event?.id ?? "").trim();
  if (!eventId) return jsonResponse({ error: "PayPal webhook event ID is required" }, 400);

  let admin: any = null;
  try {
    if (!(await verifyWebhook(req, event))) {
      return jsonResponse({ error: "PayPal webhook signature verification failed" }, 401);
    }

    admin = getSupabaseAdmin();
    const reserved = await reserveEvent(admin, event);
    if (reserved.duplicate) return jsonResponse({ ok: true, duplicate: true, event_id: eventId });

    const eventType = String(event.event_type ?? "UNKNOWN");
    if (!HANDLED_PAYPAL_EVENT_TYPES.has(eventType)) {
      await markEvent(admin, eventId, true);
      return jsonResponse({ ok: true, ignored: true, event_id: eventId, event_type: eventType });
    }

    const result = await processEvent(admin, eventType, event.resource ?? {});
    await markEvent(admin, eventId, true);
    return jsonResponse({ ok: true, event_id: eventId, event_type: eventType, result });
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 2000);
    if (admin) await markEvent(admin, eventId, false, message).catch(() => undefined);
    console.error("PayPal webhook error:", message);
    return jsonResponse({ ok: false, error: "Webhook processing failed", event_id: eventId }, 500);
  }
}

if (import.meta.main) Deno.serve(handlePayPalWebhookRequest);
