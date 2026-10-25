# Regras de negócio efetivas

A fonte histórica integral está em `docs/fontes/regras-negocio-original.md`. As regras abaixo incorporam as decisões mais recentes do time.

## Conceito transversal

Item operacional: **solicitado → executado conforme o setor → disponível → entregue**.

- Corte e Dobra: executado = peças conformes produzidas.
- Telhas: executado = metros conformes produzidos.
- Revenda: executado = itens separados; a UI deve dizer “separado”, nunca “produzido”.

## Regras transversais

- **Saldo pendente de atendimento:** deve refletir o que ainda falta para cumprir a quantidade solicitada com unidades conformes/separadas válidas.
- **Disponível para entrega:** executado conforme − entregue.
- Toda quantidade respeita a unidade do item; não misturar unidades.
- Entrega parcial não conclui o item enquanto houver quantidade válida ainda não entregue.
- Entrega acima do disponível é bloqueada; gerente pode autorizar exceção com motivo obrigatório e auditoria.
- Correção de setor de item já desmembrado: permitida ao vendedor, ao gerente e ao responsável pelo sistema somente enquanto o item não tiver execução, ocorrência, entrega ou atividade iniciada. Gerente e responsável pelo sistema informam motivo obrigatório. Toda correção é auditada; com registro operacional, a correção é recusada (conflito).
- Perdas, refugos e indisponibilidades exigem motivo quando informados; a lista fechada real ainda deve ser levantada.

## Corte e Dobra

- Unidade: peça; valores inteiros.
- Peça perdida não conta como produzida/conforme.
- **Pendente de produção = Solicitado − Produzido conforme.**
- Exemplo: solicitado 10, produzido 8, perdido 2 ⇒ pendente 2; novas peças precisam ser produzidas até alcançar 10 conformes.
- Perda é evento separado, nunca convertida em produção.

## Telhas

- Unidade: metro; valores decimais; padronizar 2 casas decimais.
- Refugo não conta como metragem produzida/conforme.
- **Pendente de produção = Solicitado − Produzido conforme.**
- Exemplo: solicitado 10 m, produzido 8 m, refugado 2 m ⇒ pendente 2 m.
- Refugo é opcional; quando registrado, exige motivo.

## Revenda

- Não existe produção; existe separação.
- Separação não deve disparar baixa de matéria-prima de produção.
- Indisponibilidade representa falta de estoque, não perda.
- A fórmula histórica RN031 (`solicitado − separado − indisponível`) permanece como fonte, mas o significado de “pedido atendido” quando existe indisponibilidade ainda precisa ser validado antes de codificar a conclusão automática do item.

## Prazos e atraso

- Prazo é opcional.
- Sem prazo: status de prazo = `SEM_PRAZO`, nunca atrasado.
- Prazo pode existir por item/setor e pode ser definido por gerente ou vendedor.
- Atraso só existe quando o prazo aplicável é conhecido e foi ultrapassado sem conclusão correspondente.
- Os dois níveis são independentes (AD-009): item = prazo de entrega; atividade = prazo operacional do setor. Não há herança entre eles.
- O prazo é uma data civil interpretada em `America/Sao_Paulo` e vale até o **fim do dia**. O prazo de hoje não está atrasado; o de ontem está. O formato aceito é `YYYY-MM-DD`, sem horário.
- Remoção de prazo, alerta comercial por prazo de entrega e auditoria de prazo não fazem parte desta etapa (ver `docs/backlog.md`).

## Reimportação, unidade e histórico operacional

- Reimportar não altera `createdAt`. O período da consulta continua sendo a data de criação/importação; o link do pedido é explícito e não depende dos filtros da lista.
- Reutilizar um resultado recente **não** é uma nova consulta ao Top Gerente. A interface deve informar quando houve reutilização e não prometer dados atualizados.
- Uma consulta nova pode resultar em importação de pedido novo ou atualização de pedido existente; os dois casos têm mensagens distintas.
- A unidade do item é comparada pela normalização existente (`chaveUnidade`: remover espaços e ignorar maiúsculas). Diferença apenas de escrita, como `M` e `m`, não é mudança real de unidade.
- Se a unidade real mudar e o item tiver execução, ocorrência, entrega, remessa programada ou atividade já iniciada, a unidade anterior é preservada e o item **não** é atualizado. Não há conversão automática de quantidades nem alteração do histórico.
- A divergência de unidade é registrada em `AuditLog` (`UNIT_DIVERGENCE`), no evento do job (`UNIT_DIVERGENCE`) e apresentada ao Vendedor no resultado da importação.
- Se não houver registros operacionais, a unidade e a quantidade solicitada podem ser atualizadas na mesma transação. Atividade apenas `PENDING`, sem lançamentos, não bloqueia a troca.
- Pedido, itens e auditoria da divergência de unidade são gravados na mesma transação. Classificação automática e auditoria de divergência de quantidade ocorrem depois do upsert; se falharem, o job termina `FAILED` explicitamente, sem esconder a falha. Não deve haver persistência parcial silenciosa.

## Sincronização e atualização de quantidade solicitada

- Quantidade solicitada importada do Top Gerente continua sendo dado comercial de origem.
- Nova sincronização do mesmo pedido atualiza essa quantidade no app.
- Não apagar produção, perdas, ocorrências ou entregas já registradas.
- Se a nova quantidade solicitada ficar menor que o já executado/entregue, registrar divergência para tratamento explícito.
