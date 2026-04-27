## Objetivo

Três melhorias no fluxo de Compras / Importar Nota por Foto:

1. **Marcar partes da compra como "não minhas"** (pessoal, parceira, presente) para não entrarem no custo do negócio.
2. **Aprender o nome que aparece na nota** para cada fornecedor, fazendo o auto-match nas próximas fotos.
3. **Comparativo de preço**: mostrar se cada item saiu mais barato ou mais caro que o preço cotado para aquele fornecedor.

---

## 1. Itens pessoais / divididos com terceiros

### Comportamento

Cada item da nota (material, extra OU other) ganha duas dimensões:

- **Quantidade total comprada** (o que está na nota — sempre real)
- **Quantidade que entra no negócio** (o que vai para o custo + estoque)

Exemplos cobertos:

- "Comprei 4kg de tecido, 2kg eram da minha parceira" → qtd total 4, qtd minha 2.
- "Peguei um chocolate na ida" → marca o item inteiro como pessoal (qtd minha = 0).

### UI no Importador por Foto (`InvoicePhotoImporter.tsx`)

Em cada item parseado, adicionar:

- Campo **"Quantidade minha"** ao lado de "Qtd total" (default = qtd total).
- Botão rápido **"Tudo pessoal"** que zera a quantidade minha e marca o item como pessoal.
- Tag visual quando `qtdMinha < qtdTotal` ("parcial — pessoal/parceira") ou `qtdMinha === 0` ("pessoal — fora do balanço").
- Campo opcional **"De quem é a parte fora?"** (texto livre: "Parceira", "Pessoal", "Presente para X") — só aparece se houver parte excluída.

### UI no ShoppingManager (lista de itens da nota já salva)

Mesma divisão visível em cada item da nota: qtd total, qtd que entra, etiqueta da parte excluída. Permite editar depois.

### Cálculo

Total da nota e custo do negócio passam a usar `**qtyBusiness * price**` em vez de `qty * price`. A nota mostra dois totais:

- "Total da nota" (o que foi pago de verdade — `qtyTotal * price`)
- "Custo do negócio" (o que entra no balanço — `qtyBusiness * price`, com desconto rateado proporcionalmente)

O fundo de logística e o custo dos materiais/extras já usam `includeInTotal`. Vamos generalizar: um item conta para o negócio quando `qtyBusiness > 0`, e o valor que entra é `qtyBusiness * price`.

### Mudança de tipos (`src/types/fluctus.ts`)

```ts
interface InvoiceItem {
  // ... existente
  qty: number;              // Quantidade total comprada (na nota)
  qtyBusiness?: number;     // Quantidade que entra no negócio (default = qty)
  excludedReason?: string;  // "Pessoal", "Parceira", etc — só preenchido se qtyBusiness < qty
  // includeInTotal continua existindo só para retrocompatibilidade ("other" 100% pessoal)
}
```

Migração leve no `useLocalData` (startup): para itens existentes, `qtyBusiness = includeInTotal === false ? 0 : qty`.

---

## 2. Aliases de fornecedor (auto-match na foto)

### Comportamento

Hoje o Adamá aparece na nota com outro nome (ex: razão social) e a IA não casa. Solução:

- Cada fornecedor pode ter uma lista de **"nomes que aparecem na nota"** (aliases).
- Quando o usuário cadastra um fornecedor a partir do botão "Cadastrar novo fornecedor" no importador, o nome lido vai automaticamente para os aliases.
- Quando o usuário **manualmente** seleciona um fornecedor diferente do que a IA leu (ou seja, a IA leu "X" mas o usuário escolheu "Adamá"), aparece um pequeno aviso: *"Salvar 'X' como apelido de Adamá para a próxima vez?"* com botão de confirmar.
- A edge function recebe os aliases junto com o nome principal e faz o match contra todos.

### Mudança de tipos

```ts
interface Supplier {
  // ... existente
  invoiceAliases?: string[]; // Nomes alternativos que aparecem em notas
}
```

### Edge function (`parse-invoice-image/index.ts`)

No `catalogText`, listar fornecedores assim:

```
- id=12: "Adamá Tecidos" (também chamado: "ADAMA COMERCIO LTDA", "Adama SP")
```

