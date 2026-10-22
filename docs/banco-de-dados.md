# Banco de dados do 3E Operações

Documento para inspeção e manutenção do banco: **qual banco é qual**, **como o fluxo funciona**, **por que cada tabela existe**, **relacionamentos**, **nomenclatura**, **migrations/seed** e **como abrir no DBeaver**. Nenhuma credencial aparece aqui.

---

## 1. Dois bancos com papéis diferentes

| Banco | Onde | Dono | Escrita | Conteúdo |
| --- | --- | --- | --- | --- |
| **`topgerente`** | MySQL do Top Gerente (RDS AWS em dev; servidor da 3E em produção) | ERP legado | **Nenhuma** (somente `SELECT`) | Pedidos comerciais (`orcamento`, `orcamento_itens`), clientes, vendedores, catálogo |
| **`3e_operacoes`** | MySQL do app (RDS AWS em dev; Railway em produção) | 3E Operações | **Somente o app** | Snapshot dos pedidos + toda a operação (atividades, execuções, ocorrências, entregas, remessas, usuários, auditoria) |

- O **Top Gerente é a fonte oficial do comercial** e **nunca** é alterado pelo app.
- A leitura do legado é feita pelo **conector local** (`connector-local/`), com SQL parametrizado e usuário `SELECT`, atrás de Cloudflare Tunnel/Access.
- O app **não** acessa o MySQL do legado diretamente; recebe os dados por callback autenticado.

```text
Navegador → App (Railway) → Prisma → MySQL 3e_operacoes
                    │
                    └─ HTTPS → Cloudflare Access/Tunnel → conector local → MySQL topgerente (SELECT)
```

---

## 2. Banco local de desenvolvimento

O `docker-compose.yml` sobe um MySQL 8.4 local:

| Item | Valor padrão |
| --- | --- |
| Container | `3e-mysql` |
| Host/porta | `127.0.0.1:3306` |
| Base | `3e_operacoes` |
| Usuário/senha | `app` / `app` (apenas local) |
| Volume | `3e-mysql-data` |
| `DATABASE_URL` | `mysql://app:app@127.0.0.1:3306/3e_operacoes` |

```powershell
npm run db:up          # sobe o MySQL local
npm run prisma:deploy  # aplica as migrations
npm run prisma:seed    # setores, motivos, usuários e regras produto→setor
npm run dev            # app em http://localhost:3000
```

> O projeto **não depende do Docker**: qualquer MySQL 8 com a `DATABASE_URL` correta funciona. O Docker é só o caminho mais simples no Windows.

---

## 3. Banco do ambiente hospedado

- **Aplicação**: Railway (serviço `3e-operacoes`), `DATABASE_URL` no MySQL do app.
- **Banco do app**: schema **`3e_operacoes`** (AWS RDS em dev; Railway/MySQL em produção).
- **Legado**: schema **`topgerente`** (AWS em dev; Top Gerente real em produção), somente leitura.
- **Credenciais**: apenas em variáveis de ambiente/cofre. Nunca no Git.

Variáveis do app (sem valores): `DATABASE_URL`, `SESSION_SECRET`, `APP_INTERNAL_TOKEN`, `LOCAL_CONNECTOR_BASE_URL`, `LOCAL_CONNECTOR_TOKEN`, `CONNECTOR_CALLBACK_TOKEN`, `CONNECTOR_TIMEOUT_MS`, `APP_TIMEZONE`.

Variáveis do conector (sem valores): `TOPGERENTE_HOST`, `TOPGERENTE_PORT`, `TOPGERENTE_DATABASE`, `TOPGERENTE_USER`, `TOPGERENTE_PASSWORD`, `TOPGERENTE_EMPRESA`, `CONNECTOR_SHARED_TOKEN`, `RAILWAY_CALLBACK_URL`, `CONNECTOR_CALLBACK_TOKEN`, `PORT`.

---

## 4. Como o banco funciona (fluxo)

O banco do app é um **registro operacional** construído em camadas. O fluxo real é:

### 4.1 Importação (comercial → app)

