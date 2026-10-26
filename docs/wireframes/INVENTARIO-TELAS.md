# Inventário de telas — 3E Operações

**Data**: 27/10/2026
**Projeto Balsamiq**: https://balsamiq.cloud/ssandol/p4879yi (20 boards editáveis)
**Fonte**: rotas em `src/app`, navegação em `src/shared/ui/navegacao-perfil.ts` e permissões em `src/modules/usuarios/permissoes.ts`.
**Wireframes**: `docs/wireframes/index.html` (editável) · `docs/wireframes/png/` (32 molduras) · `docs/wireframes/wireframes.pdf`.

> Todas as telas autenticadas usam o mesmo shell (`AppShell`): menu lateral por perfil, cabeçalho com usuário/sair e conteúdo. No celular o menu vira gaveta e as tabelas viram cartões.

---

## 1. Cobertura

| # | Wireframe | Rota | Perfil | Objetivo | Mobile |
| --- | --- | --- | --- | --- | --- |
| 1 | WF-01 Login | `/login` | Público | Autenticar e redirecionar ao perfil | Sim |
| 2 | WF-02 Redirecionamento | `/` | Público/autenticado | Escolher login ou tela inicial; fallback de perfil sem tela | — |
| 3 | WF-03 Vendas | `/vendedor/pedidos` | Vendedor | Importar pedido, filtrar e abrir pedidos | Sim |
| 4 | WF-04 Detalhe do pedido | `/vendedor/pedidos/[id]` | Vendedor | Desmembrar, prazo, remessas e saldos | Sim |
| 5 | WF-05 Painel | `/gerente/painel` | Gerente | Produção, alertas e ocorrências | Sim |
| 6 | WF-06 Pedidos | `/gerente/pedidos` | Gerente | Consultar e abrir pedidos | Padrão WF-18 |
| 7 | WF-07 Detalhe / correção | `/gerente/pedidos/[id]` | Gerente | Mesmo detalhe + correção de setor | Padrão WF-18 |
| 8 | WF-08 Meus pedidos | `/operador/fila` | Operador | Ver atividades do turno e abrir | Sim |
| 9 | WF-09 Executar atividade | `/operador/atividades/[id]` | Operador | Registrar produção | Sim |
| 10 | WF-10 Ocorrências | `/operador/ocorrencias` | Operador | Registrar e consultar ocorrências | Sim |
| 11 | WF-11 Entregas | `/expedicao/entregas` | Expedição | Registrar entrega e exceção | Sim |
| 12 | WF-12 Importar pedido | `/integracao` | Gerente | Acompanhar a importação | Padrão WF-18 |
| 13 | WF-13 Usuários | `/admin/usuarios` | Resp. Sistema | Criar e ativar/inativar usuários | Sim |
| 14 | WF-14 Setores | `/admin/setores` | Resp. Sistema | Criar setor e mapear categoria | Padrão WF-18 |
| 15 | WF-15 Integração | `/tecnico/integracao` | Resp. Técnico | Ver jobs e eventos | Padrão WF-18 |
| 16 | WF-16 Ordem / impressão | `/producao/atividades/[id]/ordem` | Operador | Imprimir ordem em 1 página | Sim + A4 |
| 17 | WF-17 Estados globais | — | Todos | Feedback e erros padronizados | — |
| 18 | WF-18 Responsivo | — | Todos | Menu, filtros e tabela→cartões | Sim |
| 19 | WF-19 Mapa | — | Todos | Navegação e rota inicial | — |
| 20 | KIT Componentes | — | Todos | Botões, campos, badges, progresso | — |

**Rotas do app cobertas:** 16 de 16 (`page.tsx`). **Estados transversais:** 10. **Molduras exportadas:** 32 (desktop, mobile, estados, mapa, componentes).

---

## 2. Detalhe por tela

### WF-01 · Login (`/login`)
- **Conteúdo**: hero institucional (≥780 px) + caixa de acesso; e-mail, senha, “Entrar”.
- **Estados**: carregando (“Entrando…”), 401, erro de rede, foco visível.
- **Regras**: sessão guarda só o id; perfis vêm de `/api/auth/sessao`; redireciona pela 1ª rota do perfil.
- **Fonte**: `src/app/login/page.tsx`, `rotaInicialDoPerfil`.

### WF-02 · Redirecionamento (`/`)
- **Conteúdo**: decisão silenciosa; fallback centralizado “Seu perfil ainda não tem telas disponíveis”.
- **Estados**: sem sessão → login; perfil sem rota → mensagem neutra.
- **Fonte**: `src/app/page.tsx`.

