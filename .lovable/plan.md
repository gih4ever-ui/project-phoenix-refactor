

## Problema

O GitHub Pages serve o app em `/project-phoenix-refactor/`, mas o `BrowserRouter` no `App.tsx` não tem `basename`, então o React Router interpreta a URL como uma rota desconhecida e renderiza o componente `NotFound`.

## Solução

Duas alterações simples:

1. **`src/App.tsx`** -- Adicionar `basename` ao `BrowserRouter` usando a mesma lógica de ambiente do Vite:
   ```tsx
   <BrowserRouter basename={import.meta.env.BASE_URL}>
   ```
   O `import.meta.env.BASE_URL` já retorna `/project-phoenix-refactor/` em produção e `/` em dev, pois o `vite.config.ts` já configura o `base` corretamente.

2. **`public/404.html`** -- Criar um arquivo `404.html` que redireciona para `index.html`, necessário porque o GitHub Pages retorna 404 para rotas que não sejam `/index.html` (ex: refresh na página). Este é o hack padrão para SPAs no GitHub Pages.

Nenhuma outra alteração necessária. Após o sync, o workflow vai rodar automaticamente e o site funcionará.

