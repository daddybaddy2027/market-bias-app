import {
  fetchPayPalSubscription,
  getPayPalEnvironment,
} from "../supabase/functions/paypal-webhook/index.ts";

type JsonObject = Record<string, any>;

export function maskEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const [local, domain] = value.trim().split("@");
  if (!local || !domain) return "invalid";

  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${
    "*".repeat(Math.max(2, local.length - visible.length))
  }@${domain}`;
}

export function buildSubscriptionDebugSummary(resource: JsonObject) {
  return {
    id: resource?.id ?? null,
    status: resource?.status ?? null,
    plan_id: resource?.plan_id ?? null,
    custom_id: resource?.custom_id ?? null,
    subscriber_email: maskEmail(resource?.subscriber?.email_address),
    payer_id: resource?.subscriber?.payer_id ?? resource?.payer?.payer_id ??
      null,
    start_time: resource?.start_time ?? null,
    next_billing_time: resource?.billing_info?.next_billing_time ?? null,
    last_payment_time: resource?.billing_info?.last_payment?.time ?? null,
    failed_payments_count: resource?.billing_info?.failed_payments_count ??
      null,
    status_update_time: resource?.status_update_time ?? null,
  };
}

function requireSubscriptionId(value: string | undefined) {
  const subscriptionId = value?.trim() ?? "";

  if (!/^I-[A-Z0-9-]+$/i.test(subscriptionId)) {
    throw new Error(
      "Pass one PayPal subscription ID (for example I-XXXXXXXX) as the only argument.",
    );
  }

  return subscriptionId;
}

async function main() {
  const subscriptionId = requireSubscriptionId(Deno.args[0]);
  const environment = getPayPalEnvironment();
  const resource = await fetchPayPalSubscription(subscriptionId);

  console.log(
    JSON.stringify(
      {
        environment,
        read_only: true,
        subscription: buildSubscriptionDebugSummary(resource),
      },
      null,
      2,
    ),
  );
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "PayPal subscription lookup failed.",
    );
    Deno.exit(1);
  }
}
