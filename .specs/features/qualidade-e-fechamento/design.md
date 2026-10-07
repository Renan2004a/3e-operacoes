# Qualidade e Fechamento — Design

**Spec**: `.specs/features/qualidade-e-fechamento/spec.md`
**Status**: Draft

---

## Architecture Overview

Feature de fechamento: correções de precisão no domínio de indicadores, ajuste de navegação, auditoria de acessibilidade, E2E Playwright e documentação de go-live.

```mermaid
graph TD
    E2E[Playwright] -->|mock API| LOGIN[/login]
    E2E -->|viewports| RESP[360-1440px]
    A11Y[Ajustes de acessibilidade] --> UI[src/shared/ui]
    PREC[Correções de precisão] --> IND[src/modules/indicadores]
    NAV[Atalho do gerente] --> SHELL[src/shared/ui/navegacao-perfil.ts]
    DOC[docs/go-live.md]
```

---

## Code Reuse Analysis

| Component | Location | How to Use |
| --- | --- | --- |
| Indicadores | `src/modules/indicadores/` | Corrigir ordenação e prazo. |
| Lista de pedidos | `src/shared/ui/pedidos-lista.tsx` | Documentar o filtro de cliente. |
| Navegação | `src/shared/ui/navegacao-perfil.ts` | Devolver a fila ao gerente. |
| Config Playwright | `playwright.config.ts` | Testes E2E. |

---

## Components

- Correções: `consulta-pedidos.ts`, `pcp.ts`, `pedidos-lista.tsx`.
- Navegação: `navegacao-perfil.ts`.
- Acessibilidade: `src/shared/ui/*`.
- E2E: `tests/e2e/login.spec.ts`.
- Documento: `docs/go-live.md`.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Navegador ausente no E2E | Falha clara do Playwright | Instalar `npx playwright install chromium`. |
| Rota não mockada | E2E falha explícita | Ajustar o mock. |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| E2E sem banco | páginas | Fluxos com dados não rodam | E2E só de login e responsividade. |
| Servidor de dev | `playwright.config.ts` | WebServer precisa subir | Config já sobe `npm run dev`. |
| A11y sem medição | componentes | Contraste real não medido | Revisão manual + testes estruturais. |

---

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| E2E | Chromium headless, API mockada | Sem banco. |
| Ordenação | `createdAt` desc determinística | Paginação estável. |
| Conclusão do prazo | Última execução; sem execução, fora | Evitar atraso indevido. |
| Gerente | Devolver a fila | Matriz permite execução. |
| Go-live | Documento único | Fase 12. |
