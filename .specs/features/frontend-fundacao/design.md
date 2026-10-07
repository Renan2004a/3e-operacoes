# Frontend — Fundação e Chão de Fábrica — Design

**Spec**: `.specs/features/frontend-fundacao/spec.md`
**Status**: Draft

---

## Architecture Overview

App Router com um shell responsivo e páginas por perfil. Componentes de UI reutilizáveis (Tailwind + shadcn/ui). Componentes client consomem as APIs com o cookie de sessão. Mobile-first.

```mermaid
graph TD
    L[/login] -->|POST /api/auth/login| API[APIs]
    SH[Shell responsivo] --> F[/operador/fila]
    F --> A[/operador/atividades/:id]
    A -->|POST execução| API
    A -->|POST ocorrência| API
    F -->|GET /api/producao/atividades| API
    A -->|GET /api/motivos| API
```

---

## Code Reuse Analysis

| Component | Location | How to Use |
| --- | --- | --- |
| `cn` (classes) | `src/shared/ui/utils.ts` | Combinar classes. |
| Config shadcn | `components.json` | Base de primitives. |
| APIs | `src/app/api/**` | Consumir com credenciais. |
| Tailwind | `src/app/globals.css`, `postcss.config.mjs` | Estilos. |
| Referências visuais | `design/inspiracoes/frontend-v4/` | Inspiração de layout (não spec). |

---

## Components

### Design system

- **Location**: `src/shared/ui/`
- **Componentes**: `Button`, `Input`, `Field`, `Card`, `Badge`, `Spinner`, `EmptyState`, `Alert`.
- **Reuso**: `cn`.

### Shell

- **Location**: `src/app/(app)/layout.tsx`, `src/shared/ui/app-shell.tsx`
- **Purpose**: Cabeçalho, navegação por perfil, menu acessível no celular.

### Cliente de API

- **Location**: `src/shared/http/api-client.ts`
- **Interfaces**: `apiGet`, `apiPost`, `apiPatch`; trata `401` (redireciona ao login) e erros.

### Páginas

- `src/app/login/page.tsx`.
- `src/app/(app)/operador/fila/page.tsx`.
- `src/app/(app)/operador/atividades/[id]/page.tsx` (execução + ocorrência).

---

## Data Models

Sem dados novos. Consome contratos das APIs já existentes. Estado de sessão via cookie `3e_session` (não acessível ao JS por ser httpOnly; a página usa `/api/auth/sessao`).

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| `401` da API | Redireciona ao login | Reautenticar. |
| Falha de rede | `Alert` com ação de tentar de novo | Recarregar. |
| Lista vazia | `EmptyState` | Sem itens. |
| Quantidade inválida | Mensagem no campo | Corrigir. |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| Sem banco de runtime | páginas | Dados reais indisponíveis | Estados de erro/vazio; testes de componente com API mockada. |
| Responsividade real | layout | Rolagem horizontal | Breakpoints mobile-first; validar 360–1440 px. |
| Acessibilidade | formulários | Uso por teclado/leitor | Rótulos, foco visível, contraste. |
| E2E sem navegador | Playwright | Não roda | E2E fica para a feature de qualidade. |

---

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Base de UI | Tailwind + shadcn/ui | `docs/decisoes.md`. |
| Dados | Client components + APIs | APIs prontas; cookie de sessão. |
| Responsividade | Mobile-first | `docs/frontend.md`. |
| Testes de componente | Testing Library + jsdom | Sem banco. |
| E2E | Deferido | Navegador/servidor não garantidos. |
