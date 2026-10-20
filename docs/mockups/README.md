# Mockups editáveis — 3E Operações

Artefato de **avaliação de interface**, separado da aplicação funcional. Não substitui o sistema: serve para discutir a organização das telas, os estados e o comportamento responsivo antes/depois da implementação.

## Como abrir

- **Navegador**: dê duplo clique em `docs/mockups/index.html`.
- **VS Code**: clique com o botão direito → *Open with Live Server* (se instalado) ou abra o arquivo no navegador.
- Não precisa de build, servidor ou dependências: é HTML + CSS puro.

## Como editar

- Todo o layout está em `index.html` (CSS no `<style>` do topo).
- As classes seguem os mesmos tokens do produto (`--accent`, `--line`, `--success`, etc.).
- Para duplicar uma tela, copie o bloco `<section>`/`<div class="card">` correspondente.
- Para testar o celular, reduza a janela para ~390 px: as tabelas viram cartões automaticamente.

## O que está representado

| Seção | Conteúdo |
| --- | --- |
| 1. Lista de pedidos | Filtros, contagem, tabela no desktop e cartões no celular |
| 2. Detalhe do pedido | Progresso, quantidades, prazo, desmembramento, remessas e botão “+ Adicionar remessa” |
| 3. Usuários | Tabela no desktop, cartões no celular, ativar/inativar com confirmação |
| 4. Impressão | Folha A4 da ordem de produção, sem menu nem página extra |
| 5. Estados | Carregando, vazio, sucesso e erro |
| 6. Fluxo | Navegação por perfil e retorno com filtros preservados |

## Relação com a implementação

As telas implementadas ficam em `src/app` e os componentes em `src/shared/ui`. O mockup antecipa/registra as decisões; a versão funcional é a fonte da verdade. Divergências entre mockup e app devem ser resolvidas a favor do app e registradas em `docs/avaliacao-heuristicas.md`.
