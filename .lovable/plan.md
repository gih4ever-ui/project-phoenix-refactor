## Objetivo

Registrar a preferência de comunicação em português brasileiro e validar juntos a funcionalidade de classificação de itens (meu / parceira / pessoal) na aba de Compras.

## O que será feito

1. **Salvar preferência permanente do usuário** em `mem://~user` para que todas as próximas respostas sejam em português brasileiro.

2. **Roteiro de teste guiado na aba de Compras** — vamos validar passo a passo:

   **Cadastro de nota nova**
   - Abrir a aba Compras → adicionar uma nota
   - Adicionar um item no modo **"Meu"** (loja) → conferir que vai 100% para o balanço da loja
   - Adicionar um item no modo **"Parceira"** → conferir que não entra no balanço da loja
   - Adicionar um item no modo **"Pessoal"** → conferir que não entra no balanço da loja
   - Adicionar um item no modo **"Dividido"** com qty=10 e meu=4 → conferir balanço
   - Tentar salvar dividido com meu=0 ou meu≥total → deve bloquear com toast de erro

   **Reclassificação inline**
   - Trocar a classificação de um item já salvo direto na lista
   - Conferir recálculo imediato dos totais e do balanço
   - Tentar digitar split maior que o total → deve limitar e mostrar aviso

   **Persistência**
   - Recarregar a página (F5)
   - Reabrir a aba de Compras e a nota
   - Conferir que as classificações e splits permaneceram corretos

3. **Diagnóstico em caso de problema**: se algum passo falhar, vou abrir o componente `ShoppingManager.tsx` e investigar o ponto específico (validação, recálculo ou persistência).

## Como vamos proceder

Após aprovar este plano, eu salvo a preferência de idioma e te dou o "ok" para começar o teste. Você executa os passos acima na ordem e me avisa se algo não bater com o esperado — me diga em qual passo travou e o que viu na tela. A partir daí eu corrijo pontualmente.

## Arquivos potencialmente afetados (apenas se houver bug)

- `src/components/fluctus/screens/ShoppingManager.tsx` — lógica de validação, recálculo e classificação
- `mem://~user` — preferência de idioma (criação)
