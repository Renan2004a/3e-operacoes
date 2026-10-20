# Panorama do projeto — 3E Operações

Documento de visão geral: **o que é**, **como foi construído** (método e passos), **o que existe hoje** (funcionalidades, fluxos, dados) e **como seguir**. Complementa `docs/execucao.md` (diário por feature) e `.specs/STATE.md` (decisões e handoff).

> Atualizado em 2026-10-18. Números (commits/testes) evoluem; trate como fotografia.

---

## 1. O que é o produto

**3E Operações** é a camada operacional da **3E Ferro e Aço** sobre o **Top Gerente** (ERP legado). O Top Gerente continua sendo a fonte oficial dos dados comerciais; o 3E Operações acompanha o que acontece **depois** da venda.

**Problema:** os pedidos nascem no Top Gerente, mas a execução entre setores (Corte e Dobra, Telhas, Revenda) é controlada em papel/planilha. Não há visão consolidada de produção, disponibilidade, entregas parciais e prazos.

**Solução:** importar o pedido do legado **sob demanda**, organizar os itens por setor, dar fila de trabalho aos operadores, registrar execução/ocorrências/entregas, controlar saldo e prazos, com perfis e permissões — em interface responsiva e acessível.

**Restrições inegociáveis:** o Top Gerente é **somente leitura**; **sem polling contínuo**; dados operacionais do app **nunca** são apagados por ressincronização comercial.

---

## 2. Metodologia aplicada

### 2.1 Governança de agentes (`docs/governanca-agentes.md`)

Hierarquia de precedência: pedido do usuário → skill do Tech Leads Club (método) → docs do projeto (fatos/regras) → skills locais 3E → código existente. **Evidência antes de concluir**: nada é dado como pronto sem teste, typecheck/lint e verificação contra requisito.

### 2.2 Fluxo principal: `tlc-spec-driven` (Tech Leads Club)

Cada feature percorre:

1. **Specify** — critérios de aceitação em **EARS** + rastreabilidade por ID (ex.: `IND-04`, `LAC-04`, `ENT-01`).
2. **Design** — arquitetura da fatia, contratos, decisões.
3. **Tasks** — tarefas atômicas com `Depends on`, `Requirement`, `Done when`, `Tests`, `Gate` e `Commit`.
4. **Execute** — 1 commit atômico por tarefa; lotes de ~7 tarefas por worker.
5. **Verify** — **verificador independente** (autor ≠ verificador): checagem por critério com evidência `arquivo:linha`, **sensor de discriminação** (mutantes mortos) e `validation.md`.

Gates determinísticos da skill: `validate_spec.py`, `validate_tasks.py`, `validate_state.py` (0 erros para avançar).

### 2.3 TDD e qualidade

- `tdd-3e`: teste derivado do critério de aceitação (não do código), falha pelo motivo esperado, menor implementação, refatoração preservando comportamento.
- `docs/testes.md`: prioridade para saldo, disponibilidade, entregas parciais/exceção, perda/refugo, unidades, multi-setor, permissões, prazo, idempotência.
- Meta: 80% nos módulos críticos de domínio (na prática ~96% linhas / ~94% branches).

### 2.4 Subagentes (`docs/subagentes.md`)

- **Orquestrador** (agente principal): especifica, planeja, integra, decide, commita.
- **Batch worker** (`general`): executa lotes de tarefas (implementa → gate → commit).
- **Verifier** independente: valida cada feature.
- **Revisores especializados** (`.opencode/agents/`): `domain-reviewer`, `integration-reviewer`, `security-reviewer`, `test-reviewer`, `frontend-reviewer`, `verifier` (todos sem permissão de edição).

### 2.5 Skills

**Locais do projeto** (`.opencode/skills/`, versionadas):

| Skill | Papel |
| --- | --- |
| `especificacoes-3e` | Rastreabilidade HU/RF/RN ↔ implementação |
| `dominio-3e` | Alinhamento ao modelo de negócio |
| `tdd-3e` | TDD nos comportamentos críticos |
| `integracao-top-gerente` | Somente leitura, idempotência, jobs |
| `seguranca-3e` | Auth, segredos, bordas, auditoria |
| `metricas-software-3e` | Complexidade/acoplamento onde há risco |
| `commits-convencionais` | Padrão de commit (1 por mudança lógica) |

