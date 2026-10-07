# Usuários, Perfis e Permissões — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/usuarios-e-permissoes/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/testes.md`, `AGENTS.md`, `vitest.config.ts`, `.github/workflows/ci.yml`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain / use case (`src/modules/**`) | unit | Todos os ramos; 1:1 com os ACs; todos os edge cases | `src/modules/**/*.test.ts` | `npm test` |
| Shared utility (`src/shared/**`) | unit | Ramos + caminhos de erro | `src/shared/**/*.test.ts` | `npm test` |
| Route handler (`src/app/api/**`) | integration | Cada rota: happy + edge + erro | `src/app/api/**/*.test.ts` | `npm test` |
| Repository adapter (Prisma) | none | Build gate only; domínio com fakes (AD-002) | - | build gate only |
| Entity / schema / config | none | Build gate only | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks só com testes unitários | `npm test` |
| Full | Após tasks com testes de integração (rotas) | `npm run lint && npm run typecheck && npm test` |
| Build | Após tasks de repositório/config e no fim de fase | `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build` |

---

## Execution Plan

### Phase 1: Auth core

```
T1 -> T3
T2 -> T3
T2 -> T4
```

### Phase 2: Users and permissions

```
T5 -> T6
```

### Phase 3: Adapters

```
T7
T8
```

### Phase 4: Routes

```
T9
T10
T11
T12
```

### Phase 5: Hardening

```
T13
T14
T15
```

---

## Task Breakdown

### Phase 1: Auth core

#### T1: Hash de senha

**What**: Gerar e verificar hash de senha com `scrypt`.
**Where**: `src/modules/auth/senha.ts`
**Depends on**: None
**Reuses**: `node:crypto`.
**Requirement**: AUTH-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] Hash diferente para a mesma senha (sal)
- [x] Verificação correta e incorreta
- [x] Test count: 4 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): adiciona hash de senha`

---

#### T2: Token de sessão

**What**: Assinar e verificar o token de sessão (HMAC) com expiração.
**Where**: `src/modules/auth/sessao.ts`
**Depends on**: None
**Reuses**: `node:crypto`, `SESSION_SECRET`.
**Requirement**: AUTH-06, AUTH-16

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] Token válido verifica e retorna o usuário
- [x] Token adulterado ou expirado é rejeitado
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): assina e verifica sessao`

---

#### T3: Autenticação

**What**: Validar credenciais e emitir sessão.
**Where**: `src/modules/auth/autenticar.ts`
**Depends on**: T1, T2
**Reuses**: `senha` (T1), `sessao` (T2).
**Requirement**: AUTH-01, AUTH-02, AUTH-15

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] Credenciais válidas emitem sessão
- [x] Credenciais inválidas e usuário inativo retornam erro de autenticação
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): autentica usuario`

---

#### T4: Contexto de autenticação

**What**: Ler a sessão da requisição e aplicar a matriz de perfis.
**Where**: `src/shared/http/auth-context.ts`
**Depends on**: T2
**Reuses**: `sessao` (T2), `permissoes` (T5 na fase 2 — interface).
**Requirement**: AUTH-04, AUTH-07, AUTH-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] Sem sessão → não autorizado
- [x] Sessão válida expõe o usuário
- [x] Ação sem perfil → proibido
- [x] Test count: 5 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(shared): contexto de autenticacao`

---

### Phase 2: Users and permissions

#### T5: Matriz de permissões

**What**: Implementar `pode(perfis, acao)` conforme `docs/perfis-permissoes.md`.
**Where**: `src/modules/usuarios/permissoes.ts`
**Depends on**: None
**Reuses**: `RoleCode` do Prisma.
**Requirement**: AUTH-08, AUTH-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`, `dominio-3e`

**Done when**:

- [x] Vendedor só pode consultar
- [x] Operador executa/ocorrência; Gerente faz o resto da produção
- [x] Expedição registra entrega; só Gerente autoriza exceção
- [x] Test count: 9 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(usuarios): adiciona matriz de permissoes`

---

#### T6: Gestão de usuários

**What**: Criar, atualizar e inativar usuários, com perfis e setores N:N.
**Where**: `src/modules/usuarios/gerenciar-usuarios.ts`
**Depends on**: T1, T5
**Reuses**: `senha` (T1).
**Requirement**: AUTH-10, AUTH-11, AUTH-12, AUTH-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] Senha persistida como hash
- [x] Email duplicado rejeitado
- [x] Perfis e setores N:N persistidos
- [x] Usuário inativo não loga
- [x] Test count: 8 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(usuarios): gerencia usuarios`

---

### Phase 3: Adapters

#### T7: Repositório Prisma de autenticação

**What**: Buscar usuário por email com perfis e status.
**Where**: `src/modules/auth/adapters/prisma-auth-repository.ts`
**Depends on**: T3
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: AUTH-01

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Busca por email com perfis
- [x] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(auth): repositorio prisma de autenticacao`

---

#### T8: Repositório Prisma de usuários

**What**: Implementar `UsuariosRepository` (CRUD, perfis, setores).
**Where**: `src/modules/usuarios/adapters/prisma-usuarios-repository.ts`
**Depends on**: T6
**Reuses**: `src/shared/db/prisma.ts`.
**Requirement**: AUTH-10, AUTH-12, AUTH-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] CRUD e associações N:N
- [x] Gate check passa: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(usuarios): repositorio prisma de usuarios`

---

### Phase 4: Routes

#### T9: Rota de login

**What**: Expor `POST /api/auth/login` com cookie de sessão.
**Where**: `src/app/api/auth/login/route.ts`
**Depends on**: T3, T4, T7
**Reuses**: Caso de uso (T3), repositório (T7).
**Requirement**: AUTH-01, AUTH-02, AUTH-06, AUTH-15

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] Credenciais válidas respondem `200` e setam cookie httpOnly
- [x] Credenciais inválidas respondem `401`
- [x] Test count: 5 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de login`

