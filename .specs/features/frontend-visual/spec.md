# Frontend — Refino Visual — Especificação

## Problem Statement

A interface funciona, mas está visualmente simples e distante da referência `frontend-v4` (sidebar, cabeçalho de página, cards de métricas, badges, tabelas). Precisamos aproximar a linguagem visual da referência **sem alterar comportamento, contratos ou regras**, mantendo responsividade (celular/tablet/desktop) e acessibilidade.

## Goals

- [ ] Shell com **topbar + sidebar** (desktop) e menu acessível (celular).
- [ ] **Login** com painel lateral (hero) e caixa de acesso.
- [ ] Componentes de **métrica, badge, cabeçalho de página e tabela**.
- [ ] Telas com o padrão visual da referência, mantendo estados de carregando/erro/vazio.
- [ ] Responsividade em 360/768/1024/1440 px e WCAG 2.1 AA.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Novas funcionalidades/telas | É só refino visual. |
| Mudança de APIs/contratos/regras | Comportamento inalterado. |
| Reuso obrigatório do HTML/CSS do protótipo | A referência é inspiração, não especificação. |
| Gráficos avançados | Fora do escopo atual. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Referência visual | `design/inspiracoes/frontend-v4/` | Inspiração, não spec | sim |
| Base técnica | Tailwind + componentes React existentes | Sem nova dependência | sim |
| Comportamento | Inalterado (APIs, testes, contratos) | Refino visual | sim |
| Sidebar no celular | Vira menu (botão no topbar) | Responsividade | sim |
| Testes | Componentes/rotas continuam verdes | Não enfraquecer | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Shell com sidebar ⭐ MVP

**User Story**: Como usuário, quero uma navegação lateral clara no desktop e um menu no celular.

**Acceptance Criteria**:

1. WHEN a tela abre em ≥ 768 px THEN o shell SHALL mostrar a navegação lateral do perfil.
2. WHEN a tela abre em < 768 px THEN o shell SHALL esconder a lateral e oferecer um botão de menu acessível.
3. The shell SHALL not causar rolagem horizontal entre 360 e 1440 px.

**Independent Test**: Abrir a fila em 360 e 1440 px e navegar.

---

### P1: Login com hero ⭐ MVP

**User Story**: Como usuário, quero uma tela de login com identidade visual e boa leitura.

**Acceptance Criteria**:

1. WHEN a tela de login abre em ≥ 780 px THEN SHALL mostrar painel lateral (hero) e caixa de acesso.
2. WHEN a tela de login abre em < 780 px THEN SHALL mostrar apenas a caixa de acesso.
3. The formulário SHALL manter rótulos, foco visível e erro acessível.

**Independent Test**: Logar em 360 e 1440 px.

---

### P1: Componentes visuais ⭐ MVP

**User Story**: Como desenvolvedor, quero componentes reutilizáveis para padronizar as telas.

**Acceptance Criteria**:

1. The sistema SHALL oferecer `Metric`, `Badge`, `PageHead` e `Card` reutilizáveis.
2. The badges SHALL comunicar estado por texto + cor (não só cor).

**Independent Test**: Ver métricas e badges no painel.

---

### P1: Telas refinadas ⭐ MVP

**User Story**: Como usuário, quero telas com cabeçalho, métricas e tabelas legíveis.

**Acceptance Criteria**:

1. WHEN as telas de operador, gerente, vendedor, expedição e administração carregam THEN SHALL usar o padrão (cabeçalho, cards, tabelas).
2. The estados de carregando, erro e vazio SHALL permanecer.
3. The comportamento (chamadas de API) SHALL permanecer inalterado.

**Independent Test**: Percorrer as telas por perfil.

---

## Edge Cases

- IF a lista estiver vazia THEN a tela SHALL mostrar o estado vazio padrão.
- IF a API falhar THEN a tela SHALL mostrar o alerta padrão.
- The tabelas SHALL permitir rolagem horizontal interna em telas estreitas, sem quebrar o layout.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VIS-01 | P1: Shell | Design | Done |
| VIS-02 | P1: Shell | Design | Done |
| VIS-03 | P1: Shell | Design | Done |
| VIS-04 | P1: Login | Design | Done |
| VIS-05 | P1: Login | Design | Done |
| VIS-06 | P1: Login | Design | Done |
| VIS-07 | P1: Componentes | Design | Done |
| VIS-08 | P1: Componentes | Design | Done |
| VIS-09 | P1: Telas | Design | Pending |
| VIS-10 | P1: Telas | Design | Pending |
| VIS-11 | P1: Telas | Design | Pending |

**Coverage:** 11 total, 0 mapped to tasks, 11 unmapped ⚠️

---

## Success Criteria

- [ ] Shell com sidebar no desktop e menu no celular, sem rolagem horizontal.
- [ ] Login com hero responsivo.
- [ ] Componentes reutilizáveis aplicados nas telas.
- [ ] Testes e E2E continuam verdes.
