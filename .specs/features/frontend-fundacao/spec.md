# Frontend — Fundação e Chão de Fábrica — Especificação

## Problem Statement

O sistema só tem APIs; não há interface. O operador de produção precisa registrar execução e ocorrências em celular, tablet, notebook e desktop, com alvos de toque grandes e pouca digitação. Precisamos de um design system responsivo, um shell de navegação por perfil, a tela de login e a fatia do operador.

## Goals

- [ ] Design system responsivo mobile-first.
- [ ] Shell de navegação por perfil (menu conforme o perfil).
- [ ] Login e sessão no cliente.
- [ ] Fila, execução e ocorrências do operador.
- [ ] Acessibilidade WCAG 2.1 AA no escopo entregue.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Telas de gerente, vendedor, expedição e responsável | Feature seguinte. |
| Impressão visual da ordem de produção | RF018; depois. |
| PWA e operação offline | Adiada por decisão do projeto. |
| Reuso obrigatório do HTML de `design/inspiracoes` | Referências visuais são inspiração, não especificação. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Base de componentes | Tailwind + shadcn/ui customizado | `docs/decisoes.md` | sim |
| Acesso a dados | Componentes client chamam as APIs com cookie de sessão | APIs já existentes | sim |
| Sem banco de runtime | Estados de carregando, erro e vazio tratados; E2E com mock de rede | Ambiente sem MySQL | não |
| Referências visuais | Orientam layout e hierarquia; não são spec | `docs/frontend.md` | sim |
| Acessibilidade | WCAG 2.1 AA no escopo | `docs/frontend.md` | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Login ⭐ MVP

**User Story**: Como usuário, quero entrar pela interface, para acessar minhas telas.

**Acceptance Criteria**:

1. WHEN o usuário informa credenciais válidas THEN a tela SHALL autenticar e navegar para a tela do seu perfil.
2. IF as credenciais forem inválidas THEN a tela SHALL exibir uma mensagem de erro acessível.
3. The form SHALL ter rótulos associados e funcionar por teclado.

**Independent Test**: Logar e cair na tela do perfil; errar a senha e ver a mensagem.

---

### P1: Shell responsivo ⭐ MVP

**User Story**: Como usuário, quero navegar entre as telas do meu perfil em qualquer dispositivo.

**Acceptance Criteria**:

1. The shell SHALL exibir a navegação do perfil do usuário.
2. WHEN a largura for de celular THEN o menu SHALL ser acessível por um botão.
3. The layout SHALL ser utilizável em 360, 768, 1024 e 1440 px sem rolagem horizontal.

**Independent Test**: Redimensionar de 360 a 1440 px e navegar.

---

### P1: Fila do operador ⭐ MVP

**User Story**: Como operador, quero ver minhas atividades, para saber o que executar.

**Acceptance Criteria**:

1. WHEN a tela carrega THEN o sistema SHALL listar as atividades dos meus setores.
2. IF não houver atividades THEN o sistema SHALL exibir um estado vazio.
3. WHILE carrega THEN o sistema SHALL exibir um estado de carregando.

**Independent Test**: Abrir a fila e ver as atividades ou o estado vazio.

---

### P1: Executar atividade ⭐ MVP

**User Story**: Como operador, quero registrar a quantidade produzida, para atualizar o saldo.

**Acceptance Criteria**:

1. WHEN o operador informa a quantidade e confirma THEN a tela SHALL registrar a execução e atualizar a lista.
2. IF a quantidade for inválida THEN a tela SHALL exibir a mensagem sem registrar.
3. The campo de quantidade SHALL aceitar o teclado numérico no celular.

**Independent Test**: Registrar 8 de 10 e ver o pendente 2 na lista.

---

### P1: Registrar ocorrência ⭐ MVP

**User Story**: Como operador, quero registrar perda, refugo ou indisponibilidade com motivo.

**Acceptance Criteria**:

1. WHEN o operador escolhe o tipo e o motivo e confirma THEN a tela SHALL registrar a ocorrência.
2. IF o motivo não for escolhido para perda, refugo ou indisponibilidade THEN a tela SHALL bloquear o envio.
3. The seleção de motivo SHALL vir da lista fechada da API.

**Independent Test**: Registrar refugo com motivo e ver a confirmação.

---

## Edge Cases

- IF a API responder `401` THEN a tela SHALL redirecionar para o login.
- IF a API falhar THEN a tela SHALL exibir um erro acessível e permitir tentar de novo.
- The sistema SHALL não depender apenas de cor para comunicar estado.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FE-01 | P1: Login | Execute | Done |
| FE-02 | P1: Login | Execute | Done |
| FE-03 | P1: Login | Execute | Done |
| FE-04 | P1: Shell | Execute | Done |
| FE-05 | P1: Shell | Execute | Done |
| FE-06 | P1: Shell | Execute | Done |
| FE-07 | P1: Fila | Design | Pending |
| FE-08 | P1: Fila | Execute | Done |
| FE-09 | P1: Executar | Design | Pending |
| FE-10 | P1: Executar | Design | Pending |
| FE-11 | P1: Ocorrência | Design | Pending |
| FE-12 | P1: Ocorrência | Design | Pending |
| FE-13 | Edge: 401 | Execute | Done |
| FE-14 | Edge: falha de API | Execute | Done |

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️

---

## Success Criteria

- [ ] Login e navegação funcionam por teclado e em 360–1440 px.
- [ ] A fila mostra atividades ou estado vazio.
- [ ] Registrar execução e ocorrência pela interface.
- [ ] Nenhuma tela com rolagem horizontal nas larguras alvo.
