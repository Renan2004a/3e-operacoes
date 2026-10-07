# Importação de Pedido por Número — Especificação

## Problem Statement

O acompanhamento dos pedidos depende hoje de controle manual e de comunicação entre setores. O Top Gerente guarda os dados comerciais, mas não entrega o acompanhamento operacional. Precisamos importar um pedido específico, sob demanda, para a camada operacional do 3E, sem varredura contínua e sem escrever no legado.

## Goals

- [ ] Importar um pedido por número e persistir pedido + itens no banco do app.
- [ ] Ser idempotente: repetir a importação não cria pedido duplicado.
- [ ] Nunca escrever no Top Gerente (somente leitura).
- [ ] Expor o status da importação ao usuário.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Autenticação e login | Feature separada; a rota assume contexto autenticado. |
| Classificação categoria → setor e criação de atividades/fila | Próxima feature; aqui o item entra `PENDING_CLASSIFICATION`. |
| Registro de produção, ocorrências e entregas | Features seguintes. |
| Indicadores e painel gerencial | Fora desta fatia. |
| Impressão de ordem de produção (RF018) | Fora desta fatia. |
| Operação offline | Adiada por decisão do projeto. |
| Escrita no Top Gerente | Proibida pela arquitetura. |
| Polling contínuo do legado | Proibido pelo ADR 0001. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fonte da categoria do produto | Não importar categoria; item entra `PENDING_CLASSIFICATION` | `cad_produto` está vazia na instância AWS; o mapeamento será configurável no app | não |
| Nome do vendedor | Persistir apenas o código `Vend`; nome fica nulo | `cad_vendedor` está vazia na instância AWS | não |
| Autenticação da rota de importação | Fora do escopo; assume usuário autenticado | Decisão aprovada; auth vira feature própria | sim |
| Banco em desenvolvimento e testes | Domínio puro + repositórios com fake; MySQL só em runtime | Sem MySQL local; mantém os testes rápidos | sim |
| Adapter do legado | Adapter real contra o RDS (`orcamento` + `orcamento_itens`) e fake nos testes | O guia RDS confirmou os joins | sim |
| Mecanismo de despacho assíncrono | Agendar processamento em background após o `202` | Detalhe fica no Design | não |
| Retry automático | Sem retry automático na v1; reprocessamento é manual (P3) | Evita carga no legado | não |
| Representação de divergência de quantidade | Registrar em `AuditLog` e `IntegrationJobEvent`; sem novo campo em `OrderItem` | O schema atual não tem flag de divergência no item | não |
| Retenção de jobs de integração | Sem expiração nesta versão | Volume baixo; revisar depois | não |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Importar pedido por número ⭐ MVP

**User Story**: Como usuário autorizado, quero informar o número de um pedido e importá-lo do Top Gerente, para acompanhar o pedido no 3E.

**Why P1**: É o núcleo da integração e destrava todo o acompanhamento operacional.

**Acceptance Criteria**:

1. WHEN o usuário informa um número de pedido inteiro e positivo THEN o sistema SHALL criar um `IntegrationJob` com chave de idempotência e responder `202` com o `jobId`.
2. WHEN o job é criado THEN o sistema SHALL despachar, em até 5 segundos, uma chamada HTTPS autenticada ao conector local com `jobId` e número do pedido.
3. WHEN o conector devolve o payload normalizado THEN o sistema SHALL validar o payload com Zod e executar upsert de `Pedido` e `ItemPedido` em uma única transação.
4. WHEN o upsert conclui com sucesso THEN o sistema SHALL marcar o job como `SUCCEEDED` e registrar um `IntegrationJobEvent`.
5. IF o número informado não for inteiro positivo THEN o sistema SHALL responder `400` sem criar job.
6. IF o conector não responder dentro do tempo limite THEN o sistema SHALL marcar o job como `FAILED` e registrar `errorCode`.
7. The system SHALL persistir os dados comerciais importados sem alterar nenhum registro do Top Gerente.

**Independent Test**: Informar `70435`, receber `202`, e ver `Pedido` + 5 `ItemPedido` persistidos com quantidade e unidade corretas.

---

### P1: Acompanhar o status da importação ⭐ MVP

**User Story**: Como usuário autorizado, quero consultar o status do job, para saber quando a importação terminou.

**Why P1**: Sem status, o usuário não sabe se o pedido já está disponível.

**Acceptance Criteria**:

1. WHEN o usuário consulta o `jobId` THEN o sistema SHALL responder o status atual e a lista de eventos do job.
2. WHILE o job estiver em `PENDING`, `DISPATCHED` ou `RUNNING` THEN o sistema SHALL responder `202` com estado não final.
3. WHEN o job atinge `SUCCEEDED` ou `FAILED` THEN o sistema SHALL responder `200` com o estado final.
4. IF o `jobId` não existir THEN o sistema SHALL responder `404`.