### WF-03 · Vendas (`/vendedor/pedidos`)
- **Conteúdo**: importação por número + “Como funciona” (3 passos); filtros (número, cliente, setor, status, período); tabela (Pedido, Cliente, Status, Ações); paginação.
- **Estados**: carregando, vazio, erro, página inexistente, importação em andamento/sucesso/falha.
- **Regras**: número comercial; filtros na URL; 20 por página; voltar preserva.
- **Fonte**: `vendedor/pedidos/page.tsx`, `PedidosLista`, `ImportarPedido`.

### WF-04 · Detalhe do pedido (`/vendedor/pedidos/[id]`)
- **Conteúdo**: voltar; identificação (pedido, cliente, vendedor); métricas (itens, sem setor, pendentes); resumo (progresso por unidade + por setor); para cada item: progresso, 6 valores, setor/status, prazo do setor, prazo do item, desmembramento, correção, remessas.
- **Estados**: sem itens; sem prazo; desmembrado; erro/sucesso de ação; correção bloqueada.
- **Regras**: perda/refugo não reduzem a obrigação; prazo no fim do dia em SP; remessa confirmada pode ser removida com confirmação.
- **Fonte**: `shared/ui/pedido-detalhe.tsx`.

### WF-05 · Painel (`/gerente/painel`)
- **Conteúdo**: 4 métricas (pendências, em andamento, concluídas, cumprimento de prazo); alertas (atrasados, parados, não encaminhados); **ocorrências recentes** (total, 7 dias, por tipo, lista com pedido/item/setor/responsável/motivo/data); produção por setor; atividades por status.
- **Estados**: sem ocorrências, sem produção, sem status, erro.
- **Regras**: ocorrências vêm de `GET /api/indicadores/ocorrencias`; não há fluxo de “resolução” (lacuna).
- **Fonte**: `gerente/painel/page.tsx`, `modules/ocorrencias/painel-ocorrencias.ts`.

### WF-06 · Pedidos (`/gerente/pedidos`)
- **Conteúdo**: mesma consulta do Vendedor sem importação/instruções; abrir leva ao detalhe do gerente.
- **Estados**: vazio, erro, página inexistente.
- **Fonte**: `gerente/pedidos/page.tsx`, `PedidosLista`.

### WF-07 · Detalhe / correção (`/gerente/pedidos/[id]`)
- **Conteúdo**: WF-04 + bloco **Correção de setor** (novo setor, motivo obrigatório, confirmar/cancelar).
- **Estados**: correção bloqueada, justificativa curta, sucesso.
- **Regras**: corrigir setor não apaga execuções/entregas/remessas; permissão `corrigir_setor`.
- **Fonte**: `gerente/pedidos/[id]/page.tsx`, `PedidoDetalhe`.

### WF-08 · Meus pedidos (`/operador/fila`)
- **Conteúdo**: cartões com prioridade, setor, item, pedido, status e “Abrir atividade”.
- **Estados**: vazio (“Nenhum pedido para você agora”), erro.
- **Regras**: só setores do operador; prioridade desc, criação asc.
- **Fonte**: `operador/fila/page.tsx`, `modules/producao/fila.ts`.

### WF-09 · Executar atividade (`/operador/atividades/[id]`)
- **Conteúdo**: voltar; “Ver ordem de produção”; item/pedido/setor; progresso e valores; “Registrar execução”; bloco de ocorrência com link.
- **Estados**: carregando, erro, sucesso, quantidade inválida, envio bloqueado.
- **Regras**: quantidade na unidade da atividade; operador só nos seus setores.
- **Fonte**: `operador/atividades/[id]/page.tsx`.

### WF-10 · Ocorrências (`/operador/ocorrencias`)
- **Conteúdo**: formulário (atividade, tipo, motivo, quantidade, observação) + “Minhas ocorrências”.
- **Estados**: sem atividades, sem ocorrências, erro (campos preservados), sucesso, pré-seleção por `?atividade=`.
- **Regras**: motivo obrigatório para perda/refugo/indisponibilidade; grava em `ocorrencias`; visível ao gerente.
- **Fonte**: `operador/ocorrencias/page.tsx`, `OcorrenciaForm`, `registrar-ocorrencia.ts`.