1. O usuário informa o número do pedido.
2. O app cria um **job** em `jobs_integracao` (idempotente) e chama o conector. O usuário autenticado que solicitou a importação deve ser registrado em `logs_auditoria` (aprovado em 2026-10-22; sem nova coluna nem tabela; implementação pendente).
3. O conector lê `topgerente.orcamento` + `orcamento_itens` (somente leitura) e devolve o payload.
4. O app grava (upsert) **`pedidos`** e **`pedidos_itens`**; cada transição vira um **`eventos_job_integracao`**.
5. Se a nova quantidade solicitada conflitar com o que já foi executado/entregue, registra **`logs_auditoria`** (divergência) — nunca apaga histórico.

### 4.2 Desmembramento (item → setor)

6. O vendedor/gerente escolhe o setor de cada item. Nasce uma **`atividades`** (item × setor) e o item fica `CLASSIFIED`.
7. A sugestão de setor usa **`regras_produto_setor`** (heurística) e o de/para **`mapeamentos_categoria_setor`**. A decisão final é humana.
8. O item também pode receber **prazo de entrega** (`OrderItem.deadlineAt`) e **remessas programadas** (`remessas_programadas`). A atividade recebe o **prazo operacional** (`Activity.deadlineAt`), independente do prazo do item.
   - O prazo é uma **data civil** no formato `YYYY-MM-DD`, persistida como o **fim do dia em `America/Sao_Paulo`** (ex.: `2026-02-01` → `2026-02-02T02:59:59.999Z`). Por isso o prazo de hoje só fica atrasado depois que o dia termina.
   - Prazos gravados antes do AD-009 (meia-noite UTC) não são convertidos automaticamente. Se houver dados reais nesse formato, a conversão exige autorização específica; em ambiente de demonstração, basta re-salvar o prazo pela interface.

### 4.3 Produção e ocorrências

9. O operador vê a fila pelas **`atividades`** dos seus setores.
10. Cada produção/separação vira uma **`execucoes`** (quantidade, usuário, data).
11. Perda/refugo/indisponibilidade/pausa/parada viram **`ocorrencias`**, com **`motivos_ocorrencia`** quando exigido.
12. Perda/refugo **não** reduzem o saldo pendente; o item continua devendo quantidade conforme.

### 4.4 Entrega

13. A **remessa** (`remessas_programadas`) é a **previsão** de entrega (número + data + confirmação). Não altera saldo.
14. A **`entregas`** é a entrega **realizada** (quantidade, disponível antes, exceção gerencial). É ela que reduz o disponível.
15. Entrega acima do disponível fica bloqueada; o gerente pode autorizar com motivo, e isso vai para **`logs_auditoria`**.

### 4.5 Leitura gerencial e acesso

16. Indicadores e alertas são **consultas** sobre `atividades`, `execucoes`, `entregas` e prazos (sem tabela de “dashboard”).
17. **`usuarios`**, **`usuarios_perfis`** e **`usuarios_setores`** controlam quem entra e em quais setores atua.
18. **`logs_auditoria`** registra ações sensíveis. Hoje grava: exceções de entrega, mapeamentos e correções de setor, e divergências de importação. *Correção de 2026-10-22:* a versão anterior dizia que prazos também eram auditados; **prazos e remessas ainda não gravam auditoria** no código. A auditoria de prazos é documentada como pendente de implementação, e a de remessas aguarda decisão (D6).

---

## 5. Por que cada entidade existe

| Tabela física | Modelo Prisma | Por que existe |
| --- | --- | --- |
| `usuarios` | `User` | Autenticação, status e vínculo com execuções/entregas |
| `usuarios_perfis` | `UserRole` | Um usuário pode ter mais de um perfil (N:N com `RoleCode`) |
| `setores` | `Sector` | Os três setores operacionais e a fila de trabalho |
| `usuarios_setores` | `UserSector` | Operador pode atuar em vários setores (N:N) |
| `mapeamentos_categoria_setor` | `CategorySectorMapping` | De/para categoria do legado → setor (configurável e auditável) |
| `regras_produto_setor` | `ProductSectorRule` | Sugestão de setor pelo produto (heurística, não decide sozinha) |
| `pedidos` | `Order` | Snapshot do cabeçalho comercial importado do Top Gerente |
| `pedidos_itens` | `OrderItem` | Snapshot de cada linha comercial (produto, unidade, quantidade, prazo, classificação) |
| `atividades` | `Activity` | **Unidade operacional** (item × setor); é o que vai para a fila |
| `execucoes` | `Execution` | Produção (Corte/Telhas) ou separação (Revenda) |
| `ocorrencias` | `Occurrence` | Perda, refugo, indisponibilidade, pausa, parada, defeito |
| `motivos_ocorrencia` | `MotivoOcorrencia` | Lista fechada de motivos por tipo |
| `entregas` | `Delivery` | Entrega **realizada** (total/parcial) e exceção gerencial |
| `remessas_programadas` | `ScheduledDelivery` | Entrega **prevista** (remessa) com data e confirmação |
| `jobs_integracao` | `IntegrationJob` | Controle do job on-demand (idempotência, retry, erro) |
| `eventos_job_integracao` | `IntegrationJobEvent` | Trilha do job (despacho, retorno, falha) |
| `logs_auditoria` | `AuditLog` | Auditoria de ações sensíveis (referências lógicas, sem FK) |