**Independent Test**: Consultar um `jobId` recém-criado e ver `202`; após concluir, ver `200` com `SUCCEEDED`.

---

### P2: Ressincronizar um pedido existente

**User Story**: Como usuário autorizado, quero reimportar um pedido já existente, para atualizar a quantidade solicitada sem perder o histórico.

**Why P2**: O legado muda; a reimportação precisa ser segura e idempotente.

**Acceptance Criteria**:

1. WHEN o usuário solicita a importação de um pedido já existente THEN o sistema SHALL atualizar os campos comerciais e a quantidade solicitada pela chave de negócio do pedido.
2. The system SHALL NOT criar um segundo `Pedido` para a mesma chave de negócio.
3. The system SHALL preservar os registros operacionais existentes (execuções, ocorrências e entregas).
4. WHEN a nova quantidade solicitada for menor que o já executado ou entregue THEN o sistema SHALL registrar a divergência em `AuditLog` e `IntegrationJobEvent`.
5. IF uma importação idêntica for solicitada dentro da janela de idempotência THEN o sistema SHALL retornar o `jobId` existente sem novo despacho.

**Independent Test**: Importar `70435` duas vezes e verificar um único `Pedido` e a quantidade atualizada.

---

### P3: Reprocessar uma importação falha

**User Story**: Como responsável técnico, quero reprocessar um job que falhou, para recuperar a importação sem perder o histórico.

**Why P3**: Falhas de rede ou do legado precisam de recuperação controlada.

**Acceptance Criteria**:

1. WHEN o usuário solicita o reprocessamento de um job `FAILED` THEN o sistema SHALL criar um novo despacho preservando o histórico do job anterior.
2. IF o job não estiver em `FAILED` THEN o sistema SHALL rejeitar a operação com `409`.

**Independent Test**: Forçar uma falha, reprocessar e ver um novo job concluir com sucesso.

---

## Edge Cases

- IF o pedido não existir no Top Gerente THEN o conector SHALL devolver `not_found` e o job SHALL terminar `FAILED` com `errorCode = ORDER_NOT_FOUND`.
- IF o callback chegar com token inválido THEN o sistema SHALL responder `401` e não persistir dados.
- IF o callback chegar para um job já concluído THEN o sistema SHALL responder `200` sem repetir o upsert.
- WHEN o payload tiver item cancelado THEN o sistema SHALL excluir o item do upsert.
- IF duas importações do mesmo número ocorrerem em paralelo THEN o sistema SHALL criar apenas um job.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| INTG-01 | P1: Importar pedido | Design | Done |
| INTG-02 | P1: Importar pedido | Design | Done |
| INTG-03 | P1: Importar pedido | Design | Done |
| INTG-04 | P1: Importar pedido | Design | Done |
| INTG-05 | P1: Importar pedido | Design | Done |
| INTG-06 | P1: Importar pedido | Design | Implementing |
| INTG-07 | P1: Importar pedido | Design | Done |
| INTG-08 | P1: Status | Design | Done |
| INTG-09 | P1: Status | Design | Done |
| INTG-10 | P1: Status | Design | Done |
| INTG-11 | P1: Status | Design | Done |
| INTG-12 | P2: Ressincronizar | Design | Done |
| INTG-13 | P2: Ressincronizar | Design | Done |
| INTG-14 | P2: Ressincronizar | Design | Done |
| INTG-15 | P2: Ressincronizar | Design | Implementing |
| INTG-16 | P2: Ressincronizar | Design | Done |
| INTG-17 | P3: Reprocessar | Design | Done |
| INTG-18 | P3: Reprocessar | Design | Implementing |
| INTG-19 | Edge: pedido inexistente | Design | Implementing |
| INTG-20 | Edge: callback inválido | Design | Done |
| INTG-21 | Edge: callback duplicado | Design | Done |
| INTG-22 | Edge: item cancelado | Design | Done |
| INTG-23 | Edge: importação concorrente | Design | Done |

**Coverage:** 23 total, 23 mapped to tasks, 0 unmapped ✅

---

## Success Criteria

- [ ] O pedido real `70435` é importado e exibe 5 itens com quantidade e unidade corretas.
- [ ] Dez ressincronizações do mesmo pedido produzem zero duplicatas.
- [ ] Nenhuma operação de escrita chega ao Top Gerente.
- [ ] O módulo de domínio da integração tem cobertura de testes de pelo menos 80%.
