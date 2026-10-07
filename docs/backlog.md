# Backlog de execução — 3E Operações (revisado)

Roadmap de portfólio. Não é um `tasks.md` de feature: cada fase abaixo vira **uma feature** com seu próprio `spec → design → tasks → execute/verify` em `.specs/features/<slug>/`. As tasks atômicas nascem só na fase Tasks de cada feature.

Base: `docs/decisoes.md`, `docs/requisitos.md`, `docs/regras-negocio.md`, `docs/arquitetura.md`, `docs/integracao-top-gerente.md`, `docs/perfis-permissoes.md`, `docs/testes.md`, `prisma/schema.prisma`, `connector-local/`, `.specs/STATE.md` e a verificação do banco AWS.

## Princípios de fonte de dados

- O **banco AWS** (`topgerente`) simula o banco local do Top Gerente. É a fonte para desenvolvimento e testes da integração.
- O **Dump20250825-1.sql** deixa de ser fonte obrigatória. Nenhuma tarefa depende dele.
- O **banco da solução** (Railway/MySQL, Prisma) continua separado e é o único onde a aplicação escreve.
- O `connector-local` lê o legado e devolve por callback. A arquitetura fica pronta para, no futuro, trocar a conexão AWS pela conexão real do Top Gerente sem reescrever regra de negócio.
- Credenciais só em variáveis de ambiente. Nada de senha em código, logs, commits ou docs públicos.

## Achados da verificação AWS (2026-10-06)

- `orcamento`: 82.223 linhas; `orcamento_itens`: 278.824 linhas. Dados reais até 25/08/2025.
- Join confirmado: `orcamento o JOIN orcamento_itens i ON o.Emp = i.Emp AND o.Orc = i.Orc`.
- Pedido de amostra: `70435` (5 itens, cliente "MARCO ANTONIO DE OLIVEIRA").
- **Vazias na instância**: `cad_produto`, `cad_cliente`, `cad_vendedor`, `grupo`, `familia`, `cad_familia_produto`, `cad_categoria_ecommerce`.
- Consequências: cliente vem denormalizado em `orcamento.nome_cliente`; vendedor só tem código (`Vend`); **categoria de produto não existe nesta instância**.

## Como isso se liga ao spec-driven

- Backlog = roadmap (este arquivo). Coarse, sem tasks atômicas.
- Cada fase = uma feature com `.specs/features/<slug>/{spec,design,tasks}.md`.
- Já iniciada: **Fase 2 → `importacao-pedido-por-numero`** (spec, design e tasks prontos).
- Artefatos de sugestão (entrada para validação, não regra):
  - `docs/backlog/categoria-setor.md`
  - `docs/backlog/motivos-ocorrencia.md`

---

## Fase 0 — Descoberta (NÃO bloqueante)

Descoberta que corre em paralelo ao desenvolvimento. Nada aqui bloqueia a Fase 2.

- **T00.1 (revisada) — Verificar a estrutura do banco AWS `topgerente`**: identificar tabelas e relacionamentos de pedido, item, cliente, vendedor e produto/categoria. *Parcialmente concluída* (ver "Achados"). Não usa o Dump.
- **T00.2 (revisada) — Classificar produto/categoria → setor**: montar a tabela em `docs/backlog/categoria-setor.md`, com coluna de classificação (automática / validar / não identificado). Alimenta `CategorySectorMapping`. Não inventa produtos.
- **T00.3 (revisada) — Sugerir 3 motivos por setor**: `docs/backlog/motivos-ocorrencia.md`. Sugestão da IA, pendente de validação do gerente Everton. Não é regra definitiva.
- **T00.4 (mantida) — Validar "pedido atendido" em Revenda com indisponibilidade**: `docs/regras-negocio.md` afirma que o significado ainda precisa ser validado. Fica como validação de regra, sem bloquear.
- **T00.5 (revisada) — Documentar a conexão AWS**: variáveis de ambiente, teste de leitura e como trocar pela conexão real do Top Gerente depois. Sem caráter bloqueante.
- **T00.6 (nova) — Registrar a estratégia de troca de fonte**: documentar que a aplicação deve poder passar de AWS para o Top Gerente real com o mínimo de alteração (porta/adapter no `connector-local`).

Revisor: `integration-reviewer`.

---

## Fase 1 — Fundação técnica

