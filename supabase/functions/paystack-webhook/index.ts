import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return new Response("Payment provider is not configured", { status: 500 });
    const raw = await req.text();
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
    const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
    const signature = req.headers.get("x-paystack-signature") || "";
    if (!safeEqual(expected, signature)) return new Response("Invalid signature", { status: 401 });

    const event = JSON.parse(raw);
    if (event.event !== "charge.success" || !event.data?.reference) return new Response("Event ignored", { status: 200 });
    const reference = String(event.data.reference);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: payment, error } = await admin.from("payments").select("id, amount, currency, status").eq("reference", reference).maybeSingle();
    if (error || !payment) return new Response("Payment reference not found", { status: 404 });
    if (payment.status === "success") return new Response("Already processed", { status: 200 });

    // Verify directly with Paystack as well as validating its signed webhook.
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const verified = await verifyResponse.json().catch(() => ({}));
    const tx = verified.data;
    const expectedMinor = Math.round(Number(payment.amount) * 100);
    if (!verifyResponse.ok || !verified.status || tx?.status !== "success"
      || tx?.reference !== reference || Number(tx?.amount) !== expectedMinor
      || String(tx?.currency).toUpperCase() !== String(payment.currency).toUpperCase()) {
      return new Response("Payment verification failed", { status: 400 });
    }

    const { error: updateError } = await admin.from("payments").update({
      status: "success",
      channel: typeof tx.channel === "string" ? tx.channel : null,
      gateway_response: tx,
      paid_at: tx.paid_at || new Date().toISOString(),
    }).eq("reference", reference).neq("status", "success");
    if (updateError) return new Response("Could not record payment", { status: 500 });
    return new Response("Payment verified", { status: 200 });
  } catch {
    return new Response("Webhook processing error", { status: 500 });
  }
});
