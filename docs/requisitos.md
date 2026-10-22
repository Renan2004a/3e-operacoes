# Requisitos efetivos

A especificação original convertida integralmente está em `docs/fontes/requisitos-original.md`. Este arquivo define como interpretá-la no estado atual.

## Histórias de usuário

HU01 a HU06 permanecem como base: Operador, Gerente de Produção, Vendedor, Expedição, Responsável pelo Sistema e Desenvolvedor/Responsável Técnico.

## Requisitos funcionais preservados

- RF001 Integração com o Top Gerente.
- RF002 Organização dos itens por setor.
- RF003 Fila de atividades por setor.
- RF004 Registro da execução.
- RF005 Registro de ocorrências.
- RF006 Acompanhamento da produção.
- RF007 Gestão de prioridades.
- RF008 Consulta de pedidos pelo vendedor.
- RF009 Controle de disponibilidade.
- RF010 Controle de entregas.
- RF011 Controle de saldo dos pedidos.
- RF012 Alertas de produção.
- RF013 Gerenciamento de usuários.
- RF014 Gerenciamento de perfis e permissões.
- RF015 Gerenciamento de setores.
- RF016 Registro de logs.
- RF017 Monitoramento da integração.
- RF018 Impressão de ordem de produção.

## Ajustes de interpretação aprovados

- RF001: integração é sob demanda e assíncrona, iniciada pelo número do pedido; não usar polling contínuo.
- RF002: somente três setores operacionais nesta etapa. A categoria vem do Top Gerente; o app mantém mapeamento categoria → setor configurável. A classificação é manual, com **sugestão** de setor a partir do produto (`ProductSectorRule`, regras semeadas e ajustáveis).
- RF003/RF004: operador pode pertencer a mais de um setor; gerente também pode alterar status.
- RF008: vendedor pode consultar **todos** os pedidos. É somente leitura para produção, com a exceção aprovada de cadastrar/alterar prazo de entrega.
- RF010: Expedição e Gerente registram entregas. Exceção acima do disponível exige autorização gerencial, motivo e auditoria. A entrega pode ser **programada por remessa** (número + data prevista + confirmação) por item; Gerente e Vendedor programam.
- RF012: prazo é opcional e pode existir por item/setor. Sem prazo, nunca classificar como atrasado. Alertas cobrem também itens **parados** (sem execução há mais de `ALERTA_PARADO_DIAS`, padrão 5) e **não encaminhados** (pendentes de desmembramento).
- RF013/RF014: associação usuário ↔ setor é muitos-para-muitos.

## Decisões de 2026-10-22 (correções do perfil Vendedor)

Registro das decisões do planejamento das correções do Vendedor. Decisões **aprovadas** e **pendentes** estão separadas. Nenhuma regra anterior foi substituída; o texto acima foi mantido, e as complementações indicam a origem.

### Aprovadas

- **Exceções do Vendedor (RF008):** além de cadastrar/alterar prazo, o Vendedor pode desmembrar itens (AD-003), corrigir setor de item sem registro operacional (AD-006/AD-007) e programar remessas (AD-004). Não altera execução, ocorrência nem entrega. *Justificativa:* a frase de RF008 acima ficou incompleta em relação às decisões posteriores registradas em `.specs/STATE.md`.
- **Solicitação de importação (RF001):** o Vendedor mantém a permissão de solicitar importação pelo número do pedido. A identificação do usuário autenticado que solicitou a importação deve ser registrada, reutilizando o log de auditoria existente. *Implementação pendente.*
- **Conclusão da entrega (RN004):** a RN004 permanece sem alteração de texto. "Entrega concluída" refere-se à quantidade **executada**. O **atendimento integral** da quantidade **solicitada** é um conceito distinto, apresentado como indicador derivado, sem campo persistido. Entrega concluída do executado não implica pedido integralmente atendido.
- **Filtros de data de pedidos:** as datas de filtro são interpretadas em `America/Sao_Paulo` e o último dia selecionado é incluído integralmente. A referência continua sendo a data de criação (`createdAt`). *Implementação concluída e testes automatizados aprovados (796 na entrega; suíte atual de 815). Validação no navegador ainda pendente. Aprovação provisória, sem encerramento definitivo da AD-014.*
- **Estados operacionais do pedido (RF006/RF008):** Pendente, Em andamento e Produção concluída. Os critérios consideram todos os itens ativos, inclusive os não classificados. Pedido com item ativo não classificado não pode estar com produção concluída. Divergência (`DIVERGENT`) não é tratada automaticamente como produção concluída e deve ser sinalizada para análise. *Critérios detalhados pendentes (ver abaixo).*
- **Filtro de setor de pedidos (AD-018):** o filtro usa o código do setor (`CORTE_DOBRA`, `TELHAS`, `REVENDA`), não o texto digitado nem o id interno. A interface oferece os setores como seleção; a API responde `400 invalid_filters` para código inexistente. Pedido aparece no filtro se tiver ao menos uma atividade no setor; pedido sem itens classificados não aparece com filtro de setor. O status exibido continua calculado sobre todos os itens do pedido (decisão de preservar o status global, sem alterar as regras de status). *Implementado e aprovado provisoriamente com 815 testes automatizados; validação no navegador e teste de integração com MySQL pendentes.*
- **Revenda (RN031):** a fórmula Pendente = Solicitado − Separado − Indisponível é preservada literalmente. Indisponível representa falta de estoque: não é quantidade separada nem disponível para entrega.
- **Cancelamento de item:** aprovado conceitualmente como cancelamento lógico, preservando o histórico operacional. A ausência de um item no payload do Top Gerente **não** é interpretada como cancelamento. *Contrato do conector e campo de banco pendentes.*

### Pendentes (não são regras vigentes)

- **Prazos em dois níveis** (item e atividade, independentes, sem herança, alertas por escopo): orientação adotada para o planejamento; confirmação formal pendente.
- **Cancelamento:** indicador explícito no conector, campo em `OrderItem` e comportamento nos indicadores e nas operações.
- **Revenda com indisponibilidade:** conclusão automática e critério de atendimento (T00.4).
- **Estados de pedido:** critérios finais e impactos em indicadores e nos demais perfis.
- **Data original do pedido no Top Gerente** como referência de filtro: validação no ambiente de integração.
- **Remessas:** quem confirma, significado de "confirmada", reconfirmação, remoção de remessa confirmada e auditoria.
- **Divergências:** responsáveis, ações de resolução e avisos ao Vendedor.
- **Alerta de atraso do item:** depende do critério de atendimento integral.
- **Filtro de setor de pedidos:** validação no navegador (Vendedor e Gerente) e teste de integração com MySQL da consulta real; nenhum dos dois foi executado.

## Requisitos não funcionais

RFN001 a RFN007 e RFN009 permanecem vigentes. RFN001 já está corrigido na fonte convertida. **RFN008 (offline) está adiado e não faz parte do escopo atual**, por decisão posterior.

## Fonte e precedência

Para detalhes de fluxo e critérios originais, consultar `docs/fontes/requisitos-original.md`. Para decisões que alteram a fonte histórica, consultar `docs/decisoes.md`.