- **T01.1 — Provisionar Railway**: app Next.js + MySQL próprio; variáveis a partir de `.env.example`.
- **T01.2 — Primeira migration do `prisma/schema.prisma`** + `prisma:generate`; confirmar conexão do adapter MariaDB.
- **T01.3 — Skills do Tech Leads Club**: instalar e versionar conforme `docs/tech-leads-club.md`.
- **T01.4 — GitHub Actions**: lint, typecheck, testes e build em cada PR.
- **T01.5 (movida para go-live) — Cloudflare Tunnel/Access na frente do `connector-local`**. Não bloqueia o desenvolvimento (AWS é acessível diretamente).
- **T01.6 (movida para go-live) — Usuário MySQL somente `SELECT` no Top Gerente real**. Não bloqueia; em desenvolvimento usa-se a AWS.

Revisor: `security-reviewer` (T01.5/T01.6), `verifier` (T01.1–T01.4).

---

## Fase 2 — Integração sob demanda (RF001, RF017) — FEATURE JÁ ESPECIFICADA

Feature: `.specs/features/importacao-pedido-por-numero/` (spec, design e tasks prontos).

- **T02.1** Spec da feature "importar pedido por número". ✅ Concluída.
- **T02.2** `POST /api/integracao/pedidos`: valida número (Zod), cria `IntegrationJob` idempotente, responde `202`.
- **T02.3** Chamada Railway → conector: HTTPS autenticado (`LOCAL_CONNECTOR_BASE_URL`/`LOCAL_CONNECTOR_TOKEN`).
- **T02.4** Consulta real no `connector-local` contra a **AWS** (`orcamento` + `orcamento_itens`).
- **T02.5** Callback do conector para `POST /api/integracao/callback` (`CONNECTOR_CALLBACK_TOKEN`).
- **T02.6** Upsert de `Order`/`OrderItem` por `legacyOrderKey`; atualizar `IntegrationJob`/`IntegrationJobEvent`.
- **T02.7** Idempotência: repetir sincronização não duplica; atualiza dados comerciais e `requestedQuantity`.
- **T02.8** Divergência: nova quantidade menor que executado/entregue gera registro, nunca apaga histórico.
- **T02.9** Status do job para o usuário.
- **T02.10** Logs técnicos e monitoramento de falhas (RF017), sem senha/token/CPF completo.

Revisor: `integration-reviewer` + `security-reviewer`. Skill: `integracao-top-gerente`.

---

## Fase 3 — Setores e classificação de itens (RF002, RF015)

- **T03.1** CRUD/seed de `Sector` (Corte e Dobra, Telhas, Revenda).
- **T03.2** `CategorySectorMapping`: categoria do legado → setor; item sem mapeamento fica `PENDING_CLASSIFICATION`.
- **T03.3** Classificação manual de itens pendentes.
- **T03.4** Auditoria de alteração do mapeamento (`AuditLog`).

Revisor: `domain-reviewer`. Skill: `dominio-3e`. Insumo: `docs/backlog/categoria-setor.md`.

---

## Fase 4 — Produção (RF003, RF004, RF007, RF018; RN de saldo)

- **T04.1** Fila de atividades por setor (`Activity`), filtrando pelos setores do usuário (`UserSector`).
- **T04.2** Registro de execução (`Execution`).
- **T04.3** Saldo pendente = `Solicitado − Produzido conforme` (perda/refugo não contam). Testes primeiro.
- **T04.4** Prioridades de atividades.
- **T04.5** Unidades e casas decimais por setor (peça inteiro; metro 2 casas).
- **T04.6** Impressão de ordem de produção (RF018).

Revisor: `domain-reviewer` + `test-reviewer`. Skill: `tdd-3e`.

---

## Fase 5 — Ocorrências (RF005)

- **T05.1** Registro de ocorrência (`Occurrence`): perda, refugo, indisponibilidade, pausa, parada.
- **T05.2** Motivo obrigatório por lista fechada, por setor. Insumo: `docs/backlog/motivos-ocorrencia.md` (validar com Everton).
- **T05.3** Alertas ao gerente para ocorrências críticas (RF012).

Revisor: `domain-reviewer`.

---

## Fase 6 — Expedição e entregas (RF009, RF010, RF011; RN005)

