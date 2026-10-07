# Frontend — Telas dos Perfis — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/frontend-perfis/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/testes.md`, `docs/frontend.md`, `AGENTS.md`, `vitest.config.ts`, `.github/workflows/ci.yml`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| UI component / page (`src/shared/ui/**`, `src/app/**/*.tsx`) | unit (Testing Library + jsdom) | Happy + edge (carregando/erro/vazio/403) + rótulos acessíveis | `src/**/*.test.tsx` | `npm test` |
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

### Phase 1: Gerente

```
T1
T2 -> T3
```

### Phase 2: Pedido e prazo

```
T4
```

### Phase 3: Vendedor

```
T5
```

### Phase 4: Expedição

```
T6
```

### Phase 5: Administração

```
T7
T8
```

### Phase 6: Navegação

```
T9 -> T10
```

---

## Task Breakdown

### Phase 1: Gerente

#### T1: Painel do gerente

**What**: Página do painel com contagens por setor/status, pendências e indicadores.
**Where**: `src/app/(app)/gerente/painel/page.tsx`
**Depends on**: None
**Reuses**: Cliente de API e componentes base (feature 9).
**Requirement**: FEP-01, FEP-02, FEP-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `frontend-blueprint`, `accessibility`

**Done when**:

- [x] Mostra contagem por setor/status e pendências
- [x] Mostra produção por setor e cumprimento de prazo
- [x] Trata carregando e erro
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona painel do gerente`

---

#### T2: Lista de pedidos compartilhada

**What**: Componente de lista de pedidos com filtros.
**Where**: `src/shared/ui/pedidos-lista.tsx`
**Depends on**: None
**Reuses**: Cliente de API, componentes base.
**Requirement**: FEP-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `accessibility`

**Done when**:

- [x] Filtros de cliente, setor, status e período
- [x] Estados de carregando, vazio e erro
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona lista de pedidos`

---

#### T3: Página de pedidos do gerente

**What**: Página do gerente que usa a lista de pedidos.
**Where**: `src/app/(app)/gerente/pedidos/page.tsx`
**Depends on**: T2
**Reuses**: `pedidos-lista` (T2).
**Requirement**: FEP-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `accessibility`

**Done when**:

- [ ] Renderiza a lista e navega para o detalhe
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona pedidos do gerente`

---

### Phase 2: Pedido e prazo

#### T4: Detalhe do pedido com prazo

**What**: Página de detalhe com os cinco valores por item e definição de prazo.
**Where**: `src/app/(app)/gerente/pedidos/[orderId]/page.tsx`
**Depends on**: T2
**Reuses**: Cliente de API (T2).
**Requirement**: FEP-04, FEP-05, FEP-12

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `accessibility`

**Done when**:

- [ ] Mostra solicitado, executado, disponível, entregue e pendente por item
- [ ] Define prazo e reflete o status
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona detalhe do pedido e prazo`

---

### Phase 3: Vendedor

#### T5: Consulta do vendedor

**What**: Página do vendedor com consulta de pedidos e definição de prazo.
**Where**: `src/app/(app)/vendedor/pedidos/page.tsx`
**Depends on**: T2, T4
**Reuses**: `pedidos-lista` (T2), detalhe/prazo (T4).
**Requirement**: FEP-03, FEP-04, FEP-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `accessibility`

**Done when**:

- [ ] Consulta todos os pedidos, somente leitura de produção
- [ ] Permite definir prazo
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona consulta do vendedor`

---

### Phase 4: Expedição

#### T6: Entregas da expedição

**What**: Página com itens disponíveis e registro de entrega com exceção.
**Where**: `src/app/(app)/expedicao/entregas/page.tsx`
**Depends on**: None
**Reuses**: Cliente de API, componentes base.
**Requirement**: FEP-06, FEP-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `accessibility`

**Done when**:

- [ ] Registra entrega dentro do disponível e atualiza o saldo
- [ ] Exige gerente e motivo quando excede o disponível
- [ ] Test count: 7 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona entregas da expedicao`

---

### Phase 5: Administração

#### T7: Administração de usuários

**What**: Página de usuários com criação e associação de perfis e setores.
**Where**: `src/app/(app)/admin/usuarios/page.tsx`
**Depends on**: None
**Reuses**: Cliente de API, componentes base.
**Requirement**: FEP-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`, `accessibility`

**Done when**:

- [ ] Cria usuário com perfis e setores
- [ ] Trata conflito de e-mail e sem permissão
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona administracao de usuarios`

---

#### T8: Administração de setores e mapeamentos

**What**: Página de setores e mapeamentos categoria → setor.
**Where**: `src/app/(app)/admin/setores/page.tsx`
**Depends on**: None
**Reuses**: Cliente de API, componentes base.
**Requirement**: FEP-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `dominio-3e`, `accessibility`

**Done when**:

- [ ] Cria e lista setores
- [ ] Cria e altera mapeamentos
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): adiciona setores e mapeamentos`

---

### Phase 6: Navegação

#### T9: Navegação por perfil no shell

**What**: Estender o shell para a navegação de todos os perfis.
**Where**: `src/shared/ui/app-shell.tsx`
**Depends on**: None
**Reuses**: Shell da feature 9.
**Requirement**: FEP-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `accessibility`

**Done when**:

- [ ] Cada perfil vê apenas as rotas do seu escopo
- [ ] Menu acessível no celular
- [ ] Test count: 6 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): navegacao por perfil`

---

#### T10: Redireciono pós-login por perfil

**What**: Após o login, navegar para a tela inicial do perfil.
**Where**: `src/app/login/page.tsx`
**Depends on**: T9
**Reuses**: Mapa perfil→rota (T9).
**Requirement**: FEP-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `accessibility`

**Done when**:

- [ ] Gerente cai no painel; vendedor na consulta; operador na fila
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): redireciona pos-login por perfil`

---

## Phase Execution Map

```
Phase 1: T1
Phase 1: T2 -> T3
Phase 2: T4
Phase 3: T5
Phase 4: T6
Phase 5: T7
Phase 5: T8
Phase 6: T9 -> T10
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: painel | 1 página | ✅ Granular |
| T2: lista | 1 componente | ✅ Granular |
| T3: pedidos gerente | 1 página | ✅ Granular |
| T4: detalhe | 1 página | ✅ Granular |
| T5: vendedor | 1 página | ✅ Granular |
| T6: entregas | 1 página | ✅ Granular |
| T7: usuários | 1 página | ✅ Granular |
| T8: setores | 1 página | ✅ Granular |
| T9: shell | 1 componente | ✅ Granular |
| T10: login | 1 página | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T10 | T9 | T9 -> T10 | ✅ Match |
| T4 | T2 | (cross-phase) | ✅ Match |
| T5 | T2, T4 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1–T10 | UI component / page | unit | unit | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