> **`remessas_programadas` ≠ `entregas`**: a primeira é previsão; a segunda é a baixa real. A soma das remessas não calcula o disponível.

---

## 6. Relacionamentos (nomes físicos)

```mermaid
erDiagram
    usuarios ||--|{ usuarios_perfis : possui
    usuarios ||--o{ usuarios_setores : atua
    setores ||--o{ usuarios_setores : agrupa
    setores ||--o{ mapeamentos_categoria_setor : direciona
    setores ||--o{ regras_produto_setor : sugere
    pedidos ||--|{ pedidos_itens : contem
    pedidos_itens ||--o{ atividades : origina
    setores ||--o{ atividades : executa
    atividades ||--o{ execucoes : registra
    atividades ||--o{ ocorrencias : sofre
    motivos_ocorrencia ||--o{ ocorrencias : justifica
    pedidos_itens ||--o{ entregas : entrega
    pedidos_itens ||--o{ remessas_programadas : programa
    usuarios ||--o{ execucoes : realiza
    usuarios ||--o{ ocorrencias : reporta
    usuarios ||--o{ entregas : registra_ou_autoriza
    pedidos ||--o{ jobs_integracao : sincroniza
    jobs_integracao ||--|{ eventos_job_integracao : registra
```

Chaves de negócio (unicidade):

- `pedidos.legacyOrderKey`
- `pedidos_itens (orderId, legacyItemKey)`
- `atividades (orderItemId, sectorId)`
- `remessas_programadas (orderItemId, remessa)`
- `mapeamentos_categoria_setor.legacyCategory`
- `motivos_ocorrencia (tipo, codigo)`
- `jobs_integracao.idempotencyKey`

---

## 7. Nomenclatura adotada (padronizada em português)

| Camada | Padrão | Exemplo |
| --- | --- | --- |
| **Tabelas físicas (MySQL)** | português, `snake_case`, plural | `pedidos`, `pedidos_itens`, `remessas_programadas` |
| **Constraints/índices** | derivados do nome físico | `pedidos_itens_orderId_fkey` |
| **Modelos Prisma (código)** | inglês (mantidos) | `model Order` |
| **Mapeamento** | `@@map("pedidos")` | o código continua `prisma.order.findMany()` |
| **Colunas** | inglês (identificadores técnicos) | `legacyOrderKey`, `scheduledAt` |
| **UI, MER e documentos** | português | “Pedido”, “Remessa”, “Atividade” |

**Por que os modelos e colunas continuam em inglês?** Para não quebrar todo o código de domínio, testes, APIs e o client Prisma. A padronização exigida foi aplicada no **nome das tabelas** (o que aparece no DBeaver), com `@@map`; o de/para está na tabela abaixo. Uma tradução das colunas seria uma segunda fase, com `@map` em cada campo e migration de `RENAME COLUMN` — não foi feita para evitar risco desnecessário.

### De/para (antes → depois)

| Antes | Depois |
| --- | --- |
| `User` | `usuarios` |
| `UserRole` | `usuarios_perfis` |
| `Sector` | `setores` |
| `UserSector` | `usuarios_setores` |
| `CategorySectorMapping` | `mapeamentos_categoria_setor` |
| `ProductSectorRule` | `regras_produto_setor` |
| `Order` | `pedidos` |
| `OrderItem` | `pedidos_itens` |
| `Activity` | `atividades` |
| `Execution` | `execucoes` |
| `Occurrence` | `ocorrencias` |
| `MotivoOcorrencia` | `motivos_ocorrencia` |
| `Delivery` | `entregas` |
| `ScheduledDelivery` | `remessas_programadas` |
| `IntegrationJob` | `jobs_integracao` |
| `IntegrationJobEvent` | `eventos_job_integracao` |
| `AuditLog` | `logs_auditoria` |

