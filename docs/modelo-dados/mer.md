# MER — Modelo Entidade-Relacionamento (banco próprio do 3E)

> Rascunho para revisão. Fontes: `docs/requisitos.md`, `docs/regras-negocio.md`,
> `docs/decisoes.md`, `docs/arquitetura.md`, `docs/perfis-permissoes.md`,
> `docs/legado/`, e o desenho manual enviado. O modelo lógico já existe em
> `prisma/schema.prisma`; este MER o consolida e registra as divergências.

## 1. Escopo

- Este modelo cobre **apenas o banco próprio do aplicativo** (Railway/MySQL).
- O **Top Gerente é externo e somente leitura**. Não é modelado como tabela do
  app; entra apenas por campos de origem (chaves do legado) no `PEDIDO` e
  `ITEM_PEDIDO`.
- Setores do escopo atual: **Corte e Dobra**, **Telhas**, **Revenda**.

## 2. Convenções

- **PK substituta** (`id`) em todas as entidades; a chave de negócio do legado
  fica em coluna única própria (evita PK composta e facilita upsert idempotente).
- **Quantidades** em `DECIMAL(18,3)`. A **unidade do item** define a
  granularidade: peça/unidade = inteiro; metro = decimal (2 casas na Telhas).
- **Instantes** persistidos em UTC; exibidos em `America/Sao_Paulo`.
- **Status são enums/atributos**, não entidades. `STATUS` do desenho manual vira
  atributo em `ATIVIDADE` e o tipo em `OCORRENCIA`.
- O catálogo de **Produtos é do legado**. O app guarda um *snapshot* do item em
  `ITEM_PEDIDO` e mantém o de/para `categoria → setor`. **Não** existe entidade
  `PRODUTO` no banco do app (ver §6).

## 3. Entidades e atributos principais

| Entidade | Descrição | Atributos principais | Chave / unicidade |
|---|---|---|---|
| `USUARIO` | Quem opera o app. | id, nome, email, senhaHash, status, criadoEm, atualizadoEm | PK id; UK email |
| `USUARIO_PERFIL` | Perfis do usuário (pode ter mais de um). | usuarioId, perfil | PK (usuarioId, perfil) |
| `SETOR` | Setor operacional. | id, codigo, nome, ativo | PK id; UK codigo |
| `USUARIO_SETOR` | Associação usuário ↔ setor (M:N). | usuarioId, setorId | PK (usuarioId, setorId) |
| `MAPEAMENTO_CATEGORIA_SETOR` | De/para categoria do legado → setor; auditável. | id, categoriaLegado, setorId, situacao | PK id; UK categoriaLegado |
| `PEDIDO` | Pedido comercial importado. | id, chaveLegado, numeroLegado, cliente, vendedor, origemAtualizadaEm, ultimaSincronizacaoEm | PK id; UK chaveLegado |
| `ITEM_PEDIDO` | Item comercial importado (linha do pedido). | id, pedidoId, chaveItemLegado, codigoProduto, descricao, categoriaLegado, unidade, quantidadeSolicitada, situacaoClassificacao, prazo | PK id; UK (pedidoId, chaveItemLegado) |
| `ATIVIDADE` | **Unidade operacional**: item × setor. É o que aparece na fila do setor. | id, itemPedidoId, setorId, situacao, prioridade, prazo | PK id; UK (itemPedidoId, setorId) |
| `EXECUCAO` | Registro de produção (Corte/Telhas) ou separação (Revenda). | id, atividadeId, usuarioId, quantidade, ocorridoEm | PK id; índice (atividadeId, ocorridoEm) |
| `OCORRENCIA` | Perda, refugo, indisponibilidade, parada, defeito… | id, atividadeId, usuarioId, tipo, quantidade, duracaoMin, motivoId, observacao, ocorridoEm | PK id; índice (atividadeId, ocorridoEm) |
| `MOTIVO_OCORRENCIA` | Lista fechada de motivos por tipo (**pendente de levantamento**). | id, tipo, codigo, descricao, ativo | PK id; UK (tipo, codigo) |
| `ENTREGA` | Entrega total/parcial e exceção autorizada. | id, itemPedidoId, registradoPorUsuarioId, autorizadoPorUsuarioId, quantidade, disponivelAntes, excecaoGerencial, motivoExcecao, ocorridoEm | PK id; índice (itemPedidoId, ocorridoEm) |
| `JOB_INTEGRACAO` | Job on-demand de importação/atualização. | id, pedidoId, numeroPedidoLegado, chaveIdempotencia, situacao, tentativas, erroCodigo, erroMensagem, concluidoEm | PK id; UK chaveIdempotencia |
| `EVENTO_JOB_INTEGRACAO` | Trilha do job (despacho, retorno, erro). | id, jobId, tipo, detalhe, criadoEm | PK id; índice (jobId, criadoEm) |
| `LOG_AUDITORIA` | Auditoria de ações sensíveis (exceções, mapeamento, prazos). | id, usuarioId, acao, entidadeTipo, entidadeId, antesJson, depoisJson, motivo, correlacaoId, criadoEm | PK id |

