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
- RF010: Expedição e Gerente registram entregas. Exceção acima do disponível exige autorização gerencial, motivo e auditoria. A entrega pode ser **programada por remessa** (número + data prevista + confirmação) por item; Gerência e Expedição programam (`programar_remessa`). O Vendedor apenas acompanha as datas, conforme a AD-023.
- RF012: prazo é opcional e pode existir por item/setor. Sem prazo, nunca classificar como atrasado. Alertas cobrem também itens **parados** (sem execução há mais de `ALERTA_PARADO_DIAS`, padrão 5) e **não encaminhados** (pendentes de desmembramento).
- RF013/RF014: associação usuário ↔ setor é muitos-para-muitos.

## Decisões de 2026-10-22 (correções do perfil Vendedor)

Registro das decisões do planejamento das correções do Vendedor. Decisões **aprovadas** e **pendentes** estão separadas. Nenhuma regra anterior foi substituída; o texto acima foi mantido, e as complementações indicam a origem.

### Aprovadas

- **Exceções do Vendedor (RF008):** além de cadastrar/alterar prazo, o Vendedor pode desmembrar itens (AD-003), corrigir setor de item sem registro operacional (AD-006/AD-007) e acompanhar as datas das remessas (AD-023); a programação e a gestão de remessas são de Gerência/Expedição (`programar_remessa`). Não altera execução, ocorrência nem entrega. *Justificativa:* a frase de RF008 acima ficou incompleta em relação às decisões posteriores registradas em `.specs/STATE.md`.
- **Solicitação de importação (RF001):** o Vendedor mantém a permissão de solicitar importação pelo número do pedido. A identificação do usuário autenticado que solicitou a importação deve ser registrada, reutilizando o log de auditoria existente. *Implementado em 2026-10-24: a rota obtém o usuário exclusivamente da sessão e grava `IMPORT_REQUESTED` em `logs_auditoria` na mesma transação do job, com job, número do pedido, momento, tipo (`NEW_ATTEMPT`/`REUSED_JOB`) e indicação de novo despacho. Cada solicitação bem-sucedida gera uma linha; a consolidação de repetições do mesmo usuário permanece pendente de decisão.*
- **Conclusão da entrega (RN004):** a RN004 permanece sem alteração de texto. "Entrega concluída" refere-se à quantidade **executada**. O **atendimento integral** da quantidade **solicitada** é um conceito distinto, apresentado como indicador derivado, sem campo persistido. Entrega concluída do executado não implica pedido integralmente atendido.
- **Filtros de data de pedidos:** as datas de filtro são interpretadas em `America/Sao_Paulo` e o último dia selecionado é incluído integralmente. A referência continua sendo a data de criação (`createdAt`). A interface rotula o período como “Data de importação” e esclarece que se refere à entrada do pedido no 3E. *Implementação concluída e testes automatizados aprovados (796 na entrega; suíte atual de 815). Validação no navegador ainda pendente. Aprovação provisória, sem encerramento definitivo da AD-014.*
- **Estados operacionais do pedido (RF006/RF008):** Pendente, Em andamento e Produção concluída. Os critérios consideram todos os itens ativos, inclusive os não classificados. Pedido com item ativo não classificado não pode estar com produção concluída. Divergência (`DIVERGENT`) não é tratada automaticamente como produção concluída e deve ser sinalizada para análise. *Critérios detalhados pendentes (ver abaixo).*
- **Filtro de setor de pedidos (AD-018):** o filtro usa o código do setor (`CORTE_DOBRA`, `TELHAS`, `REVENDA`), não o texto digitado nem o id interno. A interface oferece os setores como seleção; a API responde `400 invalid_filters` para código inexistente. Pedido aparece no filtro se tiver ao menos uma atividade no setor; pedido sem itens classificados não aparece com filtro de setor. O status exibido continua calculado sobre todos os itens do pedido (decisão de preservar o status global, sem alterar as regras de status). *Implementado e aprovado provisoriamente com 815 testes automatizados; validação no navegador e teste de integração com MySQL pendentes.*
- **Pesquisa por número do pedido (AD-019):** a pesquisa usa o número comercial do Top Gerente (`Order.legacyNumber`), nunca o id interno (`Order.id`). É **parcial (contém)**, sem diferenciar maiúsculas e com espaços nas bordas removidos. O filtro vazio não restringe a consulta. A pesquisa é aplicada no servidor sobre todos os pedidos acessíveis antes do limite padrão de 20 e pode ser combinada com cliente, setor, status e período. Não altera status, saldos, conclusão nem permissões. *Aprovada provisoriamente em 2026-10-22. Decisões confirmadas: pesquisa parcial por `legacyNumber`, combinação com os demais filtros, permissões existentes e `Order.id` inalterado. Pendentes: validação no navegador, teste de integração com MySQL e otimização das consultas para não carregar todos os pedidos em memória na etapa A1 — Paginação. Sem alteração de banco, sem paginação nova nesta etapa e sem deploy.*
- **Paginação dos pedidos (A1):** a lista é paginada no servidor, com `limite` (padrão 20, teto 100) e `offset`; a API devolve também `paginacao` com `pagina`, `total` e `totalPaginas`. Filtros, ordenação (`createdAt` desc, `id` asc) e paginação são aplicados no MySQL antes de retornar a página. A pesquisa por número continua parcial e passa a tratar `%` e `_` como literais; pela collation `utf8mb4_unicode_ci`, a busca também não diferencia acentos. Pedidos com vários setores não são duplicados. O status exibido continua global e derivado das atividades, preservando os critérios atuais. A interface navega entre páginas, mantém os filtros e volta à primeira página quando eles mudam ou após uma importação. Página inexistente responde `200` com lista vazia e total correto. Sem alteração de banco, migração ou CI nesta etapa. *Implementado e validado com testes unitários, de rota, de componente e de integração com MySQL. Aprovação provisória; validação no navegador pendente.*
- **Prazos em dois níveis (AD-009):** `OrderItem.deadlineAt` é o prazo de entrega do item e `Activity.deadlineAt` é o prazo operacional do setor. Os níveis são independentes, sem herança automática. O prazo é uma data civil (`YYYY-MM-DD` estrito), interpretada em `America/Sao_Paulo` e válida até o fim do dia; sem prazo, nunca é atrasado. A leitura segue `consultar_pedidos`; a escrita do prazo de entrega segue `definir_prazo`. A remoção de prazo, o alerta comercial (dependente da AD-011), a edição do prazo operacional e a auditoria de prazo ficam fora desta etapa. *Implementado com testes unitários, de rota, de componente e de integração com MySQL local; validação no navegador pendente.*
- **Revenda (RN031):** a fórmula Pendente = Solicitado − Separado − Indisponível é preservada literalmente. Indisponível representa falta de estoque: não é quantidade separada nem disponível para entrega.
- **Cancelamento de item:** aprovado conceitualmente como cancelamento lógico, preservando o histórico operacional. A ausência de um item no payload do Top Gerente **não** é interpretada como cancelamento. *Contrato do conector e campo de banco pendentes.*

