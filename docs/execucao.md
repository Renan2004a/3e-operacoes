# Diário de execução — 3E Operações

Registro contínuo do desenvolvimento pelo fluxo `tlc-spec-driven`. Cada feature tem: objetivo, o que foi feito, como, commits, testes, verificação e decisões.

---

## Feature 1 — Importação de Pedido por Número

**Data**: 2026-10-06
**Requisitos**: RF001, RF017 (parcial), HU06
**Artefatos**: `.specs/features/importacao-pedido-por-numero/{spec,context,design,tasks,validation}.md`

### Objetivo
Importar um pedido específico, sob demanda, do Top Gerente (AWS) para o banco do app, com job assíncrono idempotente, callback autenticado e consulta de status. Sem polling, sem escrita no legado, sem auth própria nesta fatia.

### Como foi feito
- **Specify**: 23 critérios de aceitação em EARS; gate `validate_spec.py` 0 erros/0 avisos.
- **Design**: abordagem A (despacho em background após o `202`); contratos Zod; portas e adapters; decisões registradas em `AD-001`/`AD-002`.
- **Tasks**: 17 tarefas em 6 fases; gate `validate_tasks.py` 0 erros.
- **Execute**: 2 batches de subagentes (T1–T8, T9–T17), 1 commit atômico por tarefa.
- **Verify**: Verifier independente (autor ≠ verificador) com checagem por AC e sensor de discriminação.

### Resultado
- **17 tarefas + 6 correções (T18–T23)** implementadas.
- **94 testes** passando, 0 ignorados. Cobertura de domínio 100% linhas/funções, 89% branches.
- **Verificação final: PASS** — 23/23 ACs com evidência, 8/8 mutantes mortos.
- `validate_state.py`: 0 erros.

### O que funciona
Job idempotente (janela 60 s), guarda de token, contratos Zod, despacho autenticado, status `202`/`200`/`404`, upsert de pedido/itens, exclusão de item cancelado, detecção de divergência com `AuditLog` + evento, reprocesso (`409`), conector somente leitura com normalização.

### Decisões e desvios
- `solicitarImportacao` retorna `{ jobId, reused }` para não re-despachar em idempotência.
- Extração de `src/app/api/integracao/despacho.ts` (reuso entre POST e reprocesso).
- Divergência registrada via porta `registrarDivergencia` (mantém o domínio sem banco).
- Callback valida `CONNECTOR_CALLBACK_TOKEN`; rotas de usuário usam `APP_INTERNAL_TOKEN`.
- Adapters Prisma excluídos do limiar de cobertura (AD-002); testados via fake Prisma onde aplicável.

### Riscos abertos
- Categoria do produto indisponível na AWS (`cad_produto` vazia) → item fica `PENDING_CLASSIFICATION`.
- Vendedor só tem código (`Vend`); nome nulo.
- Migrations ainda não aplicadas (sem MySQL de runtime no ambiente atual).

---

## Feature 2 — Setores e Classificação de Itens

**Data**: 2026-10-07
**Requisitos**: RF002, RF015
**Artefatos**: `.specs/features/setores-e-classificacao/{spec,design,tasks,validation}.md`

### Objetivo
Manter setores operacionais, o de/para categoria → setor auditável e a classificação de itens pendentes. A classificação cria uma `Activity` (item × setor) e marca o item como `CLASSIFIED`.

### Como foi feito
- **Specify**: 18 critérios EARS; `validate_spec.py` 0/0.
- **Design**: classificação cria `Activity`; chave do mapeamento = `categoriaLegado`; auto-classificação por porta injetada.
- **Tasks**: 9 tarefas em 3 fases; `validate_tasks.py` 0 erros.
- **Execute**: 1 batch (T1–T9), commit atômico por tarefa.
- **Verify**: Verifier independente. Iteração 1 = FAIL (SET-09 não ligada ponta a ponta). Correções T10–T13. Iteração 2 = **PASS**.

