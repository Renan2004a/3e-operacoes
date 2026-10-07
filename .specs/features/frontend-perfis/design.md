# Frontend — Telas dos Perfis — Design

**Spec**: `.specs/features/frontend-perfis/spec.md`
**Status**: Draft

---

## Architecture Overview

Completa o App Router com as telas de gerente, vendedor, expedição e responsável, reusando os componentes base, o shell e o cliente de API da feature 9. A navegação passa a cobrir todos os perfis e o login redireciona para a tela inicial do perfil.

```mermaid
graph TD
    SH[Shell por perfil] --> GP[/gerente/painel]
    SH --> GPE[/gerente/pedidos]
    SH --> VP[/vendedor/pedidos]
    SH --> EE[/expedicao/entregas]
    SH --> AU[/admin/usuarios]
    SH --> AS[/admin/setores]
    GP -->|GET /api/indicadores| API[APIs]
    GPE -->|GET /api/pedidos| API
    VP -->|PATCH .../prazo| API
    EE -->|POST .../entregas| API
    AU -->|/api/usuarios| API
    AS -->|/api/setores,/api/mapeamentos| API
```

---

## Code Reuse Analysis

| Component | Location | How to Use |
| --- | --- | --- |
| Componentes base | `src/shared/ui/` | Button, Input, Field, Card, Badge, Alert. |
| Cliente de API | `src/shared/http/api-client.ts` | `apiGet`/`apiPost`/`apiPatch`. |
| Shell | `src/shared/ui/app-shell.tsx` | Estender a navegação por perfil. |
| Lista de pedidos | `src/shared/ui/pedidos-lista.tsx` | Compartilhada entre gerente e vendedor. |

---

## Components

- `src/shared/ui/pedidos-lista.tsx` — lista com filtros (compartilhada).
- `src/app/(app)/gerente/painel/page.tsx` — painel/indicadores.
- `src/app/(app)/gerente/pedidos/page.tsx` — lista.
- `src/app/(app)/gerente/pedidos/[orderId]/page.tsx` — detalhe + prazo.
- `src/app/(app)/vendedor/pedidos/page.tsx` — consulta do vendedor.
- `src/app/(app)/expedicao/entregas/page.tsx` — disponíveis + entrega.
- `src/app/(app)/admin/usuarios/page.tsx` — usuários.
- `src/app/(app)/admin/setores/page.tsx` — setores + mapeamentos.
- `src/shared/ui/app-shell.tsx` (ajuste) — navegação de todos os perfis.
- `src/app/login/page.tsx` (ajuste) — redireciona para a tela inicial do perfil.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| `401` | Redireciona ao login | Reautenticar. |
| Falha de API | `Alert` com tentar de novo | Recarregar. |
| Sem permissão (`403`) | Mensagem de acesso negado | Sem permissão. |
| Exceção sem gerente | Bloqueia e explica | Pedir gerente. |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| Sem banco de runtime | páginas | Dados reais indisponíveis | Estados de erro/vazio; testes com API mockada. |
| Navegação por perfil | shell | Menu errado | Mapa perfil→rotas testado. |
| Redireciono pós-login | login | Cai em tela sem acesso | Resolver perfil e escolher a rota inicial. |
| Exceção de entrega | expedição | Entrega indevida | Fluxo com motivo e gerente. |

---

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Lista compartilhada | `pedidos-lista.tsx` | Evita duplicação gerente/vendedor. |
| Navegação | Mapa perfil→rotas no shell | FE-10. |
| Pós-login | Resolver perfil e rota inicial | FE-11. |
| Testes | Testing Library + jsdom | Sem banco. |
