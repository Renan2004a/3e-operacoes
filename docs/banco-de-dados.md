# Banco de dados do 3E Operações

Documento para inspeção e manutenção do banco: **qual banco é qual**, **tabelas**, **relacionamentos**, **nomenclatura**, **migrations/seed** e **como abrir no DBeaver**. Nenhuma credencial aparece aqui.

---

## 1. Dois bancos com papéis diferentes

| Banco | Onde | Dono | Escrita | Conteúdo |
| --- | --- | --- | --- | --- |
| **`topgerente`** | MySQL do Top Gerente (RDS AWS em dev; servidor da 3E em produção) | ERP legado | **Nenhuma** (somente `SELECT`) | Pedidos comerciais (`orcamento`, `orcamento_itens`), clientes, vendedores, catálogo |
| **`3e_operacoes`** | MySQL do app (RDS AWS em dev/homologação; Railway em produção) | 3E Operações | **Somente o app** | Snapshot dos pedidos + toda a operação (atividades, execuções, ocorrências, entregas, remessas, usuários, auditoria) |

- O **Top Gerente é fonte oficial do comercial** e **nunca** é alterado pelo app.
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

> O projeto **não depende do Docker** para rodar: qualquer MySQL 8 com a `DATABASE_URL` correta funciona. O Docker é apenas o caminho mais simples no Windows.

---

## 3. Banco do ambiente hospedado

- **Aplicação**: Railway (serviço `3e-operacoes`), variável `DATABASE_URL` apontando para o MySQL do app.
- **Banco do app**: schema **`3e_operacoes`** (na AWS RDS durante o desenvolvimento; no Railway/MySQL em produção).
- **Legado**: schema **`topgerente`** (AWS em dev; Top Gerente real em produção), somente leitura.
- **Credenciais**: apenas em variáveis de ambiente/cofre. Nunca no Git.

Variáveis do app (sem valores): `DATABASE_URL`, `SESSION_SECRET`, `APP_INTERNAL_TOKEN`, `LOCAL_CONNECTOR_BASE_URL`, `LOCAL_CONNECTOR_TOKEN`, `CONNECTOR_CALLBACK_TOKEN`, `CONNECTOR_TIMEOUT_MS`, `APP_TIMEZONE`.

Variáveis do conector (sem valores): `TOPGERENTE_HOST`, `TOPGERENTE_PORT`, `TOPGERENTE_DATABASE`, `TOPGERENTE_USER`, `TOPGERENTE_PASSWORD`, `TOPGERENTE_EMPRESA`, `CONNECTOR_SHARED_TOKEN`, `RAILWAY_CALLBACK_URL`, `CONNECTOR_CALLBACK_TOKEN`, `PORT`.

---

## 4. Tabelas (schema `3e_operacoes`)

Fonte da verdade: `prisma/schema.prisma`. Modelo conceitual: `docs/modelo-dados/mer.md`; DER: `docs/modelo-dados/der.html` / `der.mmd`.

### 4.1 Acesso e organização

| Tabela | Para que serve | Relacionamentos |
| --- | --- | --- |
| `User` | Usuários do app (login, status) | 1:N `UserRole`, 1:N `UserSector`, 1:N `Execution`, `Occurrence`, `Delivery` |
| `UserRole` | Perfis do usuário (N:N lógico) | PK (`userId`, `role`) |
| `Sector` | Setores: Corte e Dobra, Telhas, Revenda | 1:N `UserSector`, `CategorySectorMapping`, `ProductSectorRule`, `Activity` |
| `UserSector` | Usuário ↔ setor (N:N) | PK (`userId`, `sectorId`) |
| `CategorySectorMapping` | De/para categoria do legado → setor | N:1 `Sector`; UK `legacyCategory` |
| `ProductSectorRule` | **Sugestão** de setor por produto (código/descrição) | N:1 `Sector`; índice (`matchType`, `matchValue`) |

