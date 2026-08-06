export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = String(env.ALLOWED_ORIGIN || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);
    const allowed = allowedOrigins.includes("*") || allowedOrigins.includes(origin);
    const corsHeaders = {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": allowed ? (origin || "*") : "null",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: allowed ? 204 : 403, headers: corsHeaders });
    }
    if (request.method !== "POST" || !allowed) {
      return json({ error: "Não autorizado" }, 403, corsHeaders);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "GEMINI_API_KEY não configurada" }, 500, corsHeaders);
    }

    try {
      const body = await request.json();
      const parts = [{
        text: [
          "Extraia uma lista de materiais para orçamento.",
          "Preserve todos os itens, mesmo incompletos ou não reconhecidos.",
          "Não escolha produtos e não invente SKU, preço, estoque, marca ou especificação.",
          "Identifique quantidade, unidade e descrição quando existirem.",
          "Use UN quando a unidade não estiver clara.",
          "Texto do cliente:",
          String(body.text || "")
        ].join("\n")
      }];

      for (const attachment of (body.attachments || []).slice(0, 5)) {
        if (!attachment?.data || !attachment?.mimeType) continue;
        if (attachment.data.length > 11_500_000) continue;
        if (attachment.mimeType === "application/pdf" || attachment.mimeType.startsWith("image/")) {
          parts.push({
            inline_data: {
              mime_type: attachment.mimeType,
              data: attachment.data
            }
          });
        }
      }

      const responseSchema = {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                qty: { type: "number" },
                unit: { type: "string" },
                description: { type: "string" },
                original: { type: "string" }
              },
              required: ["qty", "unit", "description", "original"]
            }
          }
        },
        required: ["items"]
      };

      const model = env.GEMINI_MODEL || "gemini-3.5-flash";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema,
              temperature: 0.1
            }
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return json({ error: "Falha no Gemini", details: data }, 502, corsHeaders);
      }

      const output = data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "{}";
      return json(JSON.parse(output), 200, corsHeaders);
    } catch (error) {
      return json({ error: "Falha ao processar", details: String(error?.message || error) }, 500, corsHeaders);
    }
  }
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}
