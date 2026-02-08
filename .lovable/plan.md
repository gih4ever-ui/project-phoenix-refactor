

# Analise Completa do Projeto Fluctus

## O que ja esta funcionando bem

O sistema cobre um fluxo robusto de gestao para confeccao:
- Cadastro de Fornecedores e Polos com busca de CEP
- Materiais e Extras com sistema de cotacoes e selecao de melhor preco
- Precificacao de produtos com variações, materiais, extras, custos fixos rateados
- Kits com sincronizacao de extras e calculo dinamico de custos
- Clientes com CRM (tags, comentarios, aniversarios, genero)
- Compras com logistica, notas fiscais e controle de fundo
- Promocoes com diversos tipos, distribuicao por WhatsApp
- Dashboard com resumo e aniversarios proximos
- Backup/Restore com migracao automatica de dados antigos

---

## Problemas e Melhorias Identificados

### 1. Dados nao persistem (Critico)
Os dados ficam apenas em `useState` - ao recarregar a pagina, tudo se perde. Isso obriga o usuario a fazer backup/restore manual toda vez.

**Melhoria**: Salvar automaticamente no `localStorage` e carregar ao iniciar. Simples e resolve 90% do problema.

### 2. Menu mobile nao funciona
O header mobile tem um botao de filtro que nao faz nada. Nao ha como navegar entre as telas no celular.

**Melhoria**: Criar um drawer/menu lateral que abre ao clicar no botao mobile, mostrando os mesmos itens do sidebar.

### 3. Login e apenas decorativo
A tela de login nao tem autenticacao real - qualquer clique entra no sistema. Nao protege nada.

**Melhoria**: Remover a falsa sensacao de seguranca ou implementar autenticacao real com Supabase se necessario.

### 4. Confirmacao antes de excluir
Nenhuma tela pede confirmacao antes de excluir registros (produtos, kits, clientes, fornecedores, etc). Um clique acidental apaga tudo.

**Melhoria**: Adicionar dialog de confirmacao em todas as acoes de exclusao.

### 5. Dashboard poderia ser mais util
O dashboard mostra apenas contadores basicos. Faltam informacoes financeiras relevantes.

**Melhoria**: Adicionar cards com:
- Ticket medio dos produtos
- Custo fixo por unidade atual
- Total investido em materiais (das compras)
- Promocoes ativas
- Numero de kits

### 6. Catalogo duplica logica de calculo de custos
O `Catalog.tsx` recalcula custos de extras e kits de forma independente do `ProductPricing` e `KitManager`, podendo gerar valores inconsistentes.

**Melhoria**: Centralizar funcoes de calculo em `utils.ts` e reutilizar em todas as telas.

### 7. Falta feedback visual nas acoes
Ao salvar, editar ou excluir, o sistema usa `alert()` nativo em alguns lugares e nada em outros.

**Melhoria**: Substituir todos os `alert()` por toasts do Sonner (ja instalado) e adicionar feedback em todas as acoes.

### 8. Extras e Materiais na tela de compras nao atualizam preco base
Quando uma compra registra um preco diferente para um material, esse preco nao atualiza a cotacao do fornecedor automaticamente.

**Melhoria**: Oferecer opcao de atualizar a cotacao do fornecedor com base no preco da ultima compra.

---

## Plano de Implementacao (por prioridade)

### Fase 1 - Essencial
1. **Persistencia em localStorage** - Salvar dados automaticamente a cada mudanca e carregar ao iniciar
2. **Menu mobile funcional** - Drawer com navegacao completa
3. **Confirmacao de exclusao** - Dialog em todas as telas

### Fase 2 - Qualidade
4. **Substituir alert() por toasts** - Feedback consistente com Sonner
5. **Dashboard melhorado** - Mais metricas financeiras e operacionais
6. **Centralizar calculos** - Funcoes utilitarias compartilhadas para custos

### Fase 3 - Funcionalidades
7. **Atualizar cotacoes pela compra** - Opcao ao finalizar nota fiscal
8. **Melhorar tela de login** - Decidir entre remover ou implementar autenticacao real

---

## Detalhes Tecnicos

### Persistencia localStorage
```text
useLocalData.ts:
- useEffect para salvar em localStorage a cada mudanca no state
- Carregar dados do localStorage na inicializacao (com fallback para INITIAL_DATA)
- Manter backup/restore JSON como funcionalidade adicional
```

### Menu Mobile
```text
Index.tsx:
- Substituir o botao ListFilter por um toggle de drawer
- Reutilizar os mesmos menuItems do sidebar
- Fechar ao selecionar uma opcao
```

### Confirmacao de Exclusao
```text
Criar componente ConfirmDialog reutilizavel usando AlertDialog do Radix
Aplicar em: ProductPricing, KitManager, ClientManager, SupplierManager,
MaterialManager, ExtrasManager, ShoppingManager, PromotionsManager
```

