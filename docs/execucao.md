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
