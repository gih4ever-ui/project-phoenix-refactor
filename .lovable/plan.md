## Objetivo
Facilitar saber onde comprar, adicionando link no fornecedor (link geral da loja) e também na cotação (para casos como Mercado Livre, onde cada produto tem URL própria).

## Mudanças

### 1. Tipos (`src/types/fluctus.ts`)
- `Supplier`: adicionar `website?: string` (link geral da loja/perfil).
- `Quote`: adicionar `url?: string` (link direto do produto/anúncio).

### 2. Cadastro de Fornecedor (`SupplierManager.tsx`)
- Novo campo "Link da loja / site" no formulário.
- Exibir ícone de link clicável no card do fornecedor quando preenchido (abre em nova aba).

### 3. Cotações — Materiais e Extras (`MaterialManager.tsx` e `ExtrasManager.tsx`)
- No formulário de cotação (onde hoje tem Fornecedor / Preço / Obs), adicionar campo opcional "Link do produto" (útil para Mercado Livre, Shopee, etc).
- Na listagem de cotações, quando houver `url`, mostrar um pequeno ícone de link (🔗) ao lado do fornecedor, clicável, abrindo em nova aba (`target="_blank" rel="noopener noreferrer"`).
- Nos chips compactos de cotação (fora do modo edição), também mostrar o ícone quando houver link.

### 4. Uso na foto de nota (opcional, sem mudança agora)
Não altera o fluxo de importação por foto — os links são preenchidos manualmente no cadastro.

## Detalhes técnicos
- Campos totalmente opcionais, retrocompatíveis (dados antigos sem link continuam funcionando).
- Sem migração de banco: tudo persiste no mesmo JSON do usuário.
- Validação leve: apenas garantir que começa com `http://` ou `https://` antes de abrir (prefixar `https://` se o usuário digitar sem protocolo).
