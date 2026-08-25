const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const LIVE_PLANS = {
  models: "P-92W44013XU174414BNJXCG5Y",
  outlook: "P-24809402WE5679705NJXCG6A",
  complete: "P-7V480941TT869584MNJXCG6A",
} as const;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const environment = String(Deno.env.get("PAYPAL_ENV") ?? "").trim().toLowerCase();
  const clientId = String(Deno.env.get("PAYPAL_CLIENT_ID") ?? "").trim();

  if (environment !== "live" || !clientId) {
    return jsonResponse(
      {
        configured: false,
        error: "PayPal live checkout is not configured.",
      },
      503,
    );
  }

  // Client IDs and billing plan IDs are public checkout identifiers.
  // Secrets and webhook IDs are never returned from this endpoint.
  return jsonResponse({
    configured: true,
    environment: "live",
    clientId,
    plans: LIVE_PLANS,
  });
});