### Resultado
- **13 tarefas** (T1–T13) implementadas.
- **148 testes** passando. Cobertura de domínio 95% stmts / 89,7% branches.
- **Verificação final: PASS** — 18/18 ACs com evidência, 7/7 mutantes mortos.
- `validate_state.py`: 0 erros.

### Decisões e desvios
- Setor do item vive na `Activity`; `OrderItem` só recebe `CLASSIFIED`.
- `prisma-classificacao-automatica.ts` liga a porta ao callback de importação.
- GET `/api/mapeamentos` resolve `?category=` (contrato documentado no design).

### Riscos abertos
- Categoria do legado continua indisponível na AWS; itens sem categoria ficam pendentes.
- Rotas protegidas por `APP_INTERNAL_TOKEN` até a feature de autenticação.

---

## Feature 3 — Produção e Fila de Atividades

**Data**: 2026-10-07
**Requisitos**: RF003, RF004, RF007, RF018; RN001, RN003, RN010, RN011, RN020, RN021, RN022, RN030, RN031, RN033
**Artefatos**: `.specs/features/producao-e-fila/{spec,design,tasks,validation}.md`

### Objetivo
Fila de atividades por setor, registro de execução com validação de unidade, saldo pendente (solicitado − executado), prioridades e dados da ordem de produção.

### Como foi feito
- **Specify**: 15 critérios EARS; `validate_spec.py` 0/0.
- **Design**: domínio puro `src/modules/producao/`; porta `ProducaoRepository`; adapter Prisma; usuário atual via cabeçalho temporário `x-user-id`.
- **Tasks**: 11 tarefas em 3 fases; `validate_tasks.py` 0 erros.
- **Execute**: 2 batches (T1–T7, T8–T11), commit atômico por tarefa.
- **Verify**: Verifier independente → **PASS** na primeira rodada.

### Resultado
- **11 tarefas** implementadas.
- **208 testes** passando. Cobertura de produção 100% linhas/funções, 96,9% branches.
- **Verificação: PASS** — 15/15 ACs, 8/8 mutantes mortos. `validate_state.py`: 0 erros.

### Decisões e desvios
- Peça inteira; metro 2 casas; demais unidades inteiras.
- Atividade `COMPLETED` quando executado ≥ solicitado; `DIVERGENT` quando ultrapassa.
- Revenda: pendente = solicitado − separado (indisponibilidade entra na feature de ocorrências).
- Usuário atual via `x-user-id` temporário até a autenticação.

### Riscos abertos
- Códigos de unidade do legado não estão definidos na spec (allowlist de metro).
- Revenda com indisponibilidade ainda depende de validação do "pedido atendido".

---

## Feature 4 — Ocorrências

**Data**: 2026-10-07
**Requisitos**: RF005; RN003, RN012, RN013, RN023, RN032
**Artefatos**: `.specs/features/ocorrencias/{spec,design,tasks,validation}.md`

### Objetivo
Registrar perda (Corte e Dobra), refugo (Telhas) e indisponibilidade (Revenda) — mais pausa e parada — com motivo obrigatório por lista fechada, sem alterar o saldo de produção.

### Como foi feito
- **Specify**: 13 critérios EARS; `validate_spec.py` 0/0.
- **Design**: nova entidade `MotivoOcorrencia`; `Occurrence.motivoId`; perda/refugo não tocam o saldo.
- **Tasks**: 7 tarefas em 3 fases; `validate_tasks.py` 0 erros.
- **Execute**: 1 batch (T1–T7), commit atômico por tarefa.
- **Verify**: Verifier independente → **PASS** na primeira rodada.

### Resultado
- **7 tarefas** implementadas.
- **246 testes** passando. Cobertura de ocorrências 100% linhas/funções, 97% branches.
- **Verificação: PASS** — 13/13 ACs; 6/7 mutantes mortos (1 sobrevivente apenas no adapter, sancionado por AD-002). `validate_state.py`: 0 erros.