### Pendentes (não são regras vigentes)

- **Cancelamento:** indicador explícito no conector, campo em `OrderItem` e comportamento nos indicadores e nas operações.
- **Revenda com indisponibilidade:** conclusão automática e critério de atendimento (T00.4).
- **Estados de pedido:** critérios finais e impactos em indicadores e nos demais perfis.
- **Data original do pedido no Top Gerente** como referência de filtro: validação no ambiente de integração.
- **Remessas:** quem confirma, significado de "confirmada", reconfirmação, remoção de remessa confirmada e auditoria.
- **Auditoria de solicitações repetidas de importação:** confirmar se cada requisição dentro da janela de idempotência deve gerar uma linha própria ou se repetições do mesmo usuário podem ser consolidadas. A implementação atual registra cada solicitação bem-sucedida, sem sobrescrever a autoria anterior.
- **Divergências:** responsáveis, ações de resolução e avisos ao Vendedor.
- **Alerta de atraso do item:** depende do critério de atendimento integral.
- **Filtro de setor de pedidos:** validação no navegador (Vendedor e Gerente) e teste de integração com MySQL da consulta real; nenhum dos dois foi executado.

## Requisitos não funcionais

RFN001 a RFN007 e RFN009 permanecem vigentes. RFN001 já está corrigido na fonte convertida. **RFN008 (offline) está adiado e não faz parte do escopo atual**, por decisão posterior.

## Fonte e precedência

Para detalhes de fluxo e critérios originais, consultar `docs/fontes/requisitos-original.md`. Para decisões que alteram a fonte histórica, consultar `docs/decisoes.md`.
