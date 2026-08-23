export default async function handler(req, res) {
  try {
    const upstream = await fetch('https://xovpvbinuvflsygpwgxt.supabase.co/functions/v1/paypal-config-health');
    const text = await upstream.text();
    res.status(upstream.status).setHeader('content-type','application/json; charset=utf-8').send(text);
  } catch (error) {
    res.status(500).json({ ok:false, error:String(error?.message ?? error) });
  }
}