## 4. Relacionamentos e cardinalidades

| Relação | Cardinalidade | Regra |
|---|---|---|
| `USUARIO` — `USUARIO_PERFIL` | 1 : 1..N | Todo usuário tem ao menos um perfil. |
| `USUARIO` — `USUARIO_SETOR` — `SETOR` | N : M | Operador pode atuar em vários setores. |
| `SETOR` — `MAPEAMENTO_CATEGORIA_SETOR` | 1 : 0..N | Cada categoria mapeia para um setor; sem mapeamento → `PENDENTE_CLASSIFICACAO`. |
| `PEDIDO` — `ITEM_PEDIDO` | 1 : 1..N | Um pedido tem um ou mais itens. |
| `ITEM_PEDIDO` — `ATIVIDADE` | 1 : 0..N | Item classificado gera atividade no setor; pendente de classificação = 0 atividades. |
| `SETOR` — `ATIVIDADE` | 1 : 0..N | Atividade pertence a um setor. |
| `ATIVIDADE` — `EXECUCAO` | 1 : 0..N | Soma das execuções = produzido/separado do item. |
| `ATIVIDADE` — `OCORRENCIA` | 1 : 0..N | Perda/refugo/indisponibilidade NÃO reduzem a obrigação de produzir. |
| `USUARIO` — `EXECUCAO` | 1 : 0..N | Registra quem executou. |
| `USUARIO` — `OCORRENCIA` | 1 : 0..N | Registra quem reportou. |
| `ITEM_PEDIDO` — `ENTREGA` | 1 : 0..N | Entregas parciais não concluem o item. |
| `USUARIO` — `ENTREGA` | 1 : 0..N | `registradoPor` e, opcionalmente, `autorizadoPor` (exceção). |
| `MOTIVO_OCORRENCIA` — `OCORRENCIA` | 1 : 0..N | Motivo obrigatório quando perda/refugo/indisponibilidade for registrado. |
| `PEDIDO` — `JOB_INTEGRACAO` | 1 : 0..N | Job pode existir antes do pedido persistido (após upsert, referencia). |
| `JOB_INTEGRACAO` — `EVENTO_JOB_INTEGRACAO` | 1 : 1..N | Trilha do job. |
| `USUARIO` — `LOG_AUDITORIA` | 1 : 0..N | `usuarioId` pode ser nulo em ação de sistema. |

## 5. Regras de negócio refletidas no modelo

- **Saldo pendente = Solicitado − Executado conforme.** Perda/refugo ficam em
  `OCORRENCIA` e **não** subtraem. (Decisão vigente; diverge da RN011/RN021/
  RN031 históricas do PDF.)
- **Disponível para entrega = Executado − Entregue.** Só entra o que foi
  produzido/separado.
- **Entrega parcial** mantém `ITEM_PEDIDO` em "parcialmente entregue".
- **Entrega acima do disponível**: bloqueada por padrão; exceção com
  `excecaoGerencial`, `autorizadoPorUsuarioId`, `motivoExcecao` e auditoria.
- **Unidade** do item governa a granularidade; nunca misturar unidades.
- **Prazo opcional** em `ITEM_PEDIDO` e `ATIVIDADE`; sem prazo = `SEM_PRAZO`,
  nunca atrasado.
- **Sincronização idempotente**: `chaveLegado`/`chaveItemLegado` fazem upsert;
  dados operacionais (execução, ocorrência, entrega) nunca são apagados.

## 6. Melhorias em relação ao desenho manual (a confirmar)

1. **Inserir `ATIVIDADE` entre `ITEM_PEDIDO` e a execução.** No papel o item
   "produz" direto. O projeto separa item comercial de atividade operacional
   (RF002/RF003), e é a `ATIVIDADE` que pertence ao setor e vai para a fila.
