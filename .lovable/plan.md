## Objetivo
Adicionar um botão na tela de Compras para o usuário recalcular manualmente os totais de todas as viagens e sincronizar o balanço do fundo de logística, sem precisar atualizar a página.

## Motivação
Com a introdução da classificação de itens (meu/parceira/pessoal/dividido), os totais das notas e viagens dependem da quantidade de negócio (`qtyBusiness`). Um recálculo manual corrige eventuais inconsistências de dados legados ou migrações, garantindo que o balanço exibido esteja sempre correto.

## O que será feito

### 1. Função `recalculateAllTotals` no hook `useLocalData.ts`
- Criar uma função no hook que percorre todas as `shoppingTrips` e recalcula, para cada uma:
  - `totalLogistics`: soma de todos os itens de logística da viagem.
  - `totalGoods`: soma dos itens das notas fiscais considerando apenas `qtyBusiness * price`, menos o desconto da nota.
  - `grandTotal`: `totalLogistics + totalGoods`.
- A lógica de cálculo deve espelhar exatamente a função `calculateTotals` existente no `ShoppingManager.tsx` (incluindo o tratamento de `qtyBusiness` e descontos).
- Após recalcular todos os totais das trips, chamar internamente a lógica de `recalculateLogisticsFund` para sincronizar o balanço.
- Fazer tudo em um único `setData` para evitar múltiplos re-renders.

### 2. Botão na tela de Compras (`ShoppingManager.tsx`)
- Adicionar um botão secundário (com ícone de refresh/calculadora) no cabeçalho da tela, ao lado do título "Registro de Compras".
- Ao clicar, chamar `db.recalculateAllTotals()`.
- Exibir um toast de sucesso via `sonner`: "Totais recalculados e balanço sincronizado."

### 3. Teste de verificação
- Incluir uma verificação rápida via script Playwright após a implementação para garantir que o botão aparece e dispara o recálculo sem erros no console.

## Arquivos que serão alterados
- `src/hooks/useLocalData.ts`
- `src/components/fluctus/screens/ShoppingManager.tsx`

## Notas técnicas
- A função não modifica itens, notas fiscais ou logística — apenas reprocessa os totais já existentes.
- O recálculo deve ser idempotente: rodar duas vezes seguidas deve produzir o mesmo resultado.
- A sincronização com a nuvem acontecerá automaticamente via debounce já existente no `useLocalData`.