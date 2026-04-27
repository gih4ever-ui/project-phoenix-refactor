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

interface SupplierItem extends CatalogItem {
  aliases?: string[];
}

interface RequestBody {
  imageDataUrl: string; // data:image/...;base64,XXXX
  materials?: CatalogItem[];
  extras?: CatalogItem[];
  suppliers?: SupplierItem[];
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

    const formatSupplier = (s: SupplierItem) => {
      const aliases = (s.aliases || []).filter(Boolean);
      const aliasPart = aliases.length > 0 ? ` (também aparece como: ${aliases.map(a => `"${a}"`).join(", ")})` : "";
      return `- id=${s.id}: "${s.name}"${aliasPart}`;
    };

    const catalogText = `
CATÁLOGO DO USUÁRIO (use para sugerir matches por similaridade de nome; se nada bater bem, retorne string vazia no matchedId):

FORNECEDORES CADASTRADOS:
${suppliers.map(formatSupplier).join("\n") || "(nenhum)"}

MATERIAIS CADASTRADOS:
${materials.map((m) => `- id=${m.id}: "${m.name}"`).join("\n") || "(nenhum)"}

EXTRAS CADASTRADOS (embalagens, etiquetas, etc):
${extras.map((e) => `- id=${e.id}: "${e.name}"`).join("\n") || "(nenhum)"}
`;

    const systemPrompt = `Você é um assistente especializado em extrair dados de notas fiscais e cupons fiscais brasileiros a parto de imagens.
Sua tarefa é ler a imagem fornecida, identificar os dados da nota e retornar um JSON estruturado.

${catalogText}

REGRAS:
1. Extraia o nome do fornecedor/emitente da nota. Tente casar com um fornecedor cadastrado pelo nome OU pelos apelidos listados (busca aproximada, ignore "LTDA", "ME", acentos, caixa). Se casar, retorne supplierMatchedId; caso contrário string vazia.
2. Extraia a data da compra no formato YYYY-MM-DD. Se não encontrar, use string vazia.
3. Para CADA item da nota, extraia: descrição original (text), quantidade, valor unitário e valor total.
4. Para cada item, sugira o tipo: "material" (matéria-prima, tecido, fio, etc), "extra" (embalagem, etiqueta, sacola) ou "other" (qualquer coisa que não bata claramente, inclusive itens pessoais como bebidas, comida, doces).
5. Para cada item do tipo material/extra, tente casar com um item do catálogo do usuário pelo nome (similaridade) e retorne matchedId. Se a similaridade for baixa, retorne string vazia e mantenha o tipo como "other".
6. Extraia desconto total se houver, separando se é em valor (R$) ou percentual (%). Use "none" se não houver.
7. Use ponto como separador decimal nos números. Não retorne strings nos campos numéricos.
8. NÃO invente dados — se um campo não estiver legível, retorne string vazia (campos texto) ou 0 (numéricos).`;

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
                supplierName: { type: "string", description: "Nome do fornecedor lido na nota, ou string vazia se não identificado" },
                supplierMatchedId: {
                  type: "string",
                  description: "ID do fornecedor cadastrado que melhor casa (como string), ou string vazia se nenhum casar",
                },
                date: { type: "string", description: "Data da compra YYYY-MM-DD, ou string vazia se não identificada" },
                discount: { type: "number", description: "Valor do desconto (0 se não houver)" },
                discountType: { type: "string", enum: ["value", "percent", "none"], description: "Tipo de desconto. Use 'none' se não houver desconto." },
                items: {
                  type: "array",
                  description: "Lista de itens da nota fiscal",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string", description: "Descrição original do item na nota" },
                      qty: { type: "number", description: "Quantidade" },
                      unitPrice: { type: "number", description: "Valor unitário" },
                      totalPrice: { type: "number", description: "Valor total da linha (qty * unitPrice)" },
                      suggestedType: {
                        type: "string",
                        enum: ["material", "extra", "other"],
                        description: "Tipo sugerido",
                      },
                      matchedId: {
                        type: "string",
                        description: "ID do material/extra do catálogo que melhor casa (como string), ou string vazia se nenhum casar",
                      },
                    },
                    required: ["description", "qty", "unitPrice", "totalPrice", "suggestedType", "matchedId"],
                  },
                },
              },
              required: ["supplierName", "supplierMatchedId", "date", "discount", "discountType", "items"],
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
