# Frontend — Fundação e Chão de Fábrica — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/frontend-fundacao/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/testes.md`, `docs/frontend.md`, `AGENTS.md`, `vitest.config.ts`, `.github/workflows/ci.yml`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| UI component / page (`src/shared/ui/**`, `src/app/**/*.tsx`) | unit (Testing Library + jsdom) | Happy + edge (carregando/erro/vazio) + rótulos acessíveis | `src/**/*.test.tsx` | `npm test` |
| Client data (`src/shared/http/**`) | unit | Ramos + caminhos de erro | `src/shared/**/*.test.ts` | `npm test` |
| Styles / config | none | Build gate only | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks só com testes unitários | `npm test` |
| Full | Após tasks com testes de integração (rotas) | `npm run lint && npm run typecheck && npm test` |
| Build | Após tasks de estilo/config e no fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

### Phase 1: Foundation

```
T1
T2 -> T4
T3 -> T4
```

### Phase 2: Shell

```
T5
```

### Phase 3: Operator

```
T6
T8 -> T7
```

---

## Task Breakdown

### Phase 1: Foundation

#### T1: Design tokens e estilos globais

**What**: Definir tokens de cor, espaçamento e tipografia no CSS global, mobile-first.
**Where**: `src/app/globals.css`
**Depends on**: None
**Reuses**: Tailwind instalado.
**Requirement**: FE-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Tokens de cor e tipografia definidos
- [x] Contraste adequado (WCAG AA)
- [x] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(frontend): define design tokens`

---

#### T2: Componentes base de UI

**What**: Criar Button, Input, Field, Card, Badge, Spinner, EmptyState e Alert.
**Where**: `src/shared/ui/`
**Depends on**: None
**Reuses**: `cn`, `components.json`.
**Requirement**: FE-03, FE-08, FE-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Componentes com alvos de toque grandes e foco visível
- [x] Rótulos acessíveis nos campos
- [x] Test count: 8 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona componentes base`

---

#### T3: Cliente de API

**What**: Criar `apiGet`/`apiPost`/`apiPatch` com credenciais e tratamento de erro/401.
**Where**: `src/shared/http/api-client.ts`
**Depends on**: None
**Reuses**: APIs existentes.
**Requirement**: FE-13, FE-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Envia cookies e trata `401` e falhas
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona cliente de api`

---

#### T4: Tela de login

**What**: Página de login acessível que autentica e navega para a tela do perfil.
**Where**: `src/app/login/page.tsx`
**Depends on**: T2, T3
**Reuses**: Componentes base (T2), cliente (T3).
**Requirement**: FE-01, FE-02, FE-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `accessibility`

**Done when**:

- [x] Credenciais válidas navegam; inválidas mostram erro acessível
- [x] Formulário funciona por teclado
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona tela de login`

---

### Phase 2: Shell

#### T5: Shell responsivo e navegação por perfil

**What**: Layout com cabeçalho e navegação conforme o perfil, com menu acessível no celular.
**Where**: `src/shared/ui/app-shell.tsx`
**Depends on**: T2, T3
**Reuses**: Componentes base (T2).
**Requirement**: FE-04, FE-05, FE-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Navegação conforme o perfil
- [x] Menu acessível em 360 px; sem rolagem horizontal até 1440 px
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona shell responsivo`

---

### Phase 3: Operator

#### T6: Tela da fila do operador

**What**: Página que lista as atividades dos setores do usuário com estados de carregando, vazio e erro.
**Where**: `src/app/(app)/operador/fila/page.tsx`
**Depends on**: T3
**Reuses**: Cliente de API (T3).
**Requirement**: FE-07, FE-08, FE-13, FE-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Lista as atividades ou mostra estado vazio
- [x] Trata carregando e erro
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona fila do operador`

---

#### T7: Página de execução da atividade

**What**: Página da atividade com o formulário de registro de execução.
**Where**: `src/app/(app)/operador/atividades/[id]/page.tsx`
**Depends on**: T3, T8
**Reuses**: Cliente de API (T3), formulário de ocorrência (T8).
**Requirement**: FE-09, FE-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `accessibility`

**Done when**:

- [x] Registrar quantidade atualiza a lista
- [x] Quantidade inválida mostra mensagem sem registrar
- [x] Campo numérico no celular
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona execucao da atividade`

---

#### T8: Formulário de ocorrência

**What**: Componente de registro de ocorrência com motivo da lista fechada.
**Where**: `src/shared/ui/ocorrencia-form.tsx`
**Depends on**: T2, T3
**Reuses**: Componentes base (T2), cliente (T3).
**Requirement**: FE-11, FE-12

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`, `accessibility`

**Done when**:

- [x] Motivo obrigatório para perda, refugo e indisponibilidade
- [x] Motivos vêm da API
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona formulario de ocorrencia`

---

## Phase Execution Map

```
Phase 1: T1
Phase 1: T2 -> T4
Phase 1: T3 -> T4
Phase 2: T5
Phase 3: T6
Phase 3: T8 -> T7
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: tokens | 1 arquivo | ✅ Granular |
| T2: componentes | 1 módulo de UI | ✅ Granular |
| T3: cliente | 1 módulo | ✅ Granular |
| T4: login | 1 página | ✅ Granular |
| T5: shell | 1 componente | ✅ Granular |
| T6: fila | 1 página | ✅ Granular |
| T7: execução | 1 página | ✅ Granular |
| T8: ocorrência | 1 componente | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T4 | T2, T3 | T2 -> T4, T3 -> T4 | ✅ Match |
| T7 | T3, T8 | T8 -> T7 | ✅ Match |
| T5 | T2, T3 | (cross-phase) | ✅ Match |
| T6 | T3 | (cross-phase) | ✅ Match |
| T8 | T2, T3 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Styles / config | none | none | ✅ OK |
| T2 | UI component | unit | unit | ✅ OK |
| T3 | Client data | unit | unit | ✅ OK |
| T4 | UI page | unit | unit | ✅ OK |
| T5 | UI component | unit | unit | ✅ OK |
| T6 | UI page | unit | unit | ✅ OK |
| T7 | UI page | unit | unit | ✅ OK |
| T8 | UI component | unit | unit | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
