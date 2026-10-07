# Qualidade e Fechamento — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/qualidade-e-fechamento/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/testes.md`, `docs/frontend.md`, `AGENTS.md`, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain / use case (`src/modules/**`) | unit | Todos os ramos; 1:1 com os ACs | `src/modules/**/*.test.ts` | `npm test` |
| UI component (`src/shared/ui/**`) | unit (Testing Library + jsdom) | Happy + edge + rótulos acessíveis | `src/**/*.test.tsx` | `npm test` |
| E2E (login/responsividade) | e2e (Playwright) | Login válido/inválido + viewports sem rolagem horizontal | `tests/e2e/**/*.spec.ts` | `npm run test:e2e` |
| Docs | none | Build gate only | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks só com testes unitários | `npm test` |
| Full | Após tasks com testes de integração (rotas) | `npm run lint && npm run typecheck && npm test` |
| E2E | Após tasks com testes de navegador | `npm run test:e2e` |
| Build | Após tasks de doc/config e no fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

### Phase 1: Precisão

```
T1
T2
T3
```

### Phase 2: Navegação

```
T4
```

### Phase 3: Qualidade

```
T5 -> T6
```

### Phase 4: Documentação

```
T7
```

---

## Task Breakdown

### Phase 1: Precisão

#### T1: Ordenação determinística na consulta de pedidos

**What**: Garantir ordenação determinística e limites padrão na lista de pedidos.
**Where**: `src/modules/indicadores/consulta-pedidos.ts`
**Depends on**: None
**Reuses**: `IndicadoresRepository`.
**Requirement**: QF-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Ordem determinística por criação
- [x] Limites padrão aplicados e documentados
- [x] Test count: 5 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `fix(indicadores): ordena a consulta de pedidos`

---

#### T2: Momento de conclusão no cumprimento de prazo

**What**: Atividade sem execução não conta como atrasada no indicador de prazo.
**Where**: `src/modules/indicadores/pcp.ts`
**Depends on**: None
**Reuses**: `IndicadoresRepository`.
**Requirement**: QF-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`

**Done when**:

- [x] Concluída com prazo e execução usa a última execução
- [x] Concluída sem execução fica fora do indicador
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `fix(indicadores): corrige conclusao no indicador de prazo`

---

#### T3: Documentar o filtro de cliente

**What**: Tornar o filtro de cliente explícito e testado (substring, sem diferenciar maiúsculas).
**Where**: `src/shared/ui/pedidos-lista.tsx`
**Depends on**: None
**Reuses**: Cliente de API.
**Requirement**: QF-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Filtro envia o cliente como substring
- [x] Test count: 4 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `fix(frontend): documenta o filtro de cliente`

---

### Phase 2: Navegação

#### T4: Devolver a fila ao gerente

**What**: Incluir a fila de produção na navegação do gerente.
**Where**: `src/shared/ui/navegacao-perfil.ts`
**Depends on**: None
**Reuses**: Mapa perfil→rota.
**Requirement**: QF-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Gerente vê a fila de produção
- [ ] Test count: 4 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `fix(frontend): devolve a fila ao gerente`

---

### Phase 3: Qualidade

#### T5: Ajustes de acessibilidade

**What**: Corrigir rótulos, foco visível, `role="alert"` e estados não dependentes de cor nos componentes-chave.
**Where**: `src/shared/ui/`
**Depends on**: None
**Reuses**: Componentes existentes.
**Requirement**: QF-04, QF-05, QF-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `accessibility`

**Done when**:

- [ ] Rótulos associados e foco visível
- [ ] Erros com `role="alert"`
- [ ] Estado não depende só de cor
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `fix(frontend): melhora a acessibilidade dos componentes`

---

#### T6: E2E de login e responsividade

**What**: Testes Playwright do login e da ausência de rolagem horizontal em 360–1440 px.
**Where**: `tests/e2e/login.spec.ts`
**Depends on**: T5
**Reuses**: `playwright.config.ts`.
**Requirement**: QF-01, QF-02, QF-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `playwright-skill`, `accessibility`

**Done when**:

- [ ] Login válido navega; inválido mostra erro (API mockada)
- [ ] 360/768/1024/1440 px sem rolagem horizontal
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run test:e2e`

**Tests**: e2e
**Gate**: e2e

**Commit**: `test(e2e): cobre login e responsividade`

---

### Phase 4: Documentação

#### T7: Documento de go-live

**What**: Documentar Cloudflare Tunnel/Access, o conector no cliente e a troca AWS → Top Gerente real.
**Where**: `docs/go-live.md`
**Depends on**: None
**Reuses**: `docs/arquitetura.md`, `docs/integracao-top-gerente.md`, ADR 0001.
**Requirement**: QF-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `integracao-top-gerente`, `seguranca-3e`

**Done when**:

- [ ] Passos de Cloudflare, conector e troca de fonte descritos
- [ ] Sem credenciais no documento
- [ ] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `docs: adiciona guia de go-live`

---

## Phase Execution Map

```
Phase 1: T1
Phase 1: T2
Phase 1: T3
Phase 2: T4
Phase 3: T5 -> T6
Phase 4: T7
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: ordenação | 1 arquivo | ✅ Granular |
| T2: prazo | 1 arquivo | ✅ Granular |
| T3: filtro | 1 componente | ✅ Granular |
| T4: navegação | 1 arquivo | ✅ Granular |
| T5: a11y | ajustes em UI | ⚠️ Coeso |
| T6: E2E | 1 spec | ✅ Granular |
| T7: doc | 1 arquivo | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T6 | T5 | T5 -> T6 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1, T2 | Domain | unit | unit | ✅ OK |
| T3, T4, T5 | UI component | unit | unit | ✅ OK |
| T6 | E2E | e2e | e2e | ✅ OK |
| T7 | Docs | none | none | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
