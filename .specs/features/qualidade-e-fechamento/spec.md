# Qualidade e Fechamento — Especificação

## Problem Statement

As features anteriores passaram em testes de unidade, mas faltam: verificação em navegador real (responsividade e login), auditoria de acessibilidade, o fechamento das lacunas de precisão registradas e a documentação de go-live. Além disso, o gerente perdeu o atalho para a fila de produção.

## Goals

- [ ] E2E com Playwright do login e da responsividade (360–1440 px).
- [ ] Acessibilidade WCAG 2.1 AA nos componentes-chave.
- [ ] Fechar as lacunas de precisão (ordenação, conclusão do prazo, filtro de cliente).
- [ ] Devolver o atalho do gerente para a fila.
- [ ] Documentar o go-live.

## Out of Scope

| Feature | Reason |
| --- | --- |
| E2E de fluxos que dependem de banco | Sem MySQL de runtime; E2E cobre login e responsividade. |
| PWA e offline | Adiada. |
| Impressão visual | RF018; depois. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| E2E sem banco | Login e viewport com API mockada | Servidor não tem MySQL | sim |
| Navegador do E2E | Chromium (headless) | Já instalado | sim |
| Conclusão do prazo | Atividade concluída conta com a última execução; sem execução, fica fora do indicador | Evitar contar atraso indevido | não |
| Atalho do gerente | Devolver a fila de produção ao gerente | Matriz permite `registrar_execucao` | sim |
| Acessibilidade | Corrigir componentes-chave | `docs/frontend.md` | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: E2E de login e responsividade ⭐ MVP

**User Story**: Como responsável técnico, quero testes de navegador, para garantir login e responsividade.

**Acceptance Criteria**:

1. WHEN o E2E roda com a API mockada THEN o login válido SHALL navegar e o inválido SHALL mostrar erro.
2. WHEN a largura é 360, 768, 1024 ou 1440 px THEN a página SHALL não ter rolagem horizontal.
3. The E2E SHALL rodar no Chromium headless sem banco de dados.

**Independent Test**: `npm run test:e2e` verde.

---

### P1: Acessibilidade ⭐ MVP

**User Story**: Como operador, quero usar as telas por teclado e leitor de tela.

**Acceptance Criteria**:

1. The componentes-chave SHALL ter rótulos associados e foco visível.
2. The mensagens de erro SHALL ser anunciadas (`role="alert"`).
3. The estado SHALL não depender apenas de cor.

**Independent Test**: Navegar por teclado no login e ver o foco e o erro.

---

### P1: Correções de precisão ⭐ MVP

**User Story**: Como gerente, quero indicadores e listas confiáveis.

**Acceptance Criteria**:

1. WHEN a lista de pedidos é paginada THEN a ordem SHALL ser determinística.
2. WHEN o cumprimento de prazo é calculado THEN atividade sem execução SHALL NOT contar como atrasada.
3. The filtro de cliente SHALL ser documentado (substring, sem diferenciar maiúsculas).

**Independent Test**: Paginar e ver a mesma ordem; indicador de prazo coerente.

---

### P1: Atalho do gerente para a fila ⭐ MVP

**User Story**: Como gerente, quero acessar a fila de produção, para registrar execução.

**Acceptance Criteria**:

1. The navegação do gerente SHALL incluir a fila de produção.

**Independent Test**: Logar como gerente e ver o link da fila.

---

### P2: Documentação de go-live

**User Story**: Como responsável técnico, quero documentar o go-live.

**Acceptance Criteria**:

1. WHEN o documento de go-live é lido THEN SHALL descrever Cloudflare Tunnel/Access, o conector no cliente e a troca da AWS pelo Top Gerente real.

**Independent Test**: Ler o documento e seguir os passos.

---

## Edge Cases

- IF o E2E não encontrar o navegador THEN o teste SHALL falhar com mensagem clara.
- IF a API mockada não cobrir uma rota THEN o E2E SHALL falhar explicitamente.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| QF-01 | P1: E2E | Design | Pending |
| QF-02 | P1: E2E | Design | Pending |
| QF-03 | P1: E2E | Design | Pending |
| QF-04 | P1: A11y | Design | Pending |
| QF-05 | P1: A11y | Design | Pending |
| QF-06 | P1: A11y | Design | Pending |
| QF-07 | P1: Precisão | Design | Pending |
| QF-08 | P1: Precisão | Design | Pending |
| QF-09 | P1: Precisão | Design | Pending |
| QF-10 | P1: Gerente | Design | Pending |
| QF-11 | P2: Go-live | Design | Pending |

**Coverage:** 11 total, 0 mapped to tasks, 11 unmapped ⚠️

---

## Success Criteria

- [ ] `npm run test:e2e` verde no login e na responsividade.
- [ ] Componentes-chave acessíveis por teclado.
- [ ] Indicadores e listas determinísticos.
- [ ] Documento de go-live publicado.
