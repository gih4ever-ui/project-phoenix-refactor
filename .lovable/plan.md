## Problema

A classificação de item (Meu / Parceira / Pessoal / Dividido) hoje só existe no fluxo de **importação por foto** (`InvoicePhotoImporter`). No cadastro **manual** de notas dentro da aba Compras (`ShoppingManager.tsx`), o formulário de adicionar item ainda só tem o checkbox antigo "Contabilizar" (e mesmo assim só aparece para o tipo "Outro"). Resultado: ao digitar a nota manualmente não há onde marcar o que é meu, da parceira ou pessoal.

Os itens **já salvos** em uma nota também não podem ter sua classificação editada na lista — só é possível remover.

## O que será feito

### 1. Seletor rápido no formulário de adicionar item (manual)
No bloco de "Adicionar item" da nota em edição (`ShoppingManager.tsx`, ~linhas 687–791), adicionar um seletor de 4 botões logo abaixo dos campos Qtd/Preço, **disponível para todos os tipos** (material, extra e outro):

- **Meu** → `qtyBusiness = qty`, `excludedReason = ""`
- **Parceira** → `qtyBusiness = 0`, `excludedReason = "Parceira"`
- **Pessoal** → `qtyBusiness = 0`, `excludedReason = "Pessoal"`
- **Dividido** → habilita um input numérico "Quanto é meu" (0 < x < qty) + campo livre "resto é de" (default "Parceira")

Visual idêntico ao do `InvoicePhotoImporter` (mesmas cores: primary / pink / amber / blue) para manter consistência.

### 2. Estado e persistência
Estender o estado `newInvoiceItem` com `qtyBusiness` e `excludedReason`. Ajustar `handleAddInvoiceItem` (~linha 287) para gravar esses campos no `InvoiceItem` em vez de derivar de `includeInTotal`. Manter `includeInTotal` apenas como retrocompatibilidade.

Remover o checkbox "Contabilizar" antigo (substituído pelo seletor).

### 3. Editar classificação de itens já adicionados
Na lista de itens da nota (~linha 636), adicionar um pequeno botão de "editar classificação" (ícone) ao lado do botão de remover, que abre os mesmos 4 botões inline para alterar `qtyBusiness` / `excludedReason` daquele item, recalculando os totais via `calculateTotals`.

### 4. Default sensato
Ao adicionar um novo item, default = **Meu** (todo o item entra no negócio), igual ao comportamento atual.

## Arquivos a editar

- `src/components/fluctus/screens/ShoppingManager.tsx` — único arquivo afetado. Mudanças:
  - Estado inicial de `newInvoiceItem` (incluir `qtyBusiness`, `excludedReason`, modo)
  - Bloco JSX do formulário "Adicionar item" (linhas ~687–791): adicionar seletor de 4 botões + input de divisão
  - `handleAddInvoiceItem` (linha ~287): salvar `qtyBusiness` e `excludedReason` corretos
  - Lista de itens (linha ~636): botão de editar classificação inline

## Não muda

- Tipos em `src/types/fluctus.ts` (já têm `qtyBusiness` e `excludedReason`)
- `InvoicePhotoImporter.tsx` (já tem o seletor, fica como está)
- Lógica de cálculo (`businessQty`, totais) — já consome `qtyBusiness` corretamente
- `PriceComparisonBadge`, aliases de fornecedor, edge function de OCR — sem alteração
