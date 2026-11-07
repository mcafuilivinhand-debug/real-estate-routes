const corsHeaders = {
  "Access-Control-Allow-Origin": "https://mcafuilivinhand-debug.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AssetRequest = {
  requestId: string;
  ownerName: string;
  ownerPhone: string;
  kind: string;
  category: string;
  assetTitle: string;
  location: string;
  expectedPrice: string;
  details: string;
  photoUrls?: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const origin = req.headers.get("origin");
  if (origin && origin !== "https://mcafuilivinhand-debug.github.io") {
    return Response.json({ error: "Origin not allowed" }, { status: 403, headers: corsHeaders });
  }

  let payload: AssetRequest;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400, headers: corsHeaders });
  }

  const required = ["requestId", "ownerName", "ownerPhone", "kind", "category", "assetTitle", "location", "details"] as const;
  if (required.some((key) => typeof payload[key] !== "string" || !payload[key].trim())) {
    return Response.json({ error: "Missing required asset request details" }, { status: 400, headers: corsHeaders });
  }

  const brokerEmail = "mcafuilivinhand@gmail.com";
  const brokerWhatsApp = "233557873406";
  const summary = [
    "APEXANCHOR — NEW ASSET REQUEST",
    `Reference: ${payload.requestId}`,
    `Owner: ${payload.ownerName}`,
    `Phone / WhatsApp: ${payload.ownerPhone}`,
    `Request: ${payload.kind}`,
    `Category: ${payload.category}`,
    `Asset: ${payload.assetTitle}`,
    `Location: ${payload.location}`,
    `Expected price: ${payload.expectedPrice || "Not specified"}`,
    "",
    "Details:",
    payload.details,
    ...(payload.photoUrls?.length ? ["", "Photos:", ...payload.photoUrls] : []),
  ].join("\n");

  const errors: string[] = [];
  let emailSent = false;
  let whatsappSent = false;

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendKey || !fromEmail) {
    errors.push("Email needs RESEND_API_KEY and RESEND_FROM_EMAIL secrets.");
  } else {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [brokerEmail],
          subject: `ApexAnchor asset request: ${payload.assetTitle}`,
          text: summary,
        }),
      });
      if (!response.ok) {
        errors.push(`Email provider returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
      } else {
        emailSent = true;
      }
    } catch (error) {
      errors.push(`Email delivery failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  const waToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const waPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const waTemplate = Deno.env.get("WHATSAPP_TEMPLATE_NAME");
  const waLanguage = Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE") || "en";
  if (!waToken || !waPhoneId || !waTemplate) {
    errors.push("WhatsApp needs WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and an approved WHATSAPP_TEMPLATE_NAME.");
  } else {
    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${waToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: brokerWhatsApp,
          type: "template",
          template: {
            name: waTemplate,
            language: { code: waLanguage },
            components: [{
              type: "body",
              parameters: [{ type: "text", text: summary.slice(0, 1024) }],
            }],
          },
        }),
      });
      if (!response.ok) {
        errors.push(`WhatsApp provider returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
      } else {
        whatsappSent = true;
      }
    } catch (error) {
      errors.push(`WhatsApp delivery failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return Response.json({ emailSent, whatsappSent, errors }, {
    status: 200,
    headers: corsHeaders,
  });
});