---

#### T10: Rota de sessão (me e logout)

**What**: Expor `GET`/`DELETE /api/auth/sessao`.
**Where**: `src/app/api/auth/sessao/route.ts`
**Depends on**: T4, T7
**Reuses**: Contexto (T4).
**Requirement**: AUTH-03, AUTH-04, AUTH-16

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] `GET` retorna o usuário da sessão; sem sessão `401`
- [x] `DELETE` encerra a sessão
- [x] Test count: 5 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rota de sessao`

---

#### T11: Rotas de usuários

**What**: Expor `GET`/`POST /api/usuarios`.
**Where**: `src/app/api/usuarios/route.ts`
**Depends on**: T5, T6, T8
**Reuses**: Casos de uso (T6), repositório (T8), matriz (T5).
**Requirement**: AUTH-07, AUTH-10, AUTH-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] Criar responde `201`; email duplicado `409`
- [x] Sem perfil `403`; sem sessão `401`
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): rotas de usuarios`

---

#### T12: Rota de atualização de usuário

**What**: Expor `PATCH /api/usuarios/[id]` (perfis, setores, status).
**Where**: `src/app/api/usuarios/[id]/route.ts`
**Depends on**: T6, T8
**Reuses**: Caso de uso (T6), repositório (T8).
**Requirement**: AUTH-12, AUTH-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [x] Atualização responde `200`; inexistente `404`
- [x] Inativar impede login
- [x] Test count: 6 testes passam (sem remoções silenciosas)
- [x] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): atualiza usuario`

---

### Phase 5: Hardening

#### T13: Sessão nas rotas de produção

**What**: Trocar `x-user-id` pela sessão nas rotas de produção.
**Where**: `src/app/api/producao/atividades/route.ts`
**Depends on**: T4, T5
**Reuses**: Contexto (T4), matriz (T5).
**Requirement**: AUTH-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [ ] Sem sessão `401`; sem perfil `403`
- [ ] Usa o usuário da sessão
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `refactor(api): usa sessao nas rotas de producao`

---

#### T14: Sessão nas rotas de ocorrências

**What**: Trocar `x-user-id` pela sessão nas rotas de ocorrências.
**Where**: `src/app/api/producao/atividades/[id]/ocorrencias/route.ts`
**Depends on**: T4, T5
**Reuses**: Contexto (T4), matriz (T5).
**Requirement**: AUTH-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [ ] Sem sessão `401`; sem perfil `403`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `refactor(api): usa sessao nas rotas de ocorrencias`

---

#### T15: Sessão nas rotas de entregas

**What**: Trocar `x-user-id` pela sessão nas rotas de entregas.
**Where**: `src/app/api/pedidos/itens/[itemId]/entregas/route.ts`
**Depends on**: T4, T5
**Reuses**: Contexto (T4), matriz (T5).
**Requirement**: AUTH-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`, `seguranca-3e`

**Done when**:

- [ ] Sem sessão `401`; sem perfil `403`
- [ ] Test count: 5 testes passam (sem remoções silenciosas)
- [ ] Gate check passa: `npm run lint && npm run typecheck && npm test`

**Tests**: integration
**Gate**: full

**Commit**: `refactor(api): usa sessao nas rotas de entregas`

---

## Phase Execution Map

```
Phase 1: T1 -> T3
Phase 1: T2 -> T3
Phase 1: T2 -> T4
Phase 2: T5 -> T6
Phase 3: T7
Phase 3: T8
Phase 4: T9
Phase 4: T10
Phase 4: T11
Phase 4: T12
Phase 5: T13
Phase 5: T14
Phase 5: T15
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: senha | 1 módulo | ✅ Granular |
| T2: sessão | 1 módulo | ✅ Granular |
| T3: autenticar | 1 caso de uso | ✅ Granular |
| T4: contexto | 1 helper | ✅ Granular |
| T5: permissões | 1 módulo | ✅ Granular |
| T6: usuários | 1 caso de uso | ✅ Granular |
| T7–T8: repos | 1 adapter cada | ✅ Granular |
| T9–T12: rotas | 1 rota cada | ✅ Granular |
| T13–T15: hardening | 1 rota cada | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T3 | T1, T2 | T1 -> T3, T2 -> T3 | ✅ Match |
| T4 | T2 | T2 -> T4 | ✅ Match |
| T6 | T1, T5 | T5 -> T6 | ✅ Match (intra-fase) |
| T7 | T3 | (cross-phase) | ✅ Match |
| T8 | T6 | (cross-phase) | ✅ Match |
| T9 | T3, T4, T7 | (cross-phase) | ✅ Match |
| T10 | T4, T7 | (cross-phase) | ✅ Match |
| T11 | T5, T6, T8 | (cross-phase) | ✅ Match |
| T12 | T6, T8 | (cross-phase) | ✅ Match |
| T13–T15 | T4, T5 | (cross-phase) | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1–T6 | Domain / shared | unit | unit | ✅ OK |
| T7–T8 | Repository adapter | none | none | ✅ OK |
| T9–T15 | Route handler | integration | integration | ✅ OK |

---

## Task Verification Standards

Every task follows `Done when` + `Tests` + `Gate`. Each `Done when` entry is specific, binary, and references the gate command. Test counts prevent silent deletions.
