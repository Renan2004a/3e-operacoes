# MER — Modelo Entidade-Relacionamento (banco próprio do 3E)

> Fonte da verdade: `prisma/schema.prisma`. Este documento consolida o modelo e
> registra as decisões. Atualizado em 2026-10-20 (inclui remessas e sugestão de setor).

## 1. Escopo

- Cobre **apenas o banco próprio do aplicativo** (MySQL; `3e_operacoes` na AWS).
- O **Top Gerente é externo e somente leitura**. Não é modelado como tabela do
  app; entra apenas por campos de origem (chaves do legado) em `PEDIDO` e
  `ITEM_PEDIDO`.
- Setores do escopo atual: **Corte e Dobra**, **Telhas**, **Revenda**.

## 2. Convenções

- **PK substituta** (`id`, `cuid`) em todas as entidades; a chave de negócio do
  legado fica em coluna única própria (facilita upsert idempotente).
- **Quantidades** em `DECIMAL(18,3)`. A **unidade do item** define a
  granularidade: peça/unidade = inteiro; metro = decimal (2 casas na Telhas).
- **Instantes** persistidos em UTC; exibidos em `America/Sao_Paulo`. Datas
  "somente dia" (ex.: previsão de remessa) são ancoradas ao meio-dia de SP.
- **Status são enums/atributos**, não entidades.
- O catálogo de **Produtos é do legado**. O app guarda um *snapshot* do item em
  `ITEM_PEDIDO` e mantém o de/para `categoria → setor` **e** regras
  `produto → setor` (sugestão). **Não** existe entidade `PRODUTO` local.

## 3. Entidades e atributos principais

| Entidade | Descrição | Atributos principais | Chave / unicidade |
|---|---|---|---|
| `USUARIO` | Quem opera o app. | id, nome, email, senhaHash, status, criadoEm, atualizadoEm | PK id; UK email |
| `USUARIO_PERFIL` | Perfis do usuário (pode ter mais de um). | usuarioId, perfil | PK (usuarioId, perfil) |
| `SETOR` | Setor operacional. | id, codigo, nome, ativo | PK id; UK codigo |
| `USUARIO_SETOR` | Associação usuário ↔ setor (M:N). | usuarioId, setorId | PK (usuarioId, setorId) |
| `MAPEAMENTO_CATEGORIA_SETOR` | De/para categoria do legado → setor; auditável. | id, categoriaLegado, setorId, situacao | PK id; UK categoriaLegado |
| `REGRA_PRODUTO_SETOR` | **Sugestão** de setor por produto (código/descrição). | id, tipoCorrespondencia (`CONTAINS`/`PREFIX`), valorCorrespondencia, setorId, prioridade, ativo | PK id; índice (tipo, valor) |
| `PEDIDO` | Pedido comercial importado. | id, chaveLegado, numeroLegado, cliente, vendedor, origemAtualizadaEm, ultimaSincronizacaoEm | PK id; UK chaveLegado |
| `ITEM_PEDIDO` | Item comercial importado (linha do pedido). | id, pedidoId, chaveItemLegado, codigoProduto, descricao, categoriaLegado, unidade, quantidadeSolicitada, situacaoClassificacao, prazo | PK id; UK (pedidoId, chaveItemLegado) |
| `ATIVIDADE` | **Unidade operacional**: item × setor. É o que aparece na fila do setor. | id, itemPedidoId, setorId, situacao, prioridade, prazo | PK id; UK (itemPedidoId, setorId) |
| `EXECUCAO` | Registro de produção (Corte/Telhas) ou separação (Revenda). | id, atividadeId, usuarioId, quantidade, ocorridoEm | PK id; índice (atividadeId, ocorridoEm) |
| `OCORRENCIA` | Perda, refugo, indisponibilidade, pausa, parada… | id, atividadeId, usuarioId, tipo, quantidade, duracaoMin, motivoId, observacao, ocorridoEm | PK id; índice (atividadeId, ocorridoEm) |
| `MOTIVO_OCORRENCIA` | Lista fechada de motivos por tipo (**pendente de validação**). | id, tipo, codigo, descricao, ativo | PK id; UK (tipo, codigo) |
| `ENTREGA` | Entrega **realizada** (total/parcial) e exceção autorizada. | id, itemPedidoId, registradoPorUsuarioId, autorizadoPorUsuarioId, quantidade, disponivelAntes, excecaoGerencial, motivoExcecao, ocorridoEm | PK id; índice (itemPedidoId, ocorridoEm) |
| `REMESSA_PROGRAMADA` | Entrega **prevista** (remessa) por item, com confirmação. | id, itemPedidoId, numeroRemessa, dataPrevista, confirmadaEm, observacao | PK id; **UK (itemPedidoId, numeroRemessa)** |
| `JOB_INTEGRACAO` | Job on-demand de importação/atualização. | id, pedidoId, numeroPedidoLegado, chaveIdempotencia, situacao, tentativas, erroCodigo, erroMensagem, concluidoEm | PK id; UK chaveIdempotencia |
| `EVENTO_JOB_INTEGRACAO` | Trilha do job (despacho, retorno, erro). | id, jobId, tipo, detalhe, criadoEm | PK id; índice (jobId, criadoEm) |
| `LOG_AUDITORIA` | Auditoria de ações sensíveis (exceções, mapeamento, prazos). | id, usuarioId, acao, entidadeTipo, entidadeId, antesJson, depoisJson, motivo, correlacaoId, criadoEm | PK id; índice (entidadeTipo, entidadeId) |