### Decisões e desvios
- Lista fechada via `MotivoOcorrencia`; sugestões iniciais de `docs/backlog/motivos-ocorrencia.md` (a validar com o Everton).
- Motivo obrigatório só para perda, refugo e indisponibilidade.
- Perda/refugo não alteram o saldo; indisponibilidade de Revenda fica sem efeito no saldo até validação.

### Riscos abertos
- Lista de motivos ainda não validada pelo cliente.
- Efeito da indisponibilidade no saldo de Revenda pendente de definição.

---

## Feature 5 — Disponibilidade e Entregas

**Data**: 2026-10-07
**Requisitos**: RF009, RF010, RF011; RN002, RN004, RN005
**Artefatos**: `.specs/features/disponibilidade-e-entregas/{spec,design,tasks,validation}.md`

### Objetivo
Calcular disponível = executado − entregue; registrar entrega total/parcial restrita a Expedição e Gerente; bloquear entrega acima do disponível com exceção autorizada pelo gerente e auditoria; expor saldo do pedido e histórico.

### Como foi feito
- **Specify**: 14 critérios EARS; `validate_spec.py` 0/0.
- **Design**: domínio `src/modules/expedicao/`; papéis de `UserRole`; status de entrega derivado.
- **Tasks**: 7 tarefas em 3 fases; `validate_tasks.py` 0 erros.
- **Execute**: 1 batch (T1–T7), commit atômico por tarefa.
- **Verify**: Verifier independente → **PASS** na primeira rodada.

### Resultado
- **7 tarefas** implementadas.
- **285 testes** passando. Cobertura 97,4% linhas / 94,4% branches.
- **Verificação: PASS** — 14/14 ACs; 6/7 mutantes mortos (1 sobrevivente apenas no adapter, AD-002). `validate_state.py`: 0 erros.

### Decisões e desvios
- Entrega acima do disponível bloqueada (`409`); exceção de gerente com motivo e `AuditLog`.
- Status de entrega derivado (parcial/concluído), sem novo campo.
- Saldo do pedido resolve `Order.id`.

### Riscos abertos
- Persistência da auditoria da exceção só será coberta por teste de integração quando houver MySQL.
- Indisponibilidade de Revenda ainda sem efeito no saldo.

---

## Feature 6 — Usuários, Perfis e Permissões

**Data**: 2026-10-07
**Requisitos**: RF013, RF014
**Artefatos**: `.specs/features/usuarios-e-permissoes/{spec,design,tasks,validation}.md`

### Objetivo
Autenticação com sessão, autorização no servidor pela matriz de perfis, gestão de usuários e substituição do cabeçalho temporário `x-user-id` pela sessão em todas as rotas.

### Como foi feito
- **Specify**: 16 critérios EARS; `validate_spec.py` 0/0.
- **Design**: sessão em cookie httpOnly assinado (HMAC); senha com `scrypt`; matriz de perfis; callback segue em token de serviço.
- **Tasks**: 15 tarefas em 5 fases + 5 de correção (T16–T20); `validate_tasks.py` 0 erros.
- **Execute**: 2 batches (T1–T8, T9–T15). A verificação reprovou o AUTH-14 (rotas restantes fora da sessão).
- **Verify**: iteração 1 = FAIL; correção T16–T20; iteração 2 = **PASS**.

### Resultado
- **20 tarefas** implementadas (15 + 5 correções).
- **360 testes** passando. Cobertura de domínio 96% linhas / 93% branches.
- **Verificação: PASS** — 16/16 ACs; 6/6 mutantes mortos; 20 rotas classificadas (18 na sessão, callback no token de serviço, health público).
- `validate_state.py`: 0 erros.

### Decisões e desvios
- `SESSION_SECRET` em variável de ambiente; cookie `3e_session` httpOnly.
- Matriz de perfis em `src/modules/usuarios/permissoes.ts`; Vendedor só consulta e prazo.
- A rota de execução e as demais passaram a usar `autorizar(request, acao)`.

### Riscos abertos
- Recuperação de senha, MFA e tela de login ficam para o frontend.
- Permissões ambíguas (classificação/importação) registradas como suposição.

