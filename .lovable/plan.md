## Objetivo

Validar persistência e recálculo automático na aba de Compras e padronizar as mensagens de toast (erro/aviso) para deixar claro **modo**, **item** e **limite permitido**.

## Diagnóstico atual (já lido no código)

Em `src/components/fluctus/screens/ShoppingManager.tsx`:

- **Recálculo imediato** já existe: `handleUpdateItemClassification` chama `calculateTotals` e faz `update('shoppingTrips', ...)` na mesma transação → a UI re-renderiza no mesmo tick. Idem para `handleRemoveInvoiceItem` e `handleAddInvoiceItem`. O balanço do fundo de logística só é recalculado quando a viagem é marcada como concluída (`handleToggleStatus` → `recalculateLogisticsFund`), o que é o comportamento esperado.
- **Persistência** usa `useLocalData` que salva o JSON inteiro (incluindo `qtyBusiness`, `excludedReason`, `includeInTotal` de cada item) no `localStorage` (imediato) e na nuvem (debounce 1,5s). Ao recarregar, recarrega da nuvem se houver sessão, senão do cache local.
- **Toasts atuais** são genéricos:
  - `"Limitado a {qty} (quantidade total do item)."`
  - `"Valor negativo ajustado para 0."`
  - `"No modo Dividido informe quanto é seu (maior que zero)."`
  - `"A parte sua não pode ser igual ou maior que a quantidade total. Use 'Meu' se for tudo seu."`

Nenhum cita o **nome do item** nem o **modo atual** sendo aplicado.

## O que será feito

### 1. Teste guiado de persistência e recálculo (sem mudança de código)

Faremos juntos na aba de Compras:

1. Expandir uma viagem em aberto e uma nota.
2. Reclassificar um item da lista (ex.: trocar "Meu" → "Dividido" com `meu = 3` em um item de `qty = 10`).
   - **Esperado**: a linha de totais da nota e o "Total mercadorias" da viagem mudam **na hora**, sem F5.
3. Forçar erro: digitar `meu = 99` num item com `qty = 10`.
   - **Esperado**: toast de aviso e valor limitado a 10.
4. Trocar para "Pessoal" e depois voltar para "Meu".
   - **Esperado**: totais sobem/descem na hora.
5. Apertar **F5** e reabrir a aba/viagem/nota.
   - **Esperado**: classificação, split e totais idênticos ao que estavam antes do reload.

Se algum desses passos falhar, eu corrijo pontualmente (provavelmente no `calculateTotals` ou no `update` da `shoppingTrips`).

### 2. Padronização dos toasts de erro/aviso

Substituir as 4 mensagens listadas acima por mensagens com contexto completo. Padrão:

```
[Modo] {Nome do item}: {problema}. {limite ou ação corretiva}.
```

Exemplos finais:

- Split acima do total (digitação inline na lista):
  `Dividido — "Suplex Poliamida": parte sua (99) maior que o total (10). Limitado a 10.`
- Valor negativo:
  `"Suplex Poliamida": valor negativo não permitido. Ajustado para 0.`
- Split inválido no cadastro de item novo (zero):
  `Dividido — "Suplex Poliamida": informe quanto é seu (entre 1 e {qty - 1}).`
- Split ≥ total no cadastro:
  `Dividido — "Suplex Poliamida": parte sua ({n}) deve ser menor que o total ({qty}). Se for tudo seu, use o modo "Meu".`

Helper local para resolver o nome do item (material/extra/descrição livre) e montar o prefixo `[Modo] "Nome"`, evitando repetir a mesma concatenação em cada `toast.error`/`toast.warning`.

## Arquivos afetados

- `src/components/fluctus/screens/ShoppingManager.tsx` — apenas os 4 `toast.*` citados e um pequeno helper `formatItemContext(item, mode)`.

Nenhuma mudança em tipos, persistência ou cálculos.
