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