**Tech Leads Club** (`docs/tech-leads-club.md`, instalador fixado `@tech-leads-club/agent-skills@1.4.10`): `tlc-spec-driven`, `coding-guidelines`, `harness-eval`, `create-adr`, `spec-driven-eval`, `frontend-blueprint`, `react-best-practices`, `react-composition-patterns`, `web-design-guidelines`, `accessibility`, `playwright-skill`, `security-best-practices`, `skill-architect`.

---

## 3. Stack e arquitetura

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript 5.9; Prisma 7 + MySQL (`@prisma/adapter-mariadb`); Zod; Tailwind 4 + shadcn/ui; Vitest 5 + Testing Library + Playwright; Node ≥ 22.18.

**Arquitetura:** monolito modular no Railway.

```text
Usuário → Next.js (UI + Route Handlers)
            |-- src/modules/*  (domínio puro, não importa next)
            |-- Prisma → MySQL próprio do app
            +-- HTTPS autenticado → Cloudflare Access/Tunnel → Conector local (connector-local/)
                                                                   |-- MySQL Top Gerente (SELECT)
                                                                   +-- callback → API do app
```

**Limites de código:**

- `src/app/` — páginas, Route Handlers e composição (camada fina). **12 páginas**, **34 rotas de API**.
- `src/modules/` — casos de uso/regras. **10 módulos**: `auth`, `usuarios`, `setores`, `pedidos`, `integracao`, `producao`, `ocorrencias`, `expedicao`, `prazos`, `indicadores`.
- `src/shared/` — infra compartilhada (banco, validação, HTTP, UI).
- `connector-local/` — processo separado na rede da empresa; conhece o schema legado.
- `prisma/` — apenas o schema do banco próprio.

**Padrão:** porta (interface no domínio) + adapter (Prisma/HTTP). Testes de domínio usam **fakes**; o SQL real fica no adapter/conector (AD-002).

---

## 4. Modelo de dados (`prisma/schema.prisma`)

Enums: `UserStatus`, `RoleCode`, `SectorCode`, `MappingStatus`, `ItemClassificationStatus`, `ActivityStatus`, `IntegrationJobStatus`.

Modelos: `User`, `UserRole`, `Sector`, `UserSector`, `CategorySectorMapping`, `ProductSectorRule`, `Order`, `OrderItem`, `Activity`, `Execution`, `Occurrence`, `MotivoOcorrencia`, `Delivery`, `ScheduledDelivery`, `IntegrationJob`, `IntegrationJobEvent`, `AuditLog`.

No MySQL, as **tabelas físicas** usam português (`usuarios`, `pedidos`, `pedidos_itens`, `atividades`, `execucoes`, `ocorrencias`, `entregas`, `remessas_programadas`, `setores`, `regras_produto_setor`, `mapeamentos_categoria_setor`, `jobs_integracao`, `eventos_job_integracao`, `logs_auditoria`, `usuarios_perfis`, `usuarios_setores`, `motivos_ocorrencia`), via `@@map`. Detalhes em `docs/banco-de-dados.md`.

Separação de conceitos:

- **Order/OrderItem** = dados comerciais importados (snapshot do legado).
- **Activity** = unidade operacional (item × setor) — base da fila.
- **Execution / Occurrence / Delivery / ScheduledDelivery** = registros operacionais do app.
- **IntegrationJob/Event**, **AuditLog** = rastreabilidade.

Chaves de negócio: `Order.legacyOrderKey = "emp:orc"`, `OrderItem.legacyItemKey = seq`, mapeamento por `legacyCategory`.

Migrations: `20261007000000_init`, `20261015193341_alertas_remessas_regras`.

---

## 5. Integração com o Top Gerente

Fluxo sob demanda:

