# Frontend — Telas dos Perfis — Especificação

## Problem Statement

Só existe a fatia do operador. Gerente, vendedor, expedição e responsável pelo sistema não têm telas. Sem isso, os perfis não conseguem usar o sistema pela interface. Precisamos completar as telas e a navegação por perfil.

## Goals

- [ ] Painel e consulta de pedidos para o gerente.
- [ ] Consulta de pedidos e definição de prazo para o vendedor.
- [ ] Disponíveis e registro de entrega para a expedição.
- [ ] Usuários, setores e mapeamentos para o responsável.
- [ ] Navegação por perfil completa.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Impressão visual da ordem de produção | RF018; depois. |
| E2E Playwright e acessibilidade final | Feature de qualidade. |
| PWA e offline | Adiada. |
| Novas APIs | As APIs já existem. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Dados | Client components consomem as APIs com a sessão | Padrão da feature 9 | sim |
| Reuso | Componentes base e cliente de API da feature 9 | Evitar duplicação | sim |
| Sem banco de runtime | Estados de carregando/erro/vazio | Ambiente sem MySQL | não |
| Vendedor | Consulta e prazo; sem escrita de produção | `docs/perfis-permissoes.md` | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Painel do gerente ⭐ MVP

**User Story**: Como gerente, quero ver o andamento por setor, para priorizar.

**Acceptance Criteria**:

1. WHEN o gerente abre o painel THEN a tela SHALL mostrar a contagem de atividades por setor e status e as pendências.
2. WHEN os indicadores carregam THEN a tela SHALL mostrar produção por setor e cumprimento de prazo.

**Independent Test**: Abrir o painel e ver as contagens.

---

### P1: Consulta de pedidos ⭐ MVP

**User Story**: Como gerente ou vendedor, quero consultar os pedidos, para informar o cliente.

**Acceptance Criteria**:

1. WHEN um usuário abre a consulta THEN a tela SHALL listar pedidos com filtros de cliente, setor, status e período.
2. WHEN um pedido é aberto THEN a tela SHALL mostrar os itens com solicitado, executado, disponível, entregue e pendente.

**Independent Test**: Filtrar e abrir um pedido.

---

### P1: Definir prazo ⭐ MVP

**User Story**: Como gerente ou vendedor, quero definir o prazo, para orientar a produção.

**Acceptance Criteria**:

1. WHEN gerente ou vendedor define um prazo THEN a tela SHALL salvar e refletir o status de prazo.

**Independent Test**: Definir prazo e ver o status mudar.

---

### P1: Entregas da expedição ⭐ MVP

**User Story**: Como expedição, quero ver os disponíveis e registrar entregas.

**Acceptance Criteria**:

1. WHEN a expedição registra uma entrega dentro do disponível THEN a tela SHALL registrar e atualizar o saldo.
2. IF a entrega exceder o disponível THEN a tela SHALL exigir autorização de gerente com motivo.

**Independent Test**: Entregar 3 de 8 e ver o disponível cair.

---

### P1: Administração ⭐ MVP

**User Story**: Como responsável pelo sistema, quero manter usuários, setores e mapeamentos.

**Acceptance Criteria**:

1. WHEN o responsável cria um usuário THEN a tela SHALL salvar com perfis e setores.
2. WHEN o responsável mantém setores e mapeamentos THEN a tela SHALL salvar e listar.

**Independent Test**: Criar um usuário com perfil e setor.

---

### P1: Navegação por perfil ⭐ MVP

**User Story**: Como usuário, quero navegar pelas telas do meu perfil.

**Acceptance Criteria**:

1. The shell SHALL mostrar a navegação correspondente ao perfil do usuário.
2. WHEN o login conclui THEN o sistema SHALL navegar para a tela inicial do perfil.

**Independent Test**: Logar como gerente e cair no painel; como vendedor e cair na consulta.

---

## Edge Cases

- IF a API responder `401` THEN a tela SHALL redirecionar para o login.
- IF a API falhar THEN a tela SHALL exibir um erro acessível e permitir tentar de novo.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FEP-01 | P1: Painel | Design | Pending |
| FEP-02 | P1: Painel | Design | Pending |
| FEP-03 | P1: Consulta | Design | Pending |
| FEP-04 | P1: Consulta | Design | Pending |
| FEP-05 | P1: Prazo | Design | Pending |
| FEP-06 | P1: Entregas | Design | Pending |
| FEP-07 | P1: Entregas | Design | Pending |
| FEP-08 | P1: Administração | Design | Pending |
| FEP-09 | P1: Administração | Design | Pending |
| FEP-10 | P1: Navegação | Design | Pending |
| FEP-11 | P1: Navegação | Design | Pending |
| FEP-12 | Edge: 401 | Design | Pending |
| FEP-13 | Edge: falha de API | Design | Pending |

**Coverage:** 13 total, 0 mapped to tasks, 13 unmapped ⚠️

---

## Success Criteria

- [ ] Cada perfil navega e opera as telas do seu escopo.
- [ ] A entrega acima do disponível exige gerente e motivo.
- [ ] A consulta filtra e detalha pedidos.
- [ ] A administração mantém usuários, setores e mapeamentos.