- **T06.1** Disponibilidade = `executado conforme − entregue`.
- **T06.2** Registrar entrega total/parcial (`Delivery`), restrito a Expedição e Gerente.
- **T06.3** Bloqueio de entrega acima do disponível; exceção só do gerente com motivo e auditoria.
- **T06.4** Saldo consolidado do pedido.
- **T06.5** Histórico de entregas.

Revisor: `domain-reviewer` + `security-reviewer`.

---

## Fase 7 — Usuários, perfis e permissões (RF013, RF014)

- **T07.1** Autenticação e autorização no servidor.
- **T07.2** CRUD de usuários e associação N:N usuário↔setor.
- **T07.3** Matriz de perfis (`docs/perfis-permissoes.md`).
- **T07.4** Bloquear no backend ações do Vendedor fora de consulta e prazo.

Revisor: `security-reviewer`. Skill: `seguranca-3e`.

---

## Fase 8 — Prazos e alertas (RF012)

- **T08.1** Prazo opcional por item/setor.
- **T08.2** Status `SEM_PRAZO`, nunca atrasado sem data.
- **T08.3** Cálculo de atraso só com prazo conhecido e ultrapassado.

Revisor: `domain-reviewer`.

---

## Fase 9 — Indicadores e dashboard (RF006)

- **T09.1** Visão consolidada do gerente.
- **T09.2** Filtros por pedido, cliente, setor, status e período.
- **T09.3** Indicadores de PCP.

Revisor: `frontend-reviewer` + `domain-reviewer`.

---

## Fase 10 — Frontend (Next.js/React/Tailwind/shadcn)

Referências visuais orientam, não são especificação.

- **T10.1** `frontend-blueprint` antes de cada área.
- **T10.2** Design system base.
- **T10.3** Layout responsivo mobile-first.
- **T10.4** Telas de chão de fábrica.
- **T10.5** Acessibilidade WCAG 2.1 AA (`web-design-guidelines`, `accessibility`, Playwright).

Revisor: `frontend-reviewer`.

---

## Fase 11 — Qualidade contínua (transversal)

- **T11.1** Vitest para regras de domínio (TDD).
- **T11.2** Testing Library para componentes críticos.
- **T11.3** Playwright E2E por perfil.
- **T11.4** Cobertura de 80% nos módulos críticos de domínio.
- **T11.5** Verifier independente antes de cada feature pronta.
- **T11.6** Datas em UTC, exibidas em `America/Sao_Paulo`.

---

## Fase 12 — Go-live / produção (nova, não bloqueante para o dev)

- **T12.1** Instalar `connector-local` no ambiente da 3E.
- **T12.2** Cloudflare Tunnel/Access na frente do conector.
- **T12.3** Usuário MySQL `SELECT` no Top Gerente real, restrito às tabelas mapeadas.
- **T12.4** Trocar a conexão AWS pela conexão real do Top Gerente (mesmo adapter).

Revisor: `security-reviewer` + `integration-reviewer`.

---

## A) Tarefas removidas

Nenhuma tarefa foi apagada. Foram removidas **dependências**:

| Item removido | Motivo |
| --- | --- |
| Uso obrigatório do `Dump20250825-1.sql` em T00.1 | A AWS é a fonte de referência; o dump não é mais fonte obrigatória. |
| Caráter bloqueante de T00.5 | A AWS permite desenvolver e testar sem o banco físico do cliente. |
| Bloqueio da Fase 0 sobre a Fase 2 | Descoberta passa a correr em paralelo. |
| Dependência de Cloudflare/instalação no cliente para o dev | Movida para a Fase 12 (go-live). |

## B) Tarefas modificadas

| ID | Antes | Depois | Motivo |
| --- | --- | --- | --- |
| T00.1 | Mapear joins no Dump | Verificar estrutura no banco AWS `topgerente` | AWS é a fonte; sem dump. |
| T00.2 | Levantar categorias do Top Gerente | Classificar categoria/produto → setor em tabela com classificação | Direção do professor; alimenta `CategorySectorMapping`. |
| T00.3 | Levantar motivos com Everton | Sugerir 3 motivos por setor (IA), pendente de validação | Direção do professor; sugestão, não regra. |
| T00.4 | (mantida) | Mantida como validação, não bloqueante | `docs/regras-negocio.md` ainda não define o caso. |
| T00.5 | Confirmar acesso real e instalação | Documentar conexão AWS e troca futura | AWS disponível; sem bloqueio. |
| T01.5 | Configurar Cloudflare | Movida para Fase 12 (go-live) | Não bloqueia o desenvolvimento. |
| T01.6 | Criar usuário SELECT no Top Gerente | Movida para Fase 12 (go-live) | Em dev usa-se a AWS. |
| T02.4 | Query real usando tabelas de T00.1 | Query real contra a AWS | Fonte definida. |