> `LOG_AUDITORIA.usuarioId` e `entidadeId` são **referências lógicas** (sem FK),
> porque a auditoria é polimórfica e não deve ser bloqueada por exclusões.

## 4. Relacionamentos e cardinalidades

| Relação | Cardinalidade | Regra |
|---|---|---|
| `USUARIO` — `USUARIO_PERFIL` | 1 : 1..N | Todo usuário tem ao menos um perfil. |
| `USUARIO` — `USUARIO_SETOR` — `SETOR` | N : M | Operador pode atuar em vários setores. |
| `SETOR` — `MAPEAMENTO_CATEGORIA_SETOR` | 1 : 0..N | Cada categoria mapeia para um setor; sem mapeamento → `PENDENTE_CLASSIFICACAO`. |
| `SETOR` — `REGRA_PRODUTO_SETOR` | 1 : 0..N | Regras por produto alimentam a **sugestão** (a decisão final é manual). |
| `PEDIDO` — `ITEM_PEDIDO` | 1 : 1..N | Um pedido tem um ou mais itens. |
| `ITEM_PEDIDO` — `ATIVIDADE` | 1 : 0..N | Item classificado gera atividade no setor; pendente = 0 atividades. |
| `SETOR` — `ATIVIDADE` | 1 : 0..N | Atividade pertence a um setor. |
| `ATIVIDADE` — `EXECUCAO` | 1 : 0..N | Soma das execuções = produzido/separado do item. |
| `ATIVIDADE` — `OCORRENCIA` | 1 : 0..N | Perda/refugo/indisponibilidade **não** reduzem a obrigação de produzir. |
| `USUARIO` — `EXECUCAO` | 1 : 0..N | Registra quem executou. |
| `USUARIO` — `OCORRENCIA` | 1 : 0..N | Registra quem reportou. |
| `ITEM_PEDIDO` — `ENTREGA` | 1 : 0..N | Entregas parciais não concluem o item. |
| `ITEM_PEDIDO` — `REMESSA_PROGRAMADA` | 1 : 0..N | Uma remessa por número; data prevista e confirmação. |
| `USUARIO` — `ENTREGA` | 1 : 0..N | `registradoPor` e, opcionalmente, `autorizadoPor` (exceção). |
| `MOTIVO_OCORRENCIA` — `OCORRENCIA` | 1 : 0..N | Motivo obrigatório quando perda/refugo/indisponibilidade for registrado. |
| `PEDIDO` — `JOB_INTEGRACAO` | 1 : 0..N | Job pode existir antes do pedido persistido (após upsert, referencia). |
| `JOB_INTEGRACAO` — `EVENTO_JOB_INTEGRACAO` | 1 : 1..N | Trilha do job. |
| `USUARIO` — `LOG_AUDITORIA` | 1 : 0..N | Referência lógica (sem FK); pode ser nulo em ação de sistema. |

## 5. Regras de negócio refletidas no modelo

- **Saldo pendente = Solicitado − Executado conforme.** Perda/refugo ficam em
  `OCORRENCIA` e **não** subtraem.
- **Disponível para entrega = Executado − Entregue** (entregas realizadas).
- **Entrega parcial** mantém o item em "parcialmente entregue".
- **Entrega acima do disponível**: bloqueada por padrão; exceção com
  `excecaoGerencial`, `autorizadoPorUsuarioId`, `motivoExcecao` e auditoria.
- **Remessa é previsão, não entrega**: `REMESSA_PROGRAMADA` não altera o saldo;
  ela registra data prevista e confirmação. A baixa acontece em `ENTREGA`.
- **Sugestão de setor** (`REGRA_PRODUTO_SETOR`) é heurística: não classifica
  sozinha; só pré-seleciona o setor no desmembramento.
- **Unidade** do item governa a granularidade; nunca misturar unidades.
- **Prazo opcional** em `ITEM_PEDIDO` e `ATIVIDADE`; sem prazo = `SEM_PRAZO`,
  nunca atrasado.
- **Sincronização idempotente**: `chaveLegado`/`chaveItemLegado` fazem upsert;
  dados operacionais (execução, ocorrência, entrega, remessa) nunca são apagados.

## 6. Melhorias em relação ao desenho manual (a confirmar)

1. **Inserir `ATIVIDADE` entre `ITEM_PEDIDO` e a execução.** No papel o item
   "produz" direto. O projeto separa item comercial de atividade operacional.
2. **Criar `ENTREGA`.** Sem ela não existem "disponível", entrega parcial nem
   exceção.