### WF-11 · Entregas (`/expedicao/entregas`)
- **Conteúdo**: select de pedido; métricas; cartão por item; quantidade; exceção com autorização + motivo.
- **Estados**: sem saldo, exceção, 403, sucesso, erro.
- **Regras**: acima do disponível exige gerente e motivo; saldo recarregado após registrar.
- **Fonte**: `expedicao/entregas/page.tsx`.

### WF-12 · Importar pedido (`/integracao`)
- **Conteúdo**: número; status do job; andamento/sucesso/falha; divergência de unidade; “Abrir pedido”.
- **Estados**: processando, sucesso, falha, reuso de resultado anterior.
- **Regras**: Top Gerente somente leitura; idempotência e auditoria.
- **Fonte**: `integracao/page.tsx`, `ImportarPedido`.

### WF-13 · Usuários (`/admin/usuarios`)
- **Conteúdo**: criar usuário (nome, e-mail, senha, perfis, setores); tabela (usuário, perfil, setor, status); ativar/inativar com confirmação em linha.
- **Estados**: 409, 403, confirmação, vazio, erro.
- **Regras**: inativar impede login; perfis/setores validados no servidor.
- **Fonte**: `admin/usuarios/page.tsx`.

### WF-14 · Setores (`/admin/setores`)
- **Conteúdo**: criar setor (código, nome); mapeamento categoria→setor (buscar, selecionar, salvar); lista.
- **Estados**: 409, sem mapeamento, sucesso, erro.
- **Regras**: um mapeamento ativo por categoria.
- **Fonte**: `admin/setores/page.tsx`.

### WF-15 · Integração (`/tecnico/integracao`)
- **Conteúdo**: jobs (pedido, id, status, erro) e eventos do job selecionado.
- **Estados**: sem jobs, evento vazio, erro.
- **Regras**: somente leitura; retry na importação.
- **Fonte**: `tecnico/integracao/page.tsx`.

### WF-16 · Ordem / impressão (`/producao/atividades/[id]/ordem`)
- **Conteúdo**: voltar, imprimir; folha com pedido, item, setor, unidade, solicitado, executado, pendente.
- **Estados**: 404, erro; impressão em 1 página.
- **Regras**: menu oculto na impressão; sem `min-height` do shell.
- **Fonte**: `producao/atividades/[id]/ordem/page.tsx`.

---

## 3. Dados e permissões (resumo)

| Tela | Ação principal | Permissão |
| --- | --- | --- |
| WF-03/04 | Consultar/desmembrar/prazo/remessa | `consultar_pedidos`, `classificar_item`, `definir_prazo`, `programar_remessa` |
| WF-05 | Painel e ocorrências | `consultar_pedidos` |
| WF-06/07 | Consultar/corrigir setor | `consultar_pedidos`, `corrigir_setor` |
| WF-08/09 | Fila e execução | `registrar_execucao` |
| WF-10 | Ocorrências | `registrar_ocorrencia` |
| WF-11 | Entregas | `registrar_entrega` (+ `autorizar_excecao` para exceção) |
| WF-12 | Importar | `solicitar_importacao` |
| WF-13/14 | Usuários/setores | `gerenciar_usuarios`, `gerenciar_setores` |
| WF-15 | Jobs | `monitorar_integracao` |

> O menu é conveniência; a autorização real é feita no servidor (`autorizar`).

---

## 4. Fora do inventário (consciente)

- **404 global do Next**: não há `not-found.tsx` próprio; o estado é representado em WF-17.
- **Tela de erro 500 global**: idem; o app trata erros por tela com `Alert`.
- **Perfil “Responsável Técnico”**: só tem WF-15 hoje.
- **Tela de troca de senha/recuperação**: não existe no escopo atual.
- **Auditoria/relatórios**: não há tela dedicada; dados aparecem no painel e nos jobs.

---

## 5. Rastreabilidade com specs

| Wireframe | Spec/feature |
| --- | --- |
| WF-01/02 | `auth`, `FEP-10/11` |
| WF-03/04 | `consulta-pedidos`, `prazos`, `remessas`, `classificacao` |
| WF-05 | `indicadores`, `alertas`, `ocorrencias` (AD-021) |
| WF-08/09/16 | `producao`, `ordem-producao` |
| WF-10 | `ocorrencias` (OCO-01..13, AD-021) |
| WF-11 | `entregas` |
| WF-12 | `integracao-top-gerente` |
| WF-13/14 | `usuarios`, `setores` |
| WF-15 | `integracao` (LAC-09/10) |
