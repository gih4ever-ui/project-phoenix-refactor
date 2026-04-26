// Edge function: parse-invoice-image
// Receives an invoice image (base64 data URL) and extracts structured data
// via the Lovable AI Gateway (Gemini vision). Also accepts a catalog of the
// user's materials/extras/suppliers to attempt fuzzy matching server-side.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CatalogItem {
  id: number | string;
  name: string;
}

interface RequestBody {
  imageDataUrl: string; // data:image/...;base64,XXXX
  materials?: CatalogItem[];
  extras?: CatalogItem[];
  suppliers?: CatalogItem[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as RequestBody;
    if (!body?.imageDataUrl || !body.imageDataUrl.startsWith("data:")) {
      return new Response(
        JSON.stringify({ error: "imageDataUrl inválido (esperado data URL base64)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const materials = body.materials ?? [];
    const extras = body.extras ?? [];
    const suppliers = body.suppliers ?? [];

    const catalogText = `
CATÁLOGO DO USUÁRIO (use para sugerir matches por similaridade de nome; se nada bater bem, retorne null no matchedId):

FORNECEDORES CADASTRADOS:
${suppliers.map((s) => `- id=${s.id}: "${s.name}"`).join("\n") || "(nenhum)"}

MATERIAIS CADASTRADOS:
${materials.map((m) => `- id=${m.id}: "${m.name}"`).join("\n") || "(nenhum)"}

EXTRAS CADASTRADOS (embalagens, etiquetas, etc):
${extras.map((e) => `- id=${e.id}: "${e.name}"`).join("\n") || "(nenhum)"}
`;

    const systemPrompt = `Você é um assistente especializado em extrair dados de notas fiscais e cupons fiscais brasileiros a partir de imagens.
Sua tarefa é ler a imagem fornecida, identificar os dados da nota e retornar um JSON estruturado.

${catalogText}

REGRAS:
1. Extraia o nome do fornecedor/emitente da nota. Tente casar com um fornecedor cadastrado pelo nome (busca aproximada, ignore "LTDA", "ME", acentos, caixa). Se casar, retorne supplierMatchedId; caso contrário null.
2. Extraia a data da compra no formato YYYY-MM-DD. Se não encontrar, use a data de hoje.
3. Para CADA item da nota, extraia: descrição original (text), quantidade, valor unitário e valor total.
4. Para cada item, sugira o tipo: "material" (matéria-prima, tecido, fio, etc), "extra" (embalagem, etiqueta, sacola) ou "other" (qualquer coisa que não bata claramente).
5. Para cada item do tipo material/extra, tente casar com um item do catálogo do usuário pelo nome (similaridade) e retorne matchedId. Se a similaridade for baixa, retorne null e mantenha o tipo como "other".
6. Extraia desconto total se houver, separando se é em valor (R$) ou percentual (%).
7. Use ponto como separador decimal nos números. Não retorne strings nos campos numéricos.
8. NÃO invente dados — se um campo não estiver legível, retorne null.`;

    const aiPayload = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia os dados desta nota fiscal." },
            { type: "image_url", image_url: { url: body.imageDataUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_invoice",
            description: "Retorna os dados estruturados da nota fiscal extraídos da imagem.",
            parameters: {
              type: "object",
              properties: {
                supplierName: { type: ["string", "null"], description: "Nome do fornecedor lido na nota" },
                supplierMatchedId: {
                  type: ["string", "number", "null"],
                  description: "ID do fornecedor cadastrado que melhor casa, ou null",
                },
                date: { type: ["string", "null"], description: "Data da compra YYYY-MM-DD" },
                discount: { type: ["number", "null"], description: "Valor do desconto" },
                discountType: { type: ["string", "null"], enum: ["value", "percent", null] },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string", description: "Descrição original do item na nota" },
                      qty: { type: "number" },
                      unitPrice: { type: "number" },
                      totalPrice: { type: ["number", "null"] },
                      suggestedType: {
                        type: "string",
                        enum: ["material", "extra", "other"],
                      },
                      matchedId: {
                        type: ["string", "number", "null"],
                        description: "ID do material/extra do catálogo que melhor casa, ou null",
                      },
                    },
                    required: ["description", "qty", "unitPrice", "suggestedType"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_invoice" } },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiPayload),
    });

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({
          error: "Créditos do Lovable AI esgotados. Adicione créditos em Settings > Workspace > Usage.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI Gateway error:", aiResp.status, errText);
      return new Response(
        JSON.stringify({ error: "Falha ao processar imagem na IA", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("Resposta sem tool_call:", JSON.stringify(aiJson).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "IA não retornou dados estruturados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("JSON inválido:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "Formato JSON inválido retornado pela IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ data: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-invoice-image error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