### 4.2 Comercial (snapshot do legado)

| Tabela | Para que serve | Relacionamentos |
| --- | --- | --- |
| `Order` | Pedido importado | 1:N `OrderItem`, 1:N `IntegrationJob`; UK `legacyOrderKey` |
| `OrderItem` | Item do pedido (código, descrição, unidade, quantidade solicitada, classificação, prazo) | N:1 `Order`; 1:N `Activity`, `Delivery`, `ScheduledDelivery`; UK (`orderId`, `legacyItemKey`) |

### 4.3 Operação

| Tabela | Para que serve | Relacionamentos |
| --- | --- | --- |
| `Activity` | **Unidade operacional** (item × setor), base da fila | N:1 `OrderItem`, `Sector`; 1:N `Execution`, `Occurrence`; UK (`orderItemId`, `sectorId`) |
| `Execution` | Produção (Corte/Telhas) ou separação (Revenda) | N:1 `Activity`, `User` |
| `Occurrence` | Perda, refugo, indisponibilidade, pausa, parada, defeito | N:1 `Activity`, `User`, `MotivoOcorrencia` (opcional) |
| `MotivoOcorrencia` | Lista fechada de motivos por tipo | 1:N `Occurrence`; UK (`tipo`, `codigo`) |
| `Delivery` | Entrega **realizada** (total/parcial) e exceção gerencial | N:1 `OrderItem`, `User` (registrou/autorizou) |
| `ScheduledDelivery` | **Remessa** (entrega prevista): número, data, confirmação | N:1 `OrderItem`; UK (`orderItemId`, `remessa`) |

### 4.4 Integração e auditoria

| Tabela | Para que serve | Relacionamentos |
| --- | --- | --- |
| `IntegrationJob` | Job on-demand de importação/atualização | N:1 `Order` (opcional); UK `idempotencyKey`; 1:N `IntegrationJobEvent` |
| `IntegrationJobEvent` | Trilha do job (despacho, retorno, erro) | N:1 `IntegrationJob` |
| `AuditLog` | Auditoria de ações sensíveis (exceções, mapeamento, prazos) | **Referência lógica** (`userId`, `entityId` sem FK) |

> **`ScheduledDelivery` ≠ `Delivery`**: a remessa é previsão e **não** altera o saldo; a baixa ocorre na entrega realizada. A soma das remessas não é usada para calcular disponível.

---

## 5. Nomenclatura adotada

- **Schema/Prisma/MySQL**: **inglês** (`User`, `Order`, `OrderItem`, `Activity`…), padrão do ecossistema Prisma e já usado em todas as migrations e no código.
- **Interface, documentos e MER**: **português** (Pedido, Item, Atividade, Remessa…), para alinhar ao vocabulário do cliente.
- O MER faz o de/para (`USUARIO` ↔ `User`), então as duas visões convivem sem renomear tabelas.
- **Não foi feita renomeação estrutural**: renomear tabelas exigiria migration destrutiva e quebraria consultas, Prisma e o ambiente hospedado. A padronização escolhida é a **documentação bilíngue** com identificadores técnicos consistentes em inglês.

---

## 6. Migrations e seed

| Migration | Conteúdo |
| --- | --- |
| `20261007000000_init` | Schema inicial (usuários, setores, pedidos, atividades, execuções, ocorrências, entregas, jobs, auditoria) |
| `20261015193341_alertas_remessas_regras` | `ProductSectorRule` e `ScheduledDelivery` |

```powershell
npm run prisma:migrate   # desenvolvimento (cria/aplica)
npm run prisma:deploy    # ambientes existentes (aplica sem recriar)
npm run prisma:seed      # idempotente: setores, motivos, usuários demo e 14 regras produto→setor
```

O seed cria os setores, 9 motivos sugeridos, usuários de demonstração e as regras de sugestão. É seguro rodar mais de uma vez (upsert).

---