---

## Feature 7 — Prazos e Alertas

**Data**: 2026-10-07
**Requisitos**: RF012
**Artefatos**: `.specs/features/prazos-e-alertas/{spec,design,tasks,validation}.md`

### Objetivo
Prazo opcional por item/setor (gerente ou vendedor), status `SEM_PRAZO`/`EM_DIA`/`ATRASADO` e lista de atividades atrasadas.

### Como foi feito
- **Specify**: 12 critérios EARS; `validate_spec.py` 0/0.
- **Design**: domínio `src/modules/prazos/`; prazo em `OrderItem.deadlineAt` e `Activity.deadlineAt`; status derivado.
- **Tasks**: 7 tarefas em 3 fases; `validate_tasks.py` 0 erros.
- **Execute**: 1 batch (T1–T7), commit atômico por tarefa.
- **Verify**: Verifier independente → **PASS** na primeira rodada.

### Resultado
- **7 tarefas** implementadas.
- **394 testes** passando. Cobertura 96% linhas / 93% branches.
- **Verificação: PASS** — 12/12 ACs; 6/6 mutantes mortos. `validate_state.py`: 0 erros.

### Decisões e desvios
- Sem prazo nunca é atrasado; atraso só com prazo ultrapassado e não concluído.
- `definir_prazo` restrito a gerente e vendedor (matriz existente).

### Riscos abertos
- Sem teste de rota com perfil Vendedor (coberto pela matriz de permissões) — observação menor.
- Notificações de alerta ficam fora do escopo (aqui é consulta).

---

## Feature 8 — Indicadores e Consulta

**Data**: 2026-10-07
**Requisitos**: RF006, RF008
**Artefatos**: `.specs/features/indicadores-e-consulta/{spec,design,tasks,validation}.md`

### Objetivo
Consulta de pedidos com filtros (vendedor e gerente), painel consolidado por setor/status e indicadores de PCP.

### Como foi feito
- **Specify**: 11 critérios EARS; `validate_spec.py` 0/0.
- **Design**: domínio `src/modules/indicadores/`; somente leitura; reusa o saldo da expedição.
- **Tasks**: 7 tarefas em 3 fases; `validate_tasks.py` 0 erros.
- **Execute**: 1 batch (T1–T7), commit atômico por tarefa.
- **Verify**: Verifier independente → **PASS** na primeira rodada.

### Resultado
- **7 tarefas** implementadas.
- **429 testes** passando. Cobertura 96,4% linhas / 93,5% branches.
- **Verificação: PASS** — 11/11 ACs com evidência; 6/6 mutantes mortos. `validate_state.py`: 0 erros.

### Lacunas de precisão registradas (follow-up)
- Paginação sem ordenação determinística e defaults não especificados (major).
- Momento de conclusão para cumprimento de prazo inferido da última execução; atividade `COMPLETED` sem execução pode ser contada como atrasada (major).
- Filtro de cliente e derivação de status do pedido sem definição na spec (minor).

### Riscos abertos
- Indicadores dependem de dados operacionais; revisar com volume real.

---

## Feature 9 — Frontend (Fundação e Chão de Fábrica)

**Data**: 2026-10-07
**Requisitos**: RF013 (login/perfil), RF003/RF004/RF005 (operador)
**Artefatos**: `.specs/features/frontend-fundacao/{spec,design,tasks,validation}.md`

### Objetivo
Design system responsivo (celular, tablet, notebook, desktop), shell por perfil, tela de login e a fatia do operador (fila, execução, ocorrência).

### Como foi feito
- **Specify**: 14 critérios EARS; `validate_spec.py` 0/0.
- **Design**: App Router + Tailwind/shadcn; componentes client consomem as APIs com a sessão.
- **Tasks**: 8 tarefas em 3 fases + 1 correção (T9); `validate_tasks.py` 0 erros.
- **Execute**: 1 batch (T1–T8). A verificação apontou um *fail-open* de perfil (major).
- **Verify**: iteração 1 = PASS com ressalva; correção T9; iteração 2 = **PASS**.

