# Usuários, Perfis e Permissões — Validation (iteration 2)

**Date**: 2026-10-07
**Spec**: `.specs/features/usuarios-e-permissoes/spec.md`
**Diff range**: `9aaef6a..28d54fd` (feature commits `53c4432` … `28d54fd`; hardening fixes `76899a5`, `428f9c9`, `67b0a91`, `053a828`, `8d7ecc4`, `28d54fd`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: ✅ PASS — AUTH-14 now fully met. Every user route uses the session; `/api/integracao/callback` keeps the service token; `/api/health` stays public. 16/16 ACs matched.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T12 | ✅ Done | Auth core, users/permissions, adapters, auth/user routes (unchanged) |
| T13 produção (fila) | ✅ Done | `/producao/atividades` on session |
| T14 ocorrências | ✅ Done | `.../[id]/ocorrencias` on session |
| T15 entregas | ✅ Done | `.../entregas` on session |
| T16 execução | ✅ Done | `.../[id]/execucoes` on session, `x-user-id` removed (`76899a5`) |
| T17 ordem/prioridade | ✅ Done | `.../[id]/ordem`, `.../[id]/prioridade` on session (`428f9c9`) |
| T18 saldo/classificação | ✅ Done | `.../saldo`, `.../classificar` on session (`67b0a91`) |
| T19 setores/motivos/mapeamentos | ✅ Done | all three on session (`053a828`) |
| T20 integração | ✅ Done | `integracao/pedidos` + `[jobId]` + `reprocessar` on session; callback keeps service token (`8d7ecc4`) |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AUTH-01 valid credentials → session + `200` | `200`, session created | `src/app/api/auth/login/route.test.ts:85` `expect(response.status).toBe(200)`; `:94` `verificarSessao(tokenDoCookie(response))?.userId` = `user_1`; unit `src/modules/auth/autenticar.test.ts:58` | ✅ PASS |
| AUTH-02 invalid credentials → `401` | `401` | `src/app/api/auth/login/route.test.ts:102` `toBe(401)`, `:110` `toBe(401)`; unit `src/modules/auth/autenticar.test.ts:74,80` | ✅ PASS |
| AUTH-03 logout → session invalidated | `200` + expired cookie, later request `401` | `src/app/api/auth/sessao/route.test.ts:58` `toBe(200)`, `:61` `Max-Age=0`, `:71` `toBe(401)` | ✅ PASS |
| AUTH-04 absent/expired session → `401` on protected routes | `401` | `src/app/api/auth/sessao/route.test.ts:44`; `src/app/api/usuarios/route.test.ts:183`; `src/app/api/producao/atividades/route.test.ts:174`; `.../[id]/execucoes/route.test.ts:196`; `.../[id]/ordem/route.test.ts:133`; `.../[id]/prioridade/route.test.ts:136`; `.../[id]/ocorrencias/route.test.ts:313`; `src/app/api/pedidos/[orderId]/saldo/route.test.ts:154`; `.../itens/[itemId]/classificar/route.test.ts:255`; `.../entregas/route.test.ts:287`; `src/app/api/setores/route.test.ts:155`; `src/app/api/motivos/route.test.ts:102`; `src/app/api/mapeamentos/route.test.ts:197,205,216`; `src/app/api/integracao/pedidos/route.test.ts:194`; `.../[jobId]/route.test.ts:135`; `.../[jobId]/reprocessar/route.test.ts:197` | ✅ PASS |
| AUTH-05 password stored only as hash | salted `scrypt`, no plaintext | `src/modules/auth/senha.test.ts:9` (salt), `:15-17` (not plaintext); `src/modules/usuarios/gerenciar-usuarios.test.ts:121-123`; `src/app/api/usuarios/route.test.ts:156-157` | ✅ PASS |
| AUTH-06 session in httpOnly cookie | `HttpOnly` attribute | `src/shared/http/auth-context.ts:43,48` `serializarCookieSessao`; `src/app/api/auth/login/route.test.ts:88` `toContain('HttpOnly')`, `:89` `Path=/`, `:90` `SameSite=Lax` | ✅ PASS |
| AUTH-07 action without allowed profile → `403` | `403` | `src/app/api/usuarios/route.test.ts:193,199`; `src/app/api/usuarios/[id]/route.test.ts:239`; `src/app/api/producao/atividades/route.test.ts:184`; `.../[id]/execucoes/route.test.ts:234`; `.../[id]/ordem/route.test.ts:149`; `.../[id]/prioridade/route.test.ts:160`; `.../[id]/ocorrencias/route.test.ts:306`; `.../saldo/route.test.ts:169`; `.../classificar/route.test.ts:281`; `.../entregas/route.test.ts:239`; `src/app/api/setores/route.test.ts:165`; `src/app/api/mapeamentos/route.test.ts:230`; `src/app/api/integracao/pedidos/route.test.ts:205`; `.../[jobId]/reprocessar/route.test.ts:208`; unit `src/shared/http/auth-context.test.ts:78` | ✅ PASS |
| AUTH-08 matrix enforced server-side | roles loaded from DB, matrix decides | `src/modules/usuarios/permissoes.ts:46-49` `pode`; `src/shared/http/autorizacao.ts:13-19` `depsAutorizacao` loads `findById().roles`; `src/modules/usuarios/permissoes.test.ts:5-68` | ✅ PASS |
| AUTH-09 Vendedor restricted | consult + `definir_prazo` only; no execution/delivery | `src/modules/usuarios/permissoes.test.ts:12` `pode(['SELLER'],'consultar_pedidos')` true, `:13` `definir_prazo` true, `:14` `registrar_execucao` false, `:15` `registrar_entrega` false; route `403`: `producao/atividades/route.test.ts:184`, `entregas/route.test.ts:239`, `setores/route.test.ts:165`, `integracao/pedidos/route.test.ts:205` | ✅ PASS |
| AUTH-10 create user → persist hashed password | hashed `passwordHash`, `201` | `src/app/api/usuarios/route.test.ts:149` `toBe(201)`, `:155-157`; unit `src/modules/usuarios/gerenciar-usuarios.test.ts:111-123` | ✅ PASS |
| AUTH-11 duplicate email → conflict | `409` | `src/app/api/usuarios/route.test.ts:169` `toBe(409)`, `:170` `email_already_exists`; unit `src/modules/usuarios/gerenciar-usuarios.test.ts:129-131` | ✅ PASS |
| AUTH-12 associate sectors/profiles → N:N persisted | roles + sectorIds persisted | `src/app/api/usuarios/route.test.ts:152-153`; `src/app/api/usuarios/[id]/route.test.ts:191-192`; unit `src/modules/usuarios/gerenciar-usuarios.test.ts:148-149` | ✅ PASS |
| AUTH-13 deactivate user → login blocked | `INACTIVE`, login `401` | `src/app/api/usuarios/[id]/route.test.ts:198` `INACTIVE`, `:215-222` login `401`; unit `src/modules/usuarios/gerenciar-usuarios.test.ts:198,202-218` | ✅ PASS |
| AUTH-14 production/occurrence/delivery + all user routes use session, ignore `x-user-id` | session user used; `x-user-id` ignored; no `requireInternalToken` on user routes | **Every** route (see table below). Session-user assertions: `producao/atividades/route.test.ts:156-168`; `.../execucoes/route.test.ts:200-224`; `.../ordem/route.test.ts:136-142`; `.../prioridade/route.test.ts:140-150`; `pedidos/[orderId]/saldo/route.test.ts:157-164`; `.../classificar/route.test.ts:259-270`. `401`/`403`: `execucoes:191,226`; `ordem:128,144`; `prioridade:131,152`; `saldo:151,166`; `classificar:246,272`; `entregas:280`; `ocorrencias:311,295`; `setores:152,158`; `motivos:97`; `mapeamentos:192,200,209,220`; `integracao/pedidos:191,198`; `[jobId]:132`; `reprocessar:192,202` | ✅ PASS |
| AUTH-15 inactive user → login `401` | `401`, same failure | `src/app/api/auth/login/route.test.ts:120` `toBe(401)`; unit `src/modules/auth/autenticar.test.ts:86-92` | ✅ PASS |
| AUTH-16 tampered session token → reject `401` | `null` / `401` | `src/modules/auth/sessao.test.ts:36` (payload), `:44` (signature); `src/app/api/auth/sessao/route.test.ts:51` `toBe(401)`; `src/shared/http/auth-context.test.ts:60` | ✅ PASS |

**Status**: ✅ All 16 ACs covered — 0 gaps, 0 spec-precision gaps.

**Note (AUTH-09)**: the previous run flagged a matrix/spec wording mismatch (matrix granted `SELLER` `definir_prazo` while spec said "apenas consulta"). The spec was tightened in `28d54fd` to "apenas consulta e definição de prazo" (`spec.md:71`), aligning with the matrix (`permissoes.ts:39`). Observable Vendedor behavior is consult + (future) prazo; no `definir_prazo` route exists yet (out-of-scope table). Resolved.

---

## AUTH-14 Route Classification (every route under `src/app/api/**`)

| # | Route | Methods | Classification | Guard | Uses session? |
| --- | --- | --- | --- | --- | --- |
| 1 | `/api/auth/login` | POST | user (auth) | issues session | n/a (login) ✅ |
| 2 | `/api/auth/sessao` | GET, DELETE | user (auth) | `obterUsuario` / logout | ✅ |
| 3 | `/api/usuarios` | GET, POST | user | `autorizar('gerenciar_usuarios')` | ✅ |
| 4 | `/api/usuarios/[id]` | PATCH | user | `autorizar('gerenciar_usuarios')` | ✅ |
| 5 | `/api/producao/atividades` | GET | user (production) | `autorizar('registrar_execucao')` | ✅ |
| 6 | `/api/producao/atividades/[id]/execucoes` | POST | user (production) | `autorizar('registrar_execucao')`; identity from `auth.usuario.userId` | ✅ hardened (T16) |
| 7 | `/api/producao/atividades/[id]/ordem` | GET | user (production) | `autorizar('consultar_pedidos')` | ✅ hardened (T17) |
| 8 | `/api/producao/atividades/[id]/prioridade` | PATCH | user (production) | `autorizar('definir_prioridade')` | ✅ hardened (T17) |
| 9 | `/api/producao/atividades/[id]/ocorrencias` | GET, POST | user (occurrence) | `autorizar('registrar_ocorrencia')` | ✅ |
| 10 | `/api/pedidos/[orderId]/saldo` | GET | user (delivery/pedido) | `autorizar('consultar_pedidos')` | ✅ hardened (T18) |
| 11 | `/api/pedidos/itens/[itemId]/classificar` | POST | user (classification) | `autorizar('classificar_item')` | ✅ hardened (T18) |
| 12 | `/api/pedidos/itens/[itemId]/entregas` | GET, POST | user (delivery) | `autorizar('registrar_entrega')` | ✅ |
| 13 | `/api/setores` | GET, POST | user | `autorizar('gerenciar_setores')` | ✅ hardened (T19) |
| 14 | `/api/motivos` | GET | user (occurrence support) | `autorizar('consultar_pedidos')` | ✅ hardened (T19) |
| 15 | `/api/mapeamentos` | GET, POST, PATCH | user | `autorizar('gerenciar_setores')` | ✅ hardened (T19) |
| 16 | `/api/integracao/pedidos` | POST | user (`solicitar_importacao`) | `autorizar('solicitar_importacao')` | ✅ hardened (T20) |
| 17 | `/api/integracao/pedidos/[jobId]` | GET | user | `autorizar('consultar_pedidos')` | ✅ hardened (T20) |
| 18 | `/api/integracao/pedidos/[jobId]/reprocessar` | POST | user | `autorizar('solicitar_importacao')` | ✅ hardened (T20) |
| 19 | `/api/integracao/callback` | POST | **service** | `requireCallbackToken` (`CONNECTOR_CALLBACK_TOKEN`) | n/a (service) ✅ correct |
| 20 | `/api/health` | GET | public | none | n/a ✅ |

**User routes still bypassing the session**: **none** (was 11).
**Routes reading `x-user-id`**: **none** in `src/app/api/**` (grep confirms `x-user-id` appears only in test helpers).
**Routes using `requireInternalToken`**: **none** (function remains only in `internal-auth.ts` + its unit test, unused by routes).
**Critical fix confirmed**: `producao/atividades/[id]/execucoes/route.ts:16` now calls `autorizar(request, 'registrar_execucao')` and derives identity at `:20` from `auth.usuario.userId` — the `x-user-id` impersonation vector is closed.

---

## Security Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Session cookie is `HttpOnly` | ✅ | `src/shared/http/auth-context.ts:43,48`; asserted `src/app/api/auth/login/route.test.ts:88` |
| Password never returned in responses | ✅ | `Usuario` interface omits `passwordHash` (`gerenciar-usuarios.ts:4-13`); `toUsuario` omits it (`prisma-usuarios-repository.ts:21-32`); route bodies return only `{ usuario }` / `{ usuario: { id } }` |
| `SESSION_SECRET` / token never logged | ✅ | grep `console.(log\|error\|warn\|info\|debug)` in `src/**` → 0 matches; secret read only in `sessao.ts:15` |
| Callback still uses service token | ✅ | `src/app/api/integracao/callback/route.ts:14` `requireCallbackToken` (`CONNECTOR_CALLBACK_TOKEN`); asserted `callback/route.test.ts:279-287` |
| No route accepts `x-user-id` to impersonate | ✅ | grep: `x-user-id` only in `*.test.ts`; every user route reads identity from `auth.usuario.userId` |
| Password hash verification uses constant-time compare | ✅ | `src/modules/auth/senha.ts:35` `timingSafeEqual` |

---

## Discrimination Sensor

Scratch: file backups under `%TEMP%\sensor_usup2_backup`; mutations applied in-tree via `[IO.File]::WriteAllText` and restored from byte-copies (never `git stash`). Baseline `git status --porcelain` = `?? .specs/.../validation.md` only; `git diff` empty; `HEAD` = `28d54fd`. Same state after the run.

| # | Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- | --- |
| 1 | Session signature verification | `src/modules/auth/sessao.ts:44` | `if (recebida.length !== calculada.length \|\| !timingSafeEqual(...))` → `if (false)` | ✅ Killed (3 failed / 6) |
| 2 | Session expiry | `src/modules/auth/sessao.ts:54` | `payload.exp <= Date.now()` → `payload.exp > Date.now()` | ✅ Killed (2 failed / 6) |
| 3 | Role guard 403 | `src/shared/http/auth-context.ts:95` | `if (!deps.pode(...)) throw` → `if (false) throw` | ✅ Killed (1+1+1 failed across unit + usuarios + producao 403) |
| 4 | Vendedor restriction | `src/modules/usuarios/permissoes.ts:29` | added `'SELLER'` to `registrar_execucao` | ✅ Killed (1+1 failed: matriz + producao 403) |
| 5 | Password hash verification | `src/modules/auth/senha.ts:35` | `return timingSafeEqual(...)` → `return true` | ✅ Killed (1+2+1 failed: senha, autenticar, login 401) |
| 6 | Newly hardened route session identity | `src/app/api/producao/atividades/[id]/execucoes/route.ts:20` | `auth.usuario.userId` → `request.headers.get('x-user-id') ?? auth.usuario.userId` | ✅ Killed (1 failed / 9: ignores-`x-user-id` test) |

**Sensor depth**: P0-full (auth/critical path), 6 mutations.
**Result**: 6/6 killed — PASS ✅.
**Isolation**: verified — `git status --porcelain` (`?? .specs/.../validation.md` only) and `git diff` (empty) match the pre-sensor baseline after restore.

---

## Edge Cases

- [x] Inactive user → login refused `401` — `src/app/api/auth/login/route.test.ts:115-123`, `src/modules/auth/autenticar.test.ts:86-92`.
- [x] Tampered session token → `401` — `src/modules/auth/sessao.test.ts:29-45`, `src/app/api/auth/sessao/route.test.ts:48-53`, `src/shared/http/auth-context.test.ts:59-61`.
- [x] User not in the action's sector → `403` — `src/app/api/producao/atividades/[id]/execucoes/route.test.ts:172-182`, `.../[id]/ocorrencias/route.test.ts:239-248` (`operator_outside_sector`).

---

## Gate Check

- **Gate command**: `npm run prisma:generate && npm run lint && npm run typecheck && npm run typecheck:connector && npm run test:coverage && npm run build`
- **Result**: 6/6 steps passed, 0 failed.
  - `prisma:generate` ✅ (client → `src/generated/prisma`)
  - `lint` ✅ (0 errors, 2 pre-existing warnings in `postcss.config.mjs` / `prettier.config.mjs`)
  - `typecheck` ✅
  - `typecheck:connector` ✅
  - `test:coverage` ✅ — **53 files, 360 tests passed, 0 failed**; statements 96.07%, branches 92.99%, functions 97.82%, lines 98.53%
  - `build` ✅ (Next.js 16.3.5; all 20 API routes emitted)
- **Test count before feature**: not independently re-run (base commit lacks installed deps); tasks.md documents 75 new feature tests across T1–T20.
- **Test count after feature**: 360 (previous verification run: 348 → **+12** from the T16–T20 hardening tests).
- **Skipped tests**: none.
- **Failures**: none.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ T16–T20 touch only the affected route + its test |
| No scope creep | ✅ |
| Matches patterns | ✅ (`autorizar` guard consistent across all user routes; port/adapter preserved) |
| Spec-anchored outcome check (asserted values match spec) | ✅ all 16 ACs; route tests assert session user / `x-user-id` ignored |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ every route in scope has happy + 401 + 403 (+ `x-user-id` where identity matters) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | ✅ `docs/testes.md` |

---

## Requirement Traceability Update

The spec's status column is not edited here (this Verifier is write-only to `validation.md`). Recommended update:

| Requirement | Previous Status | Recommended Status |
| --- | --- | --- |
| AUTH-01 … AUTH-13, AUTH-15, AUTH-16 | Done | ✅ Verified |
| AUTH-14 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 16/16 ACs matched spec outcome; 0 gaps.
**AUTH-14 route coverage**: all 20 routes classified — 18 user routes on the session, callback on the service token, health public; 0 user routes bypassing.
**Sensor**: 6/6 mutations killed.
**Gate**: 6/6 steps passed; 360 tests passed.

**What works**: Login/logout with HMAC-signed httpOnly cookie session; scrypt password hashing (salted, constant-time compare); server-side role matrix with `401`/`403`; user CRUD with N:N profiles/sectors and deactivation blocking login; tampered/expired token rejection; and the full AUTH-14 hardening — every user route (production, occurrence, delivery, saldo, classification, sectors, motivos, mapeamentos, integration import/monitor/reprocess) now derives identity from the session and ignores `x-user-id`.

**Issues found**: none.

**Next steps**: none — feature is ready. Note: the skill's lessons-distillation step was intentionally skipped; this Verifier's scope is write-only to `validation.md`.