1. Usuário informa o número do pedido na UI.
2. `POST /api/integracao/pedidos` valida (Zod), cria `IntegrationJob` **idempotente** e responde `202`.
3. Despacho assíncrono (`after()`) ao **conector local** por HTTPS autenticado.
4. Conector lê `orcamento` + `orcamento_itens` com **SQL parametrizado** e usuário `SELECT`.
5. Conector envia **callback** autenticado → `POST /api/integracao/callback`.
6. App valida (Zod), faz **upsert** de pedido/itens e conclui o job (`SUCCEEDED`/`FAILED`).
7. UI consulta o status do job.

**Idempotência:** repetir a importação não duplica; atualiza dados comerciais e a quantidade solicitada; preserva o histórico operacional. Se a nova quantidade ficar abaixo do executado/entregue, gera **divergência** (`AuditLog` + evento) — nunca apaga histórico.

**Retry:** falhas transitórias são repetidas com backoff (`CONNECTOR_MAX_ATTEMPTS`, `CONNECTOR_RETRY_BACKOFF_MS`); `ORDER_NOT_FOUND` não repete.

**Segurança:** Cloudflare Tunnel expõe o **serviço HTTP** do conector (nunca a porta 3306); credenciais do legado só no ambiente do conector.

---

## 6. Funcionalidades entregues (16 incrementos)

| # | Feature | Requisitos | Tasks | Resultado |
| --- | --- | --- | --- | --- |
| 1 | Importação de pedido por número | RF001, RF017, HU06 | 17 + 6 correções | PASS (FAIL→fix→PASS) |
| 2 | Setores e classificação de itens | RF002, RF015 | 13 | PASS (FAIL→fix→PASS) |
| 3 | Produção e fila de atividades | RF003, RF004, RF007, RF018 | 11 | PASS |
| 4 | Ocorrências (perda/refugo/indisponibilidade) | RF005 | 7 | PASS |
| 5 | Disponibilidade e entregas | RF009, RF010, RF011 | 7 | PASS |
| 6 | Usuários, perfis e permissões | RF013, RF014 | 20 | PASS (FAIL→fix→PASS) |
| 7 | Prazos e alertas | RF012 | 7 | PASS |
| 8 | Indicadores e consulta | RF006, RF008 | 7 | PASS |
| 9 | Frontend — fundação e chão de fábrica | UI | 9 | PASS (fix fail-open) |
| 10 | Frontend — telas dos perfis | UI | 10 | PASS |
| 11 | Qualidade e fechamento | E2E, a11y, go-live | 7 | PASS |
| 12 | Refino visual | UX (`frontend-v4`) | 7 | PASS |
| 13 | Frontend fiel ao protótipo | Fidelidade visual | 7 | PASS |
| 14 | Lacunas operacionais | RF018, RF016/RF017, retry | 8 | PASS |
| 15 | Desmembramento do vendedor (AD-003) | Desmembramento por setor | — | Concluído |
| 16 | Alertas, remessas e sugestão de setor | RF012, RF010, RF002 | 8 | PASS |

