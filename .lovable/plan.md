## Contexto

Revisei o `ShoppingManager.tsx` e o `useLocalData.ts`. Dos três pedidos, dois já estão funcionando, mas falta o terceiro (validação) e vale reforçar feedback visual:

- **Recálculo imediato ao reclassificar**: já acontece. `handleUpdateItemClassification` chama `calculateTotals` e `update('shoppingTrips', ...)` na hora, e `update` dispara o efeito que persiste o JSON no backend.
- **Persistência ao recarregar**: já acontece. `qtyBusiness` e `excludedReason` são gravados dentro de cada `InvoiceItem` no documento JSON único do usuário (jsonb na nuvem) e relidos na carga.
- **Validação de split maior que a quantidade total**: hoje o código *silenciosamente* faz `Math.min(splitMine, totalQty)` no add e na edição inline. Não há aviso, então o usuário pode digitar 5 num item de qty 3 e nem perceber que virou 3.

## O que será feito

### 1. Validação no formulário de adicionar item (modo Dividido)
Em `handleAddInvoiceItem` (linha ~287), antes de gravar, quando `itemMode === 'split'`:
- Se `splitMine <= 0` → toast de erro: "No modo Dividido informe quanto é seu (maior que zero)." e aborta.
- Se `splitMine >= totalQty` → toast de erro: "A parte sua não pode ser igual ou maior que a quantidade total. Use 'Meu' se for tudo seu." e aborta.
- Se `splitMine` não-inteiro e o item for por unidade discreta (`extra`/`other` com qty inteira) → toast de aviso, mas permite.

Visual: usar `sonner` (já é o padrão do projeto, conforme memória).

### 2. Validação na edição inline de classificação
Em `handleUpdateItemClassification` (linha ~363) e nos inputs de "Dividido" da lista (linhas ~778–795):
- Se o usuário digitar valor `> qty` no input numérico, mostrar toast curto ("Limitado a {qty}") e ainda assim aplicar o cap (mantém comportamento defensivo, mas avisa).
- Se digitar `< 0`, normaliza para 0 com toast.
- Adicionar `min={0}` e `max={item.qty}` no `<input type="number">` para feedback nativo do browser também.

### 3. Feedback visual de "salvando"
O recálculo é instantâneo e o `SyncIndicator` global já mostra "salvando/salvo" ao alterar. Não precisa de mudança extra — só confirmar no plano que está coberto.

### 4. (Opcional, pequeno) Toast de confirmação ao reclassificar
Toast leve "Item reclassificado como {modo}" quando o usuário troca o modo de um item já salvo, para dar a sensação de que persistiu. Curto, sem bloquear.

## Arquivos a editar

- `src/components/fluctus/screens/ShoppingManager.tsx` — único arquivo.
  - `handleAddInvoiceItem` (~287): validar split antes de salvar.
  - `handleUpdateItemClassification` (~363): toast quando capado, opcional toast de confirmação.
  - Inputs do modo Dividido no form (linhas ~920–940) e na edição inline (~778–795): adicionar `min`/`max`.

## Não muda

- Tipos, `useLocalData`, edge functions, `InvoicePhotoImporter`.
- Lógica de cálculo de totais — já consome `qtyBusiness` corretamente.
- Persistência — já é automática via debounce do `useLocalData`.
