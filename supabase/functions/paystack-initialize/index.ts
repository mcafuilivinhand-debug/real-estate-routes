import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in to continue" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return json({ error: "Paystack is not configured yet" }, 500);

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user?.email) return json({ error: "A verified signed-in email is required" }, 401);

    const body = await req.json().catch(() => ({}));
    const dealId = typeof body.deal_id === "string" ? body.deal_id : "";
    if (!dealId) return json({ error: "Missing deal ID" }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: deal, error: dealError } = await admin
      .from("deals")
      .select("id, client_id, side, status, offer_amount, currency")
      .eq("id", dealId)
      .maybeSingle();
    if (dealError || !deal) return json({ error: "Deal not found" }, 404);
    if (deal.client_id !== user.id || deal.side !== "buy") return json({ error: "Only the buyer on this deal can pay" }, 403);
    if (deal.status !== "agreed") return json({ error: "ApexAnchor must agree the deal before payment" }, 409);
    const amount = Number(deal.offer_amount);
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: "The broker must set a valid agreed amount first" }, 409);
    const currency = String(deal.currency || "").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return json({ error: "The deal has an invalid currency" }, 409);
    const amountMinor = Math.round(amount * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || Math.abs(amountMinor / 100 - amount) > 0.000001) {
      return json({ error: "The agreed amount must have no more than two decimal places" }, 409);
    }

    const reference = `AA-${deal.id.slice(0, 8)}-${crypto.randomUUID().replaceAll("-", "")}`;
    const { error: insertError } = await admin.from("payments").insert({
      deal_id: deal.id, buyer_id: user.id, reference, amount, currency, status: "pending",
    });
    if (insertError) return json({ error: "Could not create payment record" }, 500);

    const channels = currency === "GHS" ? ["card", "mobile_money"] : ["card"];
    const callbackUrl = Deno.env.get("APEXANCHOR_SITE_URL") || "https://mcafuilivinhand-debug.github.io/real-estate-routes";
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount: amountMinor,
        currency,
        reference,
        callback_url: `${callbackUrl}/deals/${deal.id}?payment=return`,
        channels,
        metadata: { deal_id: deal.id, buyer_id: user.id, apexanchor_reference: reference },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.status || !result.data?.authorization_url) {
      await admin.from("payments").update({ status: "failed", gateway_response: result }).eq("reference", reference);
      return json({ error: result.message || "Paystack could not initialise this payment. Check the merchant currency and enabled channels." }, 502);
    }
    return json({ authorization_url: result.data.authorization_url, reference });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected payment error" }, 500);
  }
});