`.specs/features/` reúne 15 pastas com `spec/design/tasks/validation`. O diário (`docs/execucao.md`) registra 15 features (a #15 está em AD-003). Todos os `validation.md` estão em **PASS**.

### Destaques da #16 (mais recente)

- **Alertas operacionais** (`IND-11/12`): atrasados, **parados** (sem execução há `ALERTA_PARADO_DIAS`, padrão 5) e **não encaminhados**; `GET /api/indicadores/alertas` + card no painel.
- **Remessas** (`ENT-01..05`): entrega programada por item (número + data prevista + confirmação) via `ScheduledDelivery`; permissão `programar_remessa` (gerente/vendedor).
- **Sugestão de setor** (`LAC-14/15`): regras `ProductSectorRule` (produto→setor) semeadas, pré-selecionadas no desmembramento.
- Correção de fuso: data "somente dia" ancorada ao meio-dia de São Paulo (`interpretarDataPrevista`).

---

## 7. Fluxos por perfil

| Perfil | Fluxo principal |
| --- | --- |
| **Vendedor** | Puxa o pedido do Top Gerente → vê o **setor sugerido** → **desmembra** (classifica itens) → define prazo → programa/confirma **remessa**. Somente leitura na produção. |
| **Operador** | **Fila** dos seus setores → registra **execução** → registra **ocorrência** (perda/refugo/indisponibilidade) → imprime **ordem de produção**. |
| **Gerente de Produção** | **Painel** com indicadores e **alertas** → consulta pedidos → altera status/prioridade/prazo → autoriza exceções de entrega. |
| **Expedição** | Registra **entregas** totais/parciais respeitando o disponível. |
| **Responsável de Sistema** | Administra **usuários**, **setores** e **mapeamento categoria→setor**. |
| **Responsável Técnico** | Acompanha **jobs** de integração e seus **eventos**. |

Fluxo de dados do item: **solicitado → executado (conforme) → disponível → entregue**.

---

## 8. Regras de negócio (`docs/regras-negocio.md`)

- **Pendente** = solicitado − executado conforme.
- **Disponível** = executado conforme − entregue.
- **Perda/refugo não reduzem** a obrigação de produzir quantidade conforme (são registrados separadamente).
- **Revenda** = separação (não produção); indisponibilidade = falta de estoque.
- **Entrega parcial** não conclui o item; **acima do disponível** é bloqueada (exceção: gerente + motivo + auditoria).
- **Prazo opcional**: sem prazo = `SEM_PRAZO`, nunca atrasado.
- **Unidades**: peça (inteiro), metro (2 casas), unidade.
- **Motivo obrigatório** para perda/refugo/indisponibilidade.

---

## 9. Perfis e permissões (`docs/perfis-permissoes.md`)

Matriz implementada em `src/modules/usuarios/permissoes.ts` e aplicada **no servidor** (`autorizar(request, acao)`).

- Operador: setores aos quais pertence; execução/ocorrências.
- Gerente: status, prioridade, prazo, exceções, entregas e remessas.
- Vendedor: consulta todos; prazo, desmembramento e remessas (demais ações negadas).
- Expedição: entregas.
- Responsável pelo Sistema: cadastros.
- Responsável Técnico: integração/logs.

Segurança: senha com **scrypt**; sessão em **cookie httpOnly** assinado (HMAC); callback da integração por **token de serviço**.

---

## 10. Frontend

- Responsivo (celular/tablet/notebook/desktop), mobile-first, alvo **WCAG 2.1 AA**.
- Design system próprio (`src/shared/ui/`): `Button`, `Card`, `Metric`, `Badge`, `Field`, `Input`, `Alert`, `Spinner`, `PageHead`, shell com sidebar/topbar, `ImportarPedido`, `PedidosLista`, `PedidoDetalhe`.
- Referências visuais (`design/inspiracoes/frontend-v4/`) são **inspiração**, não especificação.
- Fluxo de design: `frontend-blueprint` → implementação → `web-design-guidelines` + `accessibility` + Playwright.

---

## 11. Testes e qualidade

- **697 testes unitários** (Vitest + Testing Library) em **96 arquivos** (94 no app + 2 no conector), 0 falhas.
- **4 specs E2E** (Playwright) cobrindo login, responsividade, protótipo e lacunas operacionais.
- CI (`.github/workflows/ci.yml`): `prisma:generate`, `lint`, `typecheck`, `typecheck:connector`, `test`, `build`.
- Verificação por **mutantes** (sensor de discriminação) em cada feature.
- Comandos: `npm test`, `npm run test:coverage`, `npm run test:e2e`.

---

## 12. Deploy, portátil e offline

- **Produção:** `https://3e-operacoes-production.up.railway.app` (Railway; `railway.json` define build/start/healthcheck; domínio na porta `8080`/`PORT`).
- **Deploy por CLI:** `railway up -p <PROJECT_ID> -s 3e-operacoes -e <ENV_ID> -c` (contorna o GitHub quando o auto-deploy falha) — ver `docs/deploy.md`.
- **Banco:** AWS RDS — `3e_operacoes` (app) e `topgerente` (legado, somente leitura).
- **Pacote portátil Windows:** `dist/3e-operacoes-portatil.zip` via `scripts/gerar-portatil.mjs` (`docs/pacote-portatil.md`).
- **Offline/on-premise:** opção A (app na rede da empresa) documentada em `docs/offline-on-premise.md`; RFN008 **adiado**.
- **Go-live:** conector na rede da 3E + Cloudflare Tunnel/Access + usuário `SELECT` (`docs/go-live.md`).

---

## 13. Artefatos e onde encontrar

| Assunto | Arquivo |
| --- | --- |
| Índice para agentes | `AGENTS.md` |
| Estado e decisões | `.specs/STATE.md` (`AD-001`..`AD-004`, handoff) |
| Diário por feature | `docs/execucao.md` |
| Specs por feature | `.specs/features/<slug>/{spec,design,tasks,validation}.md` |
| Requisitos / regras / decisões | `docs/requisitos.md`, `docs/regras-negocio.md`, `docs/decisoes.md` |
| Arquitetura / integração | `docs/arquitetura.md`, `docs/integracao-top-gerente.md` |
| Perfis / frontend / testes | `docs/perfis-permissoes.md`, `docs/frontend.md`, `docs/testes.md` |
| Deploy / operação / go-live | `docs/deploy.md`, `docs/operacao.md`, `docs/go-live.md` |
| Relatório técnico / apresentação | `docs/relatorio-tecnico.md`, `docs/apresentacao-marco-solucao.pdf` |
| Referencial acadêmico | `docs/referencial-artigos-doi.md` |
| Vídeos | `docs/video/` (`demo-fluxo.mp4` = fluxo completo por perfil) |
| Modelo de dados | `docs/modelo-dados/mer.md` + `prisma/schema.prisma` |
| ADR | `docs/adr/0001-integracao-sob-demanda-via-conector-local.md` |
| Skills / subagentes | `.opencode/skills/`, `.opencode/agents/` |

---

## 14. Estado atual e pendências

**Pronto e verificado:** 16 incrementos, 697 testes, build OK, deploy em produção validado, pacote portátil, vídeos e apresentação.

**Pendências conhecidas (não bloqueiam o uso):**

- Dados reais ausentes na instância AWS: `cad_produto`, `cad_cliente`, `cad_vendedor` vazias → **categoria do produto indisponível**, vendedor só com código, lista de motivos ainda não validada pelo cliente.
- **Significado de "pedido atendido" em Revenda** com indisponibilidade — regra pendente.
- **E2E autenticado com banco real** (hoje cobre a superfície pública + testes de unidade das telas).
- **Tela de administração das regras produto→setor** e vínculo automático remessa↔entrega.
- Go-live real depende do conector na rede da 3E + Cloudflare.
- **Segurança a rotacionar:** token do Railway usado nos deploys e credenciais que circularam.

---

## 15. Como seguir

**Rodar local:**

```powershell
npm install
npm run prisma:generate
# .env já configurado (AWS); NÃO sobrescrever com .env.example
npm run dev                                   # http://localhost:3000
npm --workspace connector-local run start     # conector na 8787 (para importar)
```

Login demo: `admin@3e.local/admin123`, `gerente@3e.local/gerente123`, `vendedor@3e.local/vendedor123`, `operador@3e.local/operador123`, `expedicao@3e.local/expedicao123`.

**Para uma nova feature:**

1. Ler `AGENTS.md`, `.specs/STATE.md` e os docs do domínio afetados.
2. Criar `.specs/features/<slug>/{spec,design,tasks}.md` seguindo o `tlc-spec-driven` (critérios EARS + IDs rastreáveis).
3. Implementar em tarefas atômicas (1 commit por tarefa) com testes derivados dos critérios.
4. Verificar com um **verificador independente** e escrever `validation.md` (PASS com evidência).
5. Atualizar `docs/execucao.md`, `.specs/STATE.md` e, se for decisão duradoura, criar ADR em `docs/adr/`.

**Ordem sugerida dos próximos passos:** (a) validar com o cliente a categoria→setor e os motivos; (b) E2E autenticado com banco; (c) tela de regras produto→setor; (d) vínculo remessa↔entrega; (e) go-live (conector + Cloudflare) e rotação de segredos.