## 7. Como inspecionar no DBeaver (banco local)

1. Suba o banco: `npm run db:up`.
2. No DBeaver: **Nova conexão → MySQL**.
3. Preencha:
   - **Host**: `127.0.0.1`
   - **Port**: `3306`
   - **Database**: `3e_operacoes`
   - **Username**: `app`
   - **Password**: `app`
4. Em **Driver properties**, se necessário, `allowPublicKeyRetrieval=true` e `useSSL=false` (MySQL 8 local).
5. **Test Connection** → **Finish**.
6. Verifique as tabelas em `3e_operacoes` → `Tables`. Exemplos de consulta:

```sql
-- Pedidos importados e itens
SELECT o.legacyNumber, o.customerName, COUNT(i.id) AS itens
FROM `Order` o LEFT JOIN OrderItem i ON i.orderId = o.id
GROUP BY o.id ORDER BY o.legacyNumber;

-- Saldo por item (pendente = solicitado - executado)
SELECT o.legacyNumber, i.description, i.requestedQuantity,
       COALESCE(SUM(e.quantity), 0) AS executado,
       i.requestedQuantity - COALESCE(SUM(e.quantity), 0) AS pendente
FROM OrderItem i
JOIN `Order` o ON o.id = i.orderId
LEFT JOIN Activity a ON a.orderItemId = i.id
LEFT JOIN Execution e ON e.activityId = a.id
GROUP BY i.id ORDER BY o.legacyNumber;

-- Remessas programadas
SELECT o.legacyNumber, sd.remessa, sd.scheduledAt, sd.confirmedAt
FROM ScheduledDelivery sd
JOIN OrderItem i ON i.id = sd.orderItemId
JOIN `Order` o ON o.id = i.orderId
ORDER BY o.legacyNumber, sd.remessa;
```

> Para inspecionar o **banco hospedado**, use a `DATABASE_URL` do ambiente (nunca no Git) e trate como **produção**: apenas leitura, sem `UPDATE`/`DELETE` manuais.

---

## 8. O que vem do Top Gerente × o que é operacional

| Origem | Dados |
| --- | --- |
| **Top Gerente (importado)** | Número do pedido, cliente, vendedor, código/descrição do produto, unidade e quantidade solicitada |
| **3E Operações (operacional)** | Classificação por setor, prazos, execuções, ocorrências, entregas, remessas, usuários/perfis, auditoria e jobs |

A ressincronização atualiza apenas o **comercial** e **nunca apaga** execução, ocorrência, entrega ou remessa. Se a nova quantidade solicitada ficar abaixo do executado/entregue, o app registra **divergência** em `AuditLog`/evento do job.

---

## 9. Segurança e cuidados

- Nunca apague/recrie o banco para "padronizar": use migrations.
- Nunca rode `prisma migrate reset` contra o banco hospedado.
- O usuário do legado deve ser **somente `SELECT`**, restrito às tabelas mapeadas.
- Não logar senha, token, CPF completo ou payload comercial desnecessário.
- Rotacione credenciais que tenham circulado.

---

## 10. Estado observado no ambiente de desenvolvimento (2026-10-20)

Contagem de registros (ambiente AWS de desenvolvimento, sem dados pessoais):

| Tabela | Registros |
| --- | --- |
| `User` | 7 |
| `Sector` | 3 |
| `ProductSectorRule` | 14 |
| `Order` | 7 |
| `OrderItem` | 60 |
| `Activity` | 12 |
| `Execution` | 10 |
| `Occurrence` | 9 |
| `MotivoOcorrencia` | 9 |
| `Delivery` | 6 |
| `ScheduledDelivery` | 1 |
| `IntegrationJob` | 7 |
| `IntegrationJobEvent` | 52 |
| `AuditLog` | 1 |

Pedidos reais usados na validação: `70435`, `82249`, `82250`, `82261`, `82262`, `82268`, `82269`.