## C) Novas tarefas

| ID | Tarefa | Fonte |
| --- | --- | --- |
| T00.6 | Documentar a estratégia de troca AWS → Top Gerente real | `docs/arquitetura.md` |
| T02.9 | Tela/consulta de status do job | RF017 |
| T12.1–T12.4 | Fase de go-live | ADR 0001 |

## D) Backlog completo revisado

Fases 0 a 12 conforme acima, na ordem: descobrir/validar AWS → conexão segura → integração → importar pedido → classificar produtos/categorias → associar categorias a setores → produção → ocorrências → expedição/entregas → usuários/permissões → indicadores → frontend/testes → go-live.

## E) Dependências

| Fase | Depende de | Bloqueante? | Fonte de dados |
| --- | --- | --- | --- |
| Fase 0 | — | Não | AWS |
| Fase 1 | — | Não | Banco da solução |
| Fase 2 | Fase 1 (schema/migration) | Sim, para persistir | AWS |
| Fase 3 | Fase 2 | Não (pode iniciar com seeds) | AWS + `docs/backlog/categoria-setor.md` |
| Fase 4 | Fase 3 | Sim | Banco da solução |
| Fase 5 | Fase 4 | Sim | Banco da solução |
| Fase 6 | Fase 4 | Sim | Banco da solução |
| Fase 7 | — | Não (transversal) | Banco da solução |
| Fase 8 | Fase 3 | Não | Banco da solução |
| Fase 9 | Fases 3–6 | Não | Banco da solução |
| Fase 10 | Fases 3–9 | Parcial | Banco da solução |
| Fase 11 | Transversal | Não | — |
| Fase 12 | Go-live | Não (pós-dev) | Top Gerente real |

## F) Tabela final

| ID | Tarefa | Dependência | Fonte dos dados | Revisor | Observação |
| --- | --- | --- | --- | --- | --- |
| T00.1 | Verificar estrutura AWS | — | AWS | integration-reviewer | Parcialmente concluída |
| T00.2 | Classificar categoria → setor | — | AWS + CSV | integration-reviewer | Sugestão a validar |
| T00.3 | 3 motivos por setor | — | Docs + IA | integration-reviewer | Validar com Everton |
| T00.4 | "Pedido atendido" em Revenda | — | Docs | domain-reviewer | Regra pendente |
| T00.5 | Documentar conexão AWS | — | AWS | security-reviewer | Não bloqueante |
| T00.6 | Troca AWS → real | T00.5 | Docs | integration-reviewer | Nova |
| T01.1 | Provisionar Railway | — | — | verifier | — |
| T01.2 | Migration inicial | T01.1 | Banco da solução | verifier | — |
| T01.3 | Skills TLC | — | — | verifier | — |
| T01.4 | GitHub Actions | — | — | verifier | — |
| T02.* | Integração por número | Fase 1 | AWS | integration/security | Feature `importacao-pedido-por-numero` |
| T03.1–4 | Setores e classificação | Fase 2 | Banco da solução | domain-reviewer | Insumo T00.2 |
| T04.1–6 | Produção | Fase 3 | Banco da solução | domain/test | — |
| T05.1–3 | Ocorrências | Fase 4 | Banco da solução | domain-reviewer | Insumo T00.3 |
| T06.1–5 | Expedição/entregas | Fase 4 | Banco da solução | domain/security | — |
| T07.1–4 | Usuários/permissões | — | Banco da solução | security-reviewer | — |
| T08.1–3 | Prazos e alertas | Fase 3 | Banco da solução | domain-reviewer | — |
| T09.1–3 | Indicadores | Fases 3–6 | Banco da solução | frontend/domain | — |
| T10.1–5 | Frontend | Fases 3–9 | Banco da solução | frontend-reviewer | — |
| T11.1–6 | Qualidade | Transversal | — | test/verifier | — |
| T12.1–4 | Go-live | Pós-dev | Top Gerente real | security/integration | Não bloqueante |