### Resultado
- **9 tarefas** implementadas (8 + 1 correção).
- **482 testes** passando. Cobertura 96,6% linhas / 93,8% branches.
- **Verificação: PASS** — 12/14 ACs com evidência; 7/7 mutantes mortos; fail-open fechado.
- `validate_state.py`: 0 erros.

### Decisões e desvios
- Perfil resolvido no servidor pelo repositório de usuários; sem perfil → redireciona ao login (sem fail-open).
- Testes de componente com Testing Library + jsdom; E2E (Playwright) deferido.

### Riscos abertos
- FE-06 (sem rolagem horizontal 360–1440 px) só verificável em navegador real; E2E fica para a feature de qualidade.
- FE-03 (operabilidade por teclado) coberto por rótulos/tipos, sem teste de Tab/Enter.
- Telas de gerente, vendedor, expedição e responsável ficam para a próxima feature.

---

## Feature 10 — Frontend (Telas dos Perfis)

**Data**: 2026-10-07
**Requisitos**: RF006, RF008, RF009/RF010, RF013/RF014
**Artefatos**: `.specs/features/frontend-perfis/{spec,design,tasks,validation}.md`

### Objetivo
Telas de gerente (painel/pedidos), vendedor (consulta/prazo), expedição (entregas) e responsável (usuários/setores), além da navegação por perfil e do redireciono pós-login.

### Como foi feito
- **Specify**: 13 critérios EARS; `validate_spec.py` 0/0.
- **Design**: reusa componentes/cliente/shell da feature 9; lista de pedidos compartilhada.
- **Tasks**: 10 tarefas em 6 fases; `validate_tasks.py` 0 erros.
- **Execute**: 2 batches (T1–T8, T9–T10), commit atômico por tarefa.
- **Verify**: Verifier independente → **PASS** na primeira rodada.

### Resultado
- **10 tarefas** implementadas.
- **543 testes** passando. Cobertura 96,6% linhas / 93,8% branches.
- **Verificação: PASS** — 13/13 ACs; 6/6 mutantes mortos. `validate_state.py`: 0 erros.

### Decisões e desvios
- Mapa perfil→rota único em `src/shared/ui/navegacao-perfil.ts`; `/api/auth/sessao` passou a devolver os perfis (guardado por sessão).
- Lista de pedidos e detalhe compartilhados entre gerente e vendedor.
- Filtro de setor por texto (a API de setores é restrita ao responsável).

### Decisão de produto pendente
- O gerente não tem o atalho para a fila de produção (antes tinha). A matriz permite `registrar_execucao` ao gerente; decidir se o atalho volta.

---

## Feature 11 — Qualidade e Fechamento

**Data**: 2026-10-07
**Requisitos**: qualidade (E2E, acessibilidade, precisão) e go-live
**Artefatos**: `.specs/features/qualidade-e-fechamento/{spec,design,tasks,validation}.md`

### Objetivo
E2E Playwright (login e responsividade), acessibilidade, fechamento das lacunas de precisão, atalho do gerente e documentação de go-live.

### Como foi feito
- **Specify**: 11 critérios EARS; `validate_spec.py` 0/0.
- **Design**: correções no domínio de indicadores, navegação, a11y, E2E e doc.
- **Tasks**: 7 tarefas em 4 fases; `validate_tasks.py` 0 erros.
- **Execute**: 1 batch (T1–T7), commit atômico por tarefa. Chromium instalado.
- **Verify**: Verifier independente → **PASS** na primeira rodada.

### Resultado
- **7 tarefas** implementadas.
- **568 testes unitários** + **14 E2E** passando. Cobertura 96,7% linhas / 93,9% branches.
- **Verificação: PASS** — 11/11 ACs; 6/6 mutantes mortos; viewport real verificado. `validate_state.py`: 0 erros.

