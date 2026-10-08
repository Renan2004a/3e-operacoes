# Frontend fiel ao protótipo — Especificação

## Problem Statement

A interface atual já usa a linguagem visual da referência, mas **não replica a estrutura do protótipo** `frontend-v4` (login com hero, shell com sidebar, painéis com métricas/alertas, tabelas com filtros, quick actions) e ainda contém **textos de demonstração** ("Protótipo visual", "dados demonstrativos"). Precisamos seguir o protótipo de perto, adaptado às regras/APIs reais e usável em **celular, tablet e desktop**.

## Goals

- [x] Login, shell e telas **fiéis à estrutura do protótipo**.
- [x] Remover **todo texto de demonstração**.
- [x] Usável em **celular, tablet, notebook e desktop**.
- [x] Comportamento, APIs e contratos **inalterados**.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Novas funcionalidades/APIs | É apresentação. |
| Mudar regras de negócio | Inalteradas. |
| Copiar o HTML/CSS literalmente | Adaptado para React/Next + dados reais. |
| Gráficos com dados fictícios | Só dados reais. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Protótipo | `design/inspiracoes/frontend-v4/` | Base do pedido | sim |
| Textos de demonstração | Removidos | Pedido do usuário | sim |
| Sidebar no celular/tablet | Vira menu (botão no topbar) | Usabilidade | sim |
| Dados | Reais (APIs) | Sem dados fictícios | sim |
| Especificações do item | Mostrar descrição, código, unidade e vendedor | Item 70435 hoje mostra só o id | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Login fiel ao protótipo ⭐ MVP

**Acceptance Criteria**:

1. WHEN a tela abre THEN SHALL replicar o layout do protótipo (hero + caixa), sem texto de demonstração.
2. WHEN em < 780 px THEN SHALL mostrar só a caixa, mantendo rótulos/foco/erro.

### P1: Shell fiel ao protótipo ⭐ MVP

**Acceptance Criteria**:

1. WHEN em ≥ 768 px THEN SHALL mostrar topbar + sidebar (teal) como o protótipo.
2. WHEN em < 768 px THEN SHALL oferecer menu acessível; sem rolagem horizontal.

### P1: Telas fiéis ao protótipo ⭐ MVP

**Acceptance Criteria**:

1. WHEN o painel carrega THEN SHALL mostrar métricas, tabelas/alertas no padrão do protótipo.
2. WHEN as listas carregam THEN SHALL usar tabela com filtros (toolbar).
3. The itens SHALL mostrar **descrição, código, unidade e vendedor** (código) do pedido.

### P1: Sem textos de demonstração ⭐ MVP

**Acceptance Criteria**:

1. The sistema SHALL NOT exibir "Protótipo visual", "dados demonstrativos" ou equivalentes.

### P1: Responsividade ⭐ MVP

**Acceptance Criteria**:

1. WHEN em 360/768/1024/1440 px THEN SHALL ser utilizável sem rolagem horizontal.

---

## Edge Cases

- IF a lista estiver vazia THEN SHALL mostrar o estado vazio do protótipo.
- IF a API falhar THEN SHALL mostrar o alerta padrão.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PROT-01 | P1: Login | Design | Done (T2) |
| PROT-02 | P1: Login | Design | Done (T2) |
| PROT-03 | P1: Shell | Design | Done (T3) |
| PROT-04 | P1: Shell | Design | Done (T3) |
| PROT-05 | P1: Telas | Design | Done (T4, T5, T6) |
| PROT-06 | P1: Telas | Design | Done (T4, T5, T6) |
| PROT-07 | P1: Telas | Design | Done (T1, T5) |
| PROT-08 | P1: Sem demo | Design | Done (T2, T7) |
| PROT-09 | P1: Responsivo | Design | Done (T7) |

**Coverage:** 9 total, 9 mapped to tasks, 0 unmapped ✅

---

## Success Criteria

- [x] Telas visualmente fiéis ao protótipo.
- [x] Nenhum texto de demonstração.
- [x] Itens com descrição/código/unidade/vendedor.
- [x] Testes e E2E verdes.