A migration `20261020213000_padroniza_tabelas_portugues` usa **`RENAME TABLE`** (preserva dados, índices e FKs) e a `20261020213500_padroniza_constraints_portugues` normaliza os nomes de FKs/índices. Nenhum dado foi recriado ou apagado.

---

## 8. Migrations e seed

| Migration | Conteúdo |
| --- | --- |
| `20261007000000_init` | Schema inicial |
| `20261015193341_alertas_remessas_regras` | `ProductSectorRule` e `ScheduledDelivery` |
| `20261020213000_padroniza_tabelas_portugues` | `RENAME TABLE` para os nomes em português |
| `20261020213500_padroniza_constraints_portugues` | Normaliza nomes de FKs e índices |

```powershell
npm run prisma:migrate   # desenvolvimento (cria/aplica)
npm run prisma:deploy    # ambientes existentes (aplica sem recriar)
npm run prisma:seed      # idempotente: setores, motivos, usuários demo e 14 regras
```

O seed cria setores, 9 motivos sugeridos, usuários de demonstração e as regras de sugestão. É seguro rodar mais de uma vez (upsert).

---

## 9. Como inspecionar no DBeaver (banco local)

1. Suba o banco: `npm run db:up`.
2. No DBeaver: **Nova conexão → MySQL**.
3. Preencha:
   - **Host**: `127.0.0.1`
   - **Port**: `3306`
   - **Database**: `3e_operacoes`
   - **Username**: `app`
   - **Password**: `app`
4. Em **Driver properties**, se necessário, `allowPublicKeyRetrieval=true` e `useSSL=false`.
5. **Test Connection** → **Finish**.
6. Em `3e_operacoes` → `Tables`, você verá as tabelas em português: `usuarios`, `pedidos`, `pedidos_itens`, `atividades`, `execucoes`, `ocorrencias`, `entregas`, `remessas_programadas`, etc.

Consultas úteis:

```sql
-- Pedidos importados e quantidade de itens
SELECT p.legacyNumber, p.customerName, COUNT(i.id) AS itens
FROM pedidos p LEFT JOIN pedidos_itens i ON i.orderId = p.id
GROUP BY p.id ORDER BY p.legacyNumber;

-- Saldo por item de Corte e Dobra e Telhas (pendente = solicitado - executado).
-- Não usar para Revenda: lá vale a RN031 (pendente = solicitado - separado - indisponível).
SELECT p.legacyNumber, i.description, i.requestedQuantity,
       COALESCE(SUM(e.quantity), 0) AS executado,
       i.requestedQuantity - COALESCE(SUM(e.quantity), 0) AS pendente
FROM pedidos_itens i
JOIN pedidos p ON p.id = i.orderId
LEFT JOIN atividades a ON a.orderItemId = i.id
LEFT JOIN execucoes e ON e.activityId = a.id
GROUP BY i.id ORDER BY p.legacyNumber;

-- Remessas programadas
SELECT p.legacyNumber, r.remessa, r.scheduledAt, r.confirmedAt
FROM remessas_programadas r
JOIN pedidos_itens i ON i.id = r.orderItemId
JOIN pedidos p ON p.id = i.orderId
ORDER BY p.legacyNumber, r.remessa;

-- Entregas realizadas
SELECT p.legacyNumber, i.description, d.quantity, d.occurredAt
FROM entregas d
JOIN pedidos_itens i ON i.id = d.orderItemId
JOIN pedidos p ON p.id = i.orderId
ORDER BY d.occurredAt DESC;
```

> Para o **banco hospedado**, use a `DATABASE_URL` do ambiente (nunca no Git) e trate como **produção**: apenas leitura, sem `UPDATE`/`DELETE` manuais.

---

## 10. O que vem do Top Gerente × o que é operacional

| Origem | Dados |
| --- | --- |
| **Top Gerente (importado)** | Número do pedido, cliente, vendedor, código/descrição do produto, unidade e quantidade solicitada |
| **3E Operações (operacional)** | Classificação por setor, prazos, execuções, ocorrências, entregas, remessas, usuários/perfis, auditoria e jobs |