### Decisões e desvios
- E2E em Chromium headless com API mockada (sem banco); viewports 360–1440 sem rolagem horizontal.
- `playwright.config.ts` em `localhost` (Next 16 bloqueia dev em `127.0.0.1`); `tests/e2e/**` excluído do Vitest.
- Fila devolvida ao gerente; ordenação determinística; prazo sem execução fora do indicador.

### Riscos abertos
- E2E de fluxos com banco depende de um MySQL de runtime.
- Go-live depende de Cloudflare/conector no ambiente do cliente (documentado em `docs/go-live.md`).

---

## Validação operacional contra a AWS (2026-10-07)

### Banco
- Schema do app criado na AWS: **`3e_operacoes`** (separado do legado). O **`topgerente` ficou intacto** (482 tabelas, somente leitura).
- Migration e seed aplicados: 3 setores, 9 motivos, 5 usuários (um por perfil).
- Conector lê `topgerente` e devolve por callback; o app grava em `3e_operacoes`.

### Importação real
- Pedido **70435** importado do `topgerente` para `3e_operacoes` (cliente "MARCO ANTONIO DE OLIVEIRA", 5 itens: 30/15/6/50/180).

### Fluxo operacional validado ponta a ponta
- **Reimportar** o 70435 (resync) → `SUCCEEDED`, **sem duplicar** (1 pedido, 5 itens).
- **Classificar** itens → atividades criadas (Telhas e Corte e Dobra).
- **Fila do operador** → 2 atividades.
- **Execução** 100 de 180 → `IN_PROGRESS`, pendente 80 (RN001: solicitado − executado).
- **Ocorrência** de perda 2 com motivo → registrada **sem alterar o saldo** (perda não reduz a obrigação).
- **Entrega** parcial 30 de 100 disponíveis → `PARCIAL` (RN002: disponível = executado − entregue).
- **Saldo do item**: solicitado 180, executado 100, disponível 70, entregue 30, pendente 80.
- **Indicadores**: painel por setor/status + produção por setor (Telhas 100) + cumprimento de prazo.

### Ajustes
- Timeout do despacho agora **configurável** (`CONNECTOR_TIMEOUT_MS`; padrão 5 s, usado 20 s para o RDS remoto).
- Conector passou a carregar `.env` local (`dotenv`).

### Riscos abertos
- Usar **usuário somente leitura** no `topgerente` (hoje é o `admin`) e **rotacionar a senha**.
- Callback após `CONNECTOR_TIMEOUT` ainda conclui o job (`FAILED` → `SUCCEEDED`); revisar a máquina de estados.

---

## Feature 12 — Refino Visual do Frontend

**Data**: 2026-10-07
**Requisitos**: qualidade visual/UX (referência `frontend-v4`)
**Artefatos**: `.specs/features/frontend-visual/{spec,design,tasks,validation}.md`

### Objetivo
Aproximar a interface da referência visual (`design/inspiracoes/frontend-v4/`), mantendo comportamento, responsividade e acessibilidade.

### Como foi feito
- **Specify**: 11 critérios EARS; `validate_spec.py` 0/0.
- **Design**: componentes `Metric`/`Badge`/`PageHead`, shell topbar+sidebar, login com hero.
- **Tasks**: 7 tarefas em 4 fases; `validate_tasks.py` 0 erros.
- **Execute**: 1 batch (T1–T7), commit atômico por tarefa.
- **Verify**: Verifier independente → **PASS** (comportamento inalterado).

### Resultado
- **7 tarefas** implementadas.
- **598 testes unitários + 24 E2E** passando.
- **Verificação: PASS** — 11/11 ACs; 5/5 mutantes mortos; APIs/contratos inalterados. `validate_state.py`: 0 erros.

### Decisões e desvios
- Shell com sidebar no desktop (≥768 px) e menu no celular; login com hero (≥780 px).
- Tabelas com rolagem interna; estado por texto + cor; foco visível.
- E2E cobre a superfície pública; a shell autenticada é coberta por testes de unidade (depende de sessão+banco).

### Riscos abertos
- Verificação geométrica pixel-a-pixel da shell autenticada depende de um E2E com banco.