2. **Criar `ENTREGA`.** Sem ela não existem "disponível", entrega parcial nem
   exceção — regras centrais (RN002, RN004, RN005).
3. **`STATUS` deixa de ser entidade** e vira enum em `ATIVIDADE` + tipo em
   `OCORRENCIA`. Entidade de status tende a virar tabela de domínio sem uso.
4. **Não criar `PRODUTO` no banco do app** (recomendado): o catálogo é do Top
   Gerente. Guardamos o snapshot no item e o de/para categoria→setor. Se quiser
   uma cópia local para consulta, ela entra como tabela *somente leitura*
   sincronizada — a decisão fica registrada.
5. **Incluir usuários/perfis/permissões e `USUARIO_SETOR` (M:N)** — hoje o
   desenho não tem autenticação nem vínculo multi-setor.
6. **Incluir `PRAZO`** no item/atividade (opcional, item/setor).
7. **Incluir `MOTIVO_OCORRENCIA`** como lista fechada (pendente de levantamento
   com o gerente), em vez de texto livre.
8. **Incluir `JOB_INTEGRACAO`/`EVENTO` e `LOG_AUDITORIA`** para a integração
   on-demand e auditoria.
9. **PK substituta + chave de negócio única** em vez de PK composta
   (`idPedido + idProduto`), para simplificar upsert e referências.

## 7. Decisões a confirmar

- **D1** Produto como entidade local (réplica) ou manter só o snapshot no item?
  *Recomendado: só snapshot + mapeamento de categoria.*
- **D2** `MOTIVO_OCORRENCIA` como tabela (lista fechada) agora, ou `tipo`+texto
  até o levantamento dos motivos reais? *Recomendado: tabela, com carga inicial
  vazia/pendente.*
- **D3** Um item pode pertencer a mais de um setor? O modelo suporta N
  atividades por item; o escopo atual assume 1 categoria → 1 setor.
- **D4** Nível do entregável: MER conceitual (este) + DER (diagrama) + modelo
  lógico/tabelas, ou só os dois primeiros?

## 8. Rastreabilidade

- HU01/Operador → `ATIVIDADE`, `EXECUCAO`, `OCORRENCIA`, `USUARIO_SETOR`.
- HU02/Gerente → `ATIVIDADE.prioridade`, `PRAZO`, `ENTREGA` (exceção).
- HU03/Vendedor → consulta de `PEDIDO`/`ITEM_PEDIDO`; `PRAZO`.
- HU04/Expedição → `ENTREGA`, cálculo de disponível.
- HU05/Responsável → `USUARIO`, `USUARIO_PERFIL`, `SETOR`, `USUARIO_SETOR`.
- HU06/Responsável técnico → `JOB_INTEGRACAO`, `EVENTO_JOB_INTEGRACAO`,
  `LOG_AUDITORIA`.
- RF001 → `PEDIDO`, `ITEM_PEDIDO`, `JOB_INTEGRACAO`.
- RF002 → `MAPEAMENTO_CATEGORIA_SETOR`, `ATIVIDADE`.
- RF004/RF005 → `EXECUCAO`, `OCORRENCIA`.
- RF009/RF010/RF011 → `ENTREGA` + cálculos.

## 9. Mapeamento para o schema Prisma atual

| MER (conceitual) | Prisma |
|---|---|
| USUARIO | `User` |
| USUARIO_PERFIL | `UserRole` (enum `RoleCode`) |
| SETOR | `Sector` (enum `SectorCode`) |
| USUARIO_SETOR | `UserSector` |
| MAPEAMENTO_CATEGORIA_SETOR | `CategorySectorMapping` |
| PEDIDO | `Order` |
| ITEM_PEDIDO | `OrderItem` |
| ATIVIDADE | `Activity` (enum `ActivityStatus`) |
| EXECUCAO | `Execution` |
| OCORRENCIA | `Occurrence` |
| MOTIVO_OCORRENCIA | *(não existe; `Occurrence.reasonCode` é texto)* |
| ENTREGA | `Delivery` |
| JOB_INTEGRACAO | `IntegrationJob` |
| EVENTO_JOB_INTEGRACAO | `IntegrationJobEvent` |
| LOG_AUDITORIA | `AuditLog` |

O DER está em `docs/modelo-dados/der.mmd` (Mermaid) e `der.html`
(visualizador). O único item do MER sem equivalente no Prisma é
`MOTIVO_OCORRENCIA`.