A ressincronização atualiza apenas o **comercial** e **nunca apaga** execução, ocorrência, entrega ou remessa. Se a nova quantidade solicitada ficar abaixo do executado/entregue, o app registra **divergência** em `logs_auditoria`/evento do job.

---

## 11. Segurança e cuidados

- Nunca apague/recrie o banco para “padronizar”: use migrations.
- Nunca rode `prisma migrate reset` contra o banco hospedado.
- O usuário do legado deve ser **somente `SELECT`**, restrito às tabelas mapeadas.
- Não logar senha, token, CPF completo ou payload comercial desnecessário.
- Rotacione credenciais que tenham circulado.

---

## 12. Estado observado no ambiente de desenvolvimento (2026-10-20)

Contagem de registros (ambiente AWS de desenvolvimento, sem dados pessoais):

| Tabela | Registros |
| --- | --- |
| `usuarios` | 7 |
| `usuarios_perfis` | 7 |
| `setores` | 3 |
| `usuarios_setores` | 6 |
| `mapeamentos_categoria_setor` | 1 |
| `regras_produto_setor` | 14 |
| `pedidos` | 7 |
| `pedidos_itens` | 60 |
| `atividades` | 12 |
| `execucoes` | 12 |
| `ocorrencias` | 11 |
| `motivos_ocorrencia` | 9 |
| `entregas` | 6 |
| `remessas_programadas` | 1 |
| `jobs_integracao` | 7 |
| `eventos_job_integracao` | 58 |
| `logs_auditoria` | 1 |

Pedidos reais usados na validação: `70435`, `82249`, `82250`, `82261`, `82262`, `82268`, `82269`.

> O schema Prisma é a fonte da verdade: `prisma/schema.prisma`. O DER conceitual está em `docs/modelo-dados/der.html` e `der.mmd`.

---

## 13. Mudanças de banco: aprovadas, pendentes ou não necessárias (2026-10-22)

Nenhuma migração foi executada nem aplicada nesta etapa. Esta tabela registra o que foi decidido para o planejamento das correções do Vendedor.

| Mudança | Situação | Observação |
| --- | --- | --- |
| Usuário solicitante da importação | **Aprovada**, sem alteração de schema | Registrar em `logs_auditoria`, reutilizando o mecanismo existente. |
| Semântica do prazo (AD-009) | **Aprovada**, sem alteração de schema | Data civil `YYYY-MM-DD` persistida no fim do dia em `America/Sao_Paulo`. Nenhuma migração. |
| Auditoria de alteração de prazo (item e atividade) | **Adiada (D7)**, não implementada | Fica para etapa própria de RFN006. Nenhuma auditoria existente foi removida. |
| Remoção de prazo | **Adiada (D3)** | Registrar no backlog; não há contrato para limpar `deadlineAt`. |
| Alerta comercial por prazo de entrega | **Adiado (D4)** | Depende do critério de atendimento integral da AD-011. Não usar quantidade executada como substituta da entregue. |
| Data de entrega do Top Gerente | **Não importada (D8)** | Conector e contrato inalterados; nenhuma regra de precedência criada. |
| Normalização de prazos antigos | **Não executada (D6)** | Sem script e sem migration. Em ambiente de demonstração, re-salvar pela interface. Dados reais exigem autorização específica. |
| Cancelamento lógico de item | **Pendente** | Conceito aprovado. Depende do contrato do conector e de decisão sobre o campo em `pedidos_itens`. Nenhum campo criado. |
| Auditoria de remessas (programar, confirmar, remover) | **Pendente** | Aguarda decisão D6 de remessas (AD-016). |
| Referência de data original do pedido | **Pendente** | Hoje `pedidos.sourceUpdatedAt` recebe `orcamento.Data` (data do orçamento, não de atualização). O nome do campo é enganoso. Validação no ambiente de integração antes de qualquer uso. |
| Persistência do status do pedido | **Não aprovada** | Status é derivado a partir dos itens ativos. Evitar novo estado persistido. |
| Tratamento de divergências (fluxo, tabela ou status) | **Pendente** | Aguarda D7 de divergências (AD-017). Hoje a divergência é gravada apenas em `logs_auditoria` e no evento do job. |