E reforçar no prompt: *"Considere também os apelidos listados ao casar."*

### UI

- `**SupplierManager.tsx**`: campo "Apelidos na nota fiscal" (lista editável, separada por enter ou tags).
- `**InvoicePhotoImporter.tsx**`: ao trocar manualmente o fornecedor selecionado, oferecer salvar alias.

---

## 3. Comparativo: preço pago vs preço cotado

### Comportamento

Para cada item material/extra mapeado ao catálogo, comparar `unitPrice` da nota com o preço cotado **daquele fornecedor** (já existe `getQuotedPriceBySupplier` no `ShoppingManager`).

### Onde aparece

**A) Dentro do importador (revisão da foto):**
Linha discreta abaixo de cada item já mapeado:

- 🟢 "R$ 12,00 — 8% mais barato que sua cotação (R$ 13,00)"
- 🔴 "R$ 14,00 — 7,7% mais caro que sua cotação (R$ 13,00)"
- ⚪ "Sem cotação cadastrada para este fornecedor" (poderia sugerir o cadastro)
- 🟡 "Mesmo preço da cotação"

**B) Resumo no topo da nota (após import):**
Card com 3 números:

- Itens mais baratos: N (economia total R$ X)
- Itens mais caros: N (acréscimo R$ Y)
- **Saldo:** R$ (X − Y) — verde se positivo (economizou), vermelho se negativo.

**C) Na lista de notas finalizadas (`ShoppingManager`):**
Cada item exibe a mesma comparação (mesma lógica) — assim o usuário enxerga histórico sem reabrir.

**D) Opcional — atualizar a cotação:**
Quando o preço da nota for diferente da cotação cadastrada, mostrar botão sutil **"Atualizar cotação para R$ X,XX"** no item, que altera o `quote.price` daquele fornecedor naquele material/extra.

### Implementação

- Função utilitária `compareToQuote(itemId, type, supplierId, paidPrice)` retornando `{ quotedPrice, diff, diffPercent, status: 'cheaper' | 'higher' | 'equal' | 'no_quote' }`.
- Componente `<PriceComparisonBadge>` reutilizado nos 3 lugares (importador, resumo, lista da nota).

---

## Detalhes técnicos

### Arquivos editados

- `src/types/fluctus.ts` — `InvoiceItem.qtyBusiness`, `InvoiceItem.excludedReason`, `Supplier.invoiceAliases`.
- `src/hooks/useLocalData.ts` — migração leve de `includeInTotal` → `qtyBusiness`.
- `src/components/fluctus/InvoicePhotoImporter.tsx` — campos de quantidade dividida + comparativo de preço + sugestão de alias.
- `src/components/fluctus/screens/ShoppingManager.tsx` — exibir qtdBusiness e comparativo nas notas; adaptar `calculateTotals`.
- `src/components/fluctus/screens/SupplierManager.tsx` — editor de aliases.
- `src/components/fluctus/PriceComparisonBadge.tsx` (novo) — componente reutilizável.
- `src/lib/priceCompare.ts` (novo) — função `compareToQuote`.
- `supabase/functions/parse-invoice-image/index.ts` — receber e listar aliases no prompt.

### Cálculo de total com qtyBusiness

```ts
const itemsTotal = inv.items.reduce((s, item) => {
  const qty = item.qtyBusiness ?? item.qty;
  return s + qty * item.price;
}, 0);
const businessRatio = itemsTotal / (inv.items.reduce((s, i) => s + i.qty * i.price, 0) || 1);
const discountRateado = (inv.discountType === 'percent'
  ? itemsTotal * (inv.discount / 100)
  : inv.discount * businessRatio);
return itemsTotal - discountRateado;
```

### Retrocompatibilidade

Itens antigos sem `qtyBusiness` continuam funcionando: `qtyBusiness ?? qty` em todo lugar. Itens "other" com `includeInTotal === false` viram `qtyBusiness = 0` na primeira leitura.

---

## Fora do escopo (para depois, se quiser)

- Relatório agregado mensal de economia/perda vs cotações.
- Atribuir a parte "não minha" a um cliente cadastrado (parceira como cliente) para gerar conta a receber.
- Fotografar itens individuais para o catálogo.