## Cadastro de Notas Fiscais por Foto

### A boa notícia
Sim, **eu consigo analisar imagens diretamente** usando o Lovable AI (modelos Gemini 2.5), que faz OCR e leitura estruturada de notas fiscais sem precisar de API key extra. Não precisa passar por outra IA fora — você tira a foto da nota e o sistema lê tudo.

### Como vai funcionar

**Na tela "Compras" → ao criar uma nova nota fiscal:**

1. Botão novo: **"📷 Ler nota por foto"** (além do cadastro manual atual)
2. Você tira foto da nota fiscal (ou faz upload de imagem/PDF)
3. A IA extrai automaticamente:
   - **Fornecedor** (tenta casar com fornecedor já cadastrado pelo nome/CNPJ)
   - **Data** da compra
   - **Itens da nota**: descrição, quantidade, valor unitário, valor total
   - **Desconto** (se houver)
4. Tela de **revisão** aparece pré-preenchida — você confere e ajusta:
   - Para cada item lido, escolhe se é **Material**, **Extra** ou **Outro** (texto livre)
   - Se for material/extra, um dropdown sugere qual material/extra do seu catálogo bate com a descrição da nota (busca por similaridade de nome). Você confirma ou troca.
   - Itens não reconhecidos viram tipo "Outro" automaticamente
5. Você confirma e a nota é gravada normalmente no sistema (mesmo formato do cadastro manual)

### Exemplo de fluxo
Foto de uma nota com 8 itens → IA processa em ~5 segundos → tela de revisão mostra os 8 itens já mapeados (ex: "TECIDO MICROFIBRA AZUL 1m" sugerido como o material "Microfibra Azul" do seu catálogo) → você ajusta o que precisar e salva.

### Detalhes técnicos (resumo)

**Edge function nova**: `parse-invoice-image`
- Recebe a imagem em base64
- Chama Lovable AI Gateway com `google/gemini-2.5-flash` (rápido e bom em OCR/visão)
- Retorna JSON estruturado com fornecedor, data, itens e total
- Recebe também a lista de materiais/extras/fornecedores do usuário pra já tentar fazer o "match" na própria IA

**No frontend** (`ShoppingManager.tsx`):
- Novo botão de upload de imagem (aceita JPG, PNG, PDF)
- Modal de revisão com a lista de itens extraídos, cada um com seletor de tipo + sugestão de match
- Após confirmação, usa o mesmo fluxo de criação de invoice que já existe

**Sem mudanças no banco** — usa estruturas já existentes de `Invoice` e `InvoiceItem`.

### Custo / limites
- Lovable AI tem créditos gratuitos generosos do Gemini Flash até 6 de outubro de 2025
- Cada nota processada = ~1 chamada de visão (custo baixo)
- Se a IA errar algo, você corrige na tela de revisão antes de salvar — nada é gravado automaticamente

### O que fica fora desse plano
- Leitura de NFe XML (formato eletrônico) — daria pra adicionar depois se você costuma receber XMLs
- Cadastro automático de novos materiais que não existem no catálogo — por segurança, esses caem como "Outro" e você decide depois se vira material novo
