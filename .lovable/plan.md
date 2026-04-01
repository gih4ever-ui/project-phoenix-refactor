

## Controle de Produção e Vendas — Por Produto

### Conceito

Cada movimentação é vinculada a um **produto específico** (ou kit), permitindo saber exatamente quanto você produziu, vendeu, presenteou e lucrou com cada modelo. Vendas promocionais registram o valor real cobrado vs. o preço cheio, mostrando o impacto dos descontos.

### Como funciona

**Nova tela "Produção & Vendas"** no menu lateral com:

1. **Resumo geral** — Cards no topo: total de peças disponíveis, valor investido parado, lucro total, total de perdas (presentes/uso pessoal)

2. **Resumo por produto** — Tabela/cards mostrando para cada produto:
   - Peças disponíveis | Produzidas | Vendidas | Presentes/Pessoal
   - Custo total investido | Receita gerada | Lucro real

3. **Registro de movimentações** — Formulário simples:
   - **Produto** (select dos produtos cadastrados)
   - **Tipo**: Produção (+), Venda (-), Presente (-), Uso pessoal (-), Ajuste (+/-)
   - **Quantidade**
   - **Valor unitário real** (pré-preenchido com preço do produto, editável para vendas promocionais)
   - **Descrição** (opcional)
   - **Data**

4. **Histórico** — Lista de movimentações com filtros por produto, tipo e período

### Vendas promocionais

Quando o tipo é "Venda", o campo de valor vem preenchido com o `finalPrice` do produto. Se foi uma venda com desconto, o usuário altera o valor. O sistema calcula:
- **Desconto dado** = preço cheio - valor real
- **Lucro da venda** = valor real - custo de produção (`totalCost`)
- Nos resumos, mostra separadamente: receita a preço cheio vs. receita real

### Estrutura técnica

**Novo tipo** `StockMovement` em `fluctus.ts`:
```
id, productId, date, type, quantity, unitValue, description
```

**Novo campo** `stockMovements: StockMovement[]` no `FluctusData`

**Novos arquivos**:
- `src/components/fluctus/screens/StockManager.tsx` — tela principal
- Atualizar `ViewType`, `ScreenPermission`, menu em `Index.tsx`
- Atualizar `useLocalData.ts` para incluir `stockMovements` no estado inicial
- Card resumo no Dashboard

**Sem mudanças no banco** — os dados ficam no JSON doc existente por usuário.