3. **`STATUS` deixa de ser entidade** e vira enum em `ATIVIDADE` + tipo em
   `OCORRENCIA`.
4. **Não criar `PRODUTO` no banco do app**: catálogo é do Top Gerente; guardamos
   snapshot no item + mapeamento de categoria + regras de sugestão.
5. **Incluir usuários/perfis/permissões e `USUARIO_SETOR` (M:N)**.
6. **Incluir `PRAZO`** no item/atividade (opcional, item/setor).
7. **Incluir `MOTIVO_OCORRENCIA`** como lista fechada.
8. **Incluir `JOB_INTEGRACAO`/`EVENTO` e `LOG_AUDITORIA`**.
9. **PK substituta + chave de negócio única** para simplificar upsert.
10. **Separar previsão de entrega (`REMESSA_PROGRAMADA`) de entrega realizada
    (`ENTREGA`)** — permite entregas escalonadas sem distorcer o saldo.

## 7. Decisões

- **D1** Produto como entidade local? *Não: snapshot no item + mapeamento de
  categoria + regras de sugestão.*
- **D2** `MOTIVO_OCORRENCIA` como tabela? *Sim, com carga inicial sugerida.*
- **D3** Um item pode pertencer a mais de um setor? *O modelo suporta N
  atividades por item; o escopo atual assume 1 categoria → 1 setor.*
- **D4** Remessa tem número + data prevista + confirmação (sem quantidade
  própria). *A quantidade continua no item; a entrega realizada é que baixa.*

## 8. Rastreabilidade

- HU01/Operador → `ATIVIDADE`, `EXECUCAO`, `OCORRENCIA`, `USUARIO_SETOR`.
- HU02/Gerente → `ATIVIDADE.prioridade`, `PRAZO`, `ENTREGA` (exceção), `REMESSA_PROGRAMADA`.
- HU03/Vendedor → consulta de `PEDIDO`/`ITEM_PEDIDO`; `PRAZO`; desmembramento; remessa.
- HU04/Expedição → `ENTREGA`, cálculo de disponível.
- HU05/Responsável → `USUARIO`, `USUARIO_PERFIL`, `SETOR`, `USUARIO_SETOR`.
- HU06/Responsável técnico → `JOB_INTEGRACAO`, `EVENTO_JOB_INTEGRACAO`, `LOG_AUDITORIA`.
- RF001 → `PEDIDO`, `ITEM_PEDIDO`, `JOB_INTEGRACAO`.
- RF002 → `MAPEAMENTO_CATEGORIA_SETOR`, `REGRA_PRODUTO_SETOR`, `ATIVIDADE`.
- RF004/RF005 → `EXECUCAO`, `OCORRENCIA`.
- RF009/RF010/RF011 → `ENTREGA`, `REMESSA_PROGRAMADA` + cálculos.
- RF012 → `PRAZO` (item/atividade) + consultas de alerta (parados, não encaminhados).

## 9. Mapeamento para o schema Prisma atual

| MER (conceitual) | Prisma (código) | Tabela física (MySQL) |
|---|---|---|
| USUARIO | `User` | `usuarios` |
| USUARIO_PERFIL | `UserRole` (enum `RoleCode`) | `usuarios_perfis` |
| SETOR | `Sector` (enum `SectorCode`) | `setores` |
| USUARIO_SETOR | `UserSector` | `usuarios_setores` |
| MAPEAMENTO_CATEGORIA_SETOR | `CategorySectorMapping` | `mapeamentos_categoria_setor` |
| REGRA_PRODUTO_SETOR | `ProductSectorRule` | `regras_produto_setor` |
| PEDIDO | `Order` | `pedidos` |
| ITEM_PEDIDO | `OrderItem` | `pedidos_itens` |
| ATIVIDADE | `Activity` (enum `ActivityStatus`) | `atividades` |
| EXECUCAO | `Execution` | `execucoes` |
| OCORRENCIA | `Occurrence` | `ocorrencias` |
| MOTIVO_OCORRENCIA | `MotivoOcorrencia` | `motivos_ocorrencia` |
| ENTREGA | `Delivery` | `entregas` |
| REMESSA_PROGRAMADA | `ScheduledDelivery` | `remessas_programadas` |
| JOB_INTEGRACAO | `IntegrationJob` | `jobs_integracao` |
| EVENTO_JOB_INTEGRACAO | `IntegrationJobEvent` | `eventos_job_integracao` |
| LOG_AUDITORIA | `AuditLog` (referências lógicas, sem FK) | `logs_auditoria` |

As **tabelas físicas** estão em português (`snake_case`, plural), via `@@map` no Prisma. Os modelos do código continuam em inglês para não quebrar domínio, APIs e testes. O fluxo e o porquê de cada entidade estão em `docs/banco-de-dados.md`.

O DER está em `docs/modelo-dados/der.mmd` (Mermaid) e `der.html`
(visualizador). O modelo lógico executável é `prisma/schema.prisma`.
