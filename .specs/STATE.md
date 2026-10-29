# STATE - 3E Operações

## Estado atual

Projeto em produção no Railway, com perfis de Vendedor, Gerente, Operador, Expedição e Administração. O perfil Operador foi revisado em 2026-10-26: telas separadas (Meus pedidos / Ocorrências / execução), feedback de ações e ocorrências visíveis no painel do Gerente (AD-021).

## Decisões vigentes

- OpenCode é o agente principal de desenvolvimento.
- Skills são locais ao projeto e versionadas no Git.
- Em conflitos de metodologia entre uma skill do Tech Leads Club e uma skill local 3E, a skill do Tech Leads Club prevalece. Regras de domínio continuam sendo definidas pelos documentos do projeto.
- Fluxo principal: Tech Leads Club `tlc-spec-driven` + skills locais específicas do domínio.
- Stack: Next.js App Router, TypeScript, Prisma no banco próprio, MySQL, Zod, npm.
- Hospedagem do aplicativo: Railway.
- Top Gerente: acesso somente leitura por conector local e Cloudflare Tunnel/Access; sem polling contínuo.
- Sincronização: assíncrona e disparada por requisição de usuário a partir do número do pedido.
- Setores usados agora: Corte e Dobra, Telhas e Revenda.
- Usuário pode pertencer a mais de um setor.
- Vendedor consulta todos os pedidos, pode definir/alterar prazo de entrega e fazer o desmembramento (classificar itens por setor); não altera produção.
- Expedição e gerente registram entregas.
- Operação offline foi adiada; não faz parte do escopo atual.
- Referências visuais são inspiração, não especificação e não obrigam reaproveitamento de código.
- Frontend deve funcionar em celular, tablet, notebook e desktop, com objetivo WCAG 2.1 AA.
- Testes: Vitest + Testing Library + Playwright; cobertura alvo de 80% nos módulos críticos de domínio.
- CI no GitHub: lint, typecheck, testes e build.
- Datas persistidas em UTC e exibidas em `America/Sao_Paulo`.

## Próximo passo recomendado

Executar uma primeira feature pelo `tlc-spec-driven`: **importar um pedido por número via conector local**, começando pela especificação e pelos contratos entre Railway, conector local e Top Gerente.

*Atualização em 2026-10-22: a importação já está implementada. O próximo passo passou a ser o planejamento e a execução das correções do perfil Vendedor (ver "Handoff" de 2026-10-22).*

## Pontos ainda a validar com dados reais

- Tabelas e joins exatos do Top Gerente para pedido, itens, categoria, cliente e vendedor.
- Lista oficial de categorias e seu mapeamento operacional para os três setores.
- Lista fechada real de motivos de perda, refugo e indisponibilidade.
- Regra de Revenda para o significado final de “indisponível” no saldo pendente.
- Cancelamento lógico de item: contrato do conector (indicador explícito) e campo em `OrderItem` (AD-010).
- Critérios finais dos estados do pedido e impactos nos indicadores (AD-013).
- Quem confirma remessa, significado de "confirmada", reconfirmação, remoção e auditoria (AD-016).
- Responsáveis e ações de tratamento de divergências (AD-017).
- Data original do pedido no Top Gerente como referência de filtro (AD-014).
- Prazos antigos gravados com a semântica anterior (meia-noite UTC): verificar se existem dados reais antes de qualquer conversão (AD-009/D6).

## Decisions

### AD-001

- **Decision**: A integração lê o Top Gerente por `orcamento` + `orcamento_itens` (e `cad_produto` quando houver), via conector local, somente leitura.
- **Reason**: O guia RDS e o dump confirmaram o join; o legado segue como fonte oficial dos dados comerciais.
- **Trade-off**: Dependência do conector e do RDS; a instância acessível não tem catálogo de produtos (`cad_produto` vazia).
- **Scope**: features de integração e pedidos.
- **Date**: 2026-10-06
- **Status**: active

### AD-002

- **Decision**: O adapter do legado é real (RDS) e os testes usam fake; o domínio não depende de banco.
- **Reason**: Mantém os testes rápidos e determinísticos, sem MySQL local.
- **Trade-off**: O teste unitário não cobre o SQL real; isso fica em teste de integração separado.
- **Scope**: todos os módulos de domínio.
- **Date**: 2026-10-06
- **Status**: active

### AD-003

- **Decision**: O vendedor passa a poder fazer o **desmembramento** do pedido (classificar itens por setor), além de definir prazo. A tela de detalhe do pedido não exibe mais o CUID do item (usa posição/descrição) e mostra o desmembramento por setor.
- **Reason**: Pedido do cliente/professor; o vendedor conhece o pedido e faz a separação/desmembramento hoje no papel.
- **Trade-off**: Amplia a matriz de permissões do vendedor; as demais ações de produção continuam negadas.
- **Scope**: permissões, pedidos (vendedor/gerente), indicadores.
- **Date**: 2026-10-08
- **Status**: active

### AD-004

- **Decision**: Fechar as lacunas A/B/C do cliente com: (A) alertas operacionais de **atrasados**, **parados** (sem execução há `ALERTA_PARADO_DIAS`, padrão 5) e **não encaminhados**, com endpoint `GET /api/indicadores/alertas` e card no painel; (B) **remessas** (entrega programada) por item — número + data prevista + confirmação — via `ScheduledDelivery`, com permissão `programar_remessa` (gerente/vendedor); (C) **sugestão de setor** por produto via `ProductSectorRule` (regras semeadas), pré-selecionada no desmembramento sem impedir a troca.
- **Reason**: Requisitos explícitos do cliente (RF012, RF010, RF002) apontados como parciais na análise de conformidade.
- **Trade-off**: "Parado" e a forma da remessa foram decididos por default do agente (limiar configurável e número+data); a edição das regras em runtime e o vínculo remessa↔entrega ficam no backlog.
- **Scope**: indicadores (alertas), expedição (remessas), setores (sugestão), frontend (painel/detalhe).
- **Date**: 2026-10-15
- **Status**: active

### AD-005

- **Decision**: As **tabelas físicas** do banco do app passam a usar **português** (`snake_case`, plural), aplicado por `@@map` no Prisma. Os modelos do código continuam em inglês para preservar domínio, APIs e testes. A renomeação usa `RENAME TABLE` + normalização de constraints, sem recriar tabelas nem perder dados.
- **Reason**: Pedido explícito do cliente/docentes para padronizar a nomenclatura visível no banco (DBeaver) em português, alinhando ao vocabulário do MER e da interface.
- **Trade-off**: Tabelas em português e colunas/modelos em inglês; a tradução de colunas exigiria `@map` em cada campo e uma nova migration (fase futura). O ambiente hospedado precisa ser implantado junto com a migration.
- **Scope**: banco, Prisma, migrations, documentação de banco e DER.
- **Date**: 2026-10-20
- **Status**: active

### AD-006

- **Decision**: O vendedor pode **corrigir o setor** de um item já desmembrado, desde que o item não tenha execução, ocorrência, entrega nem atividade iniciada (status diferente de `PENDING`). Gerente e responsável pelo sistema fazem correções **com motivo obrigatório**. Toda troca grava auditoria (`SECTOR_CORRECTION`) com setor anterior, setor novo, usuário e motivo. Quando há registro operacional, a API responde 409 (`operational_records`). Remessas programadas não bloqueiam a correção.
- **Reason**: Desmembramento errado hoje é definitivo na tela; o vendedor conhece o pedido e precisa corrigir sem depender de outro perfil, sem deixar registros de produção órfãos no setor antigo.
- **Trade-off**: A checagem de bloqueio é feita no servidor com `updateMany` condicional, sem tela de correção nesta etapa. A exigência de motivo para gerente/sistema é decisão de default do agente, a confirmar com o cliente.
- **Scope**: setores (classificação), permissões, pedidos (vendedor/gerente), auditoria.
- **Date**: 2026-10-21
- **Status**: revisado pelo AD-007 (regras de bloqueio, permissão e registros mantidas; o trade-off "sem tela de correção nesta etapa" foi superado)

### AD-007

- **Decision**: Complementa e revisa o AD-006 na correção de setor de item já desmembrado:
  - Vendedor corrige sem justificativa, desde que tenha a permissão `corrigir_setor` e não existam registros operacionais conflitantes.
  - Gerente (`PRODUCTION_MANAGER`) e Responsável pelo Sistema (`SYSTEM_RESPONSIBLE`) precisam informar justificativa obrigatória, que não pode ser vazia nem conter só espaços.
  - A justificativa tem limite de 500 caracteres Unicode, contados por pontos de código (um emoji simples vale 1). A mesma regra vale no frontend e no backend, por `src/modules/setores/motivo-correcao.ts`.
  - Registros operacionais conflitantes são execução, ocorrência, entrega ou atividade com status diferente de `PENDING`. Remessas programadas não bloqueiam.
  - O servidor responde `409` (`operational_records`, com mensagem) quando há conflito real, `403` sem permissão, `400` para justificativa ausente (`reason_required`) ou acima do limite (`reason_too_long`), e `422` (`item_not_classified`) para item ainda não desmembrado, que continua no fluxo de classificação inicial.
  - A interface informa antecipadamente o bloqueio: a ação aparece desabilitada, com o motivo. Ela não aparece para perfis sem permissão. A validação da interface não substitui a do servidor.
  - Toda correção autorizada grava auditoria `SECTOR_CORRECTION` com usuário, data e horário, item (entidade), setor anterior e novo (id, código e nome), `activityId` e justificativa quando houver. Registros anteriores são preservados.
- **Reason**: Confirmação do cliente sobre a exigência de justificativa para gerente e responsável pelo sistema, que no AD-006 era default do agente. Também a necessidade de a interface mostrar o bloqueio antes da tentativa.
- **Trade-off**: A checagem de bloqueio é repetida na interface a partir do detalhe do pedido, e o servidor continua sendo a fonte de verdade. O código e o nome do setor vão no JSON da auditoria, então renomear um setor não altera o histórico. Nenhuma tabela nova foi criada.
- **Scope**: setores (correção de setor), pedidos (detalhe com bloqueio), auditoria. A matriz de permissões não mudou.
- **Date**: 2026-10-21
- **Status**: active

### AD-008

- **Decision**: Totais e somas de quantidades são agrupados pela **unidade de medida** do item. Não existe total geral entre unidades diferentes (RN01, RN02). O agrupamento compara a unidade sem espaços nas bordas e sem diferenciar maiúsculas; **não há conversão nem equivalência** entre códigos (ex.: `M`, `MT` e `M2` são unidades distintas). Item sem unidade informada forma grupo próprio, rotulado “sem unidade informada”, e nunca é somado com unidade válida (RN05); não se inventa unidade padrão. O cálculo fica no servidor (`totalizarPorUnidade` em `consulta-pedidos`, `montarPcpDe` em `pcp`, helper `agruparPorUnidade` em `producao/totais-por-unidade`); a interface apenas apresenta os valores.
- **Reason**: RN01–RN05 do ajuste “Correção dos totais dos pedidos”. Antes, o detalhe do pedido, a entrega e a produção por setor somavam peças com metros.
- **Trade-off**: Pedido com mais de uma unidade mostra vários totais em vez de um número único. Mudança de contrato aditiva: `GET /api/pedidos/[orderId]` ganha `totaisPorUnidade`; `GET /api/indicadores` passa a devolver uma entrada de `producaoPorSetor` por setor **e** unidade, com o campo `unidade`. Equivalência de códigos legados (M/MT, UN/PC) fica em aberto para o negócio.
- **Scope**: indicadores (detalhe e PCP), expedição (entregas), painel do gerente e detalhe do pedido.
- **Date**: 2026-10-21
- **Status**: active

### AD-009

- **Decision**: Prazos em dois níveis, opcionais e independentes. Item (`OrderItem.deadlineAt`) é o prazo de atendimento/entrega ao cliente; atividade (`Activity.deadlineAt`) é o prazo operacional do setor. Sem herança automática entre os níveis. Alertas de atraso consideram cada nível no seu escopo. Sem prazo: `SEM_PRAZO`, nunca atrasado. Nenhum campo novo. O prazo é uma **data civil** no formato estrito `YYYY-MM-DD`, persistida como o **fim do dia em `America/Sao_Paulo`**; a leitura do detalhe devolve `deadlineAt` e `activityDeadlineAt`; a interface hidrata o prazo do item e exibe o do setor somente para leitura.
- **Reason**: Preserva o design de `prazos-e-alertas` (item = entrega; atividade = setor) e `decisoes.md` (data distinta por item/setor), sem criar herança não aprovada. A correção de 2026-10-22 eliminou a causa do “prazo que desaparece”: o dado sempre esteve no banco, mas a API de detalhe não o devolvia e a interface usava apenas estado local.
- **Trade-off**: Duas datas podem divergir; a interface indica qual prazo está em atraso. O alerta comercial do item continua dependente da AD-011. Prazos antigos gravados em meia-noite UTC não são convertidos automaticamente. Remoção de prazo, edição do prazo operacional e auditoria ficam para etapas próprias.
- **Scope**: prazos, leitura do detalhe, alertas operacionais (sem alteração de lógica), indicadores.
- **Date**: 2026-10-22
- **Status**: active (aprovada formalmente, implementada e validada localmente). Pendente: validação no navegador para Vendedor e Gerente.

### AD-010

- **Decision**: Cancelamento lógico de item. Item cancelado no Top Gerente é preservado com seu histórico, sem exclusão. Ausência de item no payload **não** é cancelamento. O cancelamento deve ser informado explicitamente pelo conector.
- **Reason**: Aprovado conceitualmente pelo responsável. Preserva o histórico operacional (RFN005, RFN006).
- **Trade-off**: Exige mudança de contrato do conector e, possivelmente, campo em `OrderItem`. Comportamento nos indicadores e nas operações ainda deve ser definido antes da implementação.
- **Scope**: integração (conector, contrato, importação), pedidos, saldo, indicadores, operações.
- **Date**: 2026-10-22
- **Status**: approved conceptually. Contrato do conector e campo de banco pendentes de aprovação; nenhuma alteração feita.

### AD-011

- **Decision**: RN004 mantida sem alteração de texto. "Entrega concluída" refere-se à quantidade executada. "Atendimento integral" refere-se à quantidade solicitada e é um conceito distinto, apresentado como indicador derivado, sem campo persistido. Pedido não é integralmente atendido apenas porque toda a quantidade executada foi entregue.
- **Reason**: Opção A aprovada pelo responsável: manter a RN004 e criar a distinção, em vez de alterar a regra vigente.
- **Trade-off**: Dois conceitos próximos exigem rótulos claros na interface.
- **Scope**: expedição (status de entrega), indicadores, detalhe do pedido.
- **Date**: 2026-10-22
- **Status**: active (decisão). Implementação pendente.

### AD-012

- **Decision**: Revenda segue a RN031 literalmente: Pendente = Solicitado − Separado − Indisponível. Indisponível representa falta de estoque; não é quantidade separada nem disponível para entrega. Pedido de Revenda com indisponibilidade **não** é considerado atendido automaticamente.
- **Reason**: Preserva a regra vigente. A validação formal do significado de "atendido" permanece pendente (T00.4).
- **Trade-off**: Pedido de Revenda com indisponibilidade pode permanecer sem conclusão automática até a validação.
- **Scope**: saldo da Revenda, indicadores, detalhe do pedido.
- **Date**: 2026-10-22
- **Status**: RN031 active (preservada). T00.4 pending. Nenhuma nova regra definitiva criada.

### AD-013

- **Decision**: Estados operacionais do pedido: Pendente, Em andamento e Produção concluída. Os critérios consideram todos os itens ativos, inclusive os não classificados. Pedido com item ativo não classificado não pode estar com produção concluída. `DIVERGENT` não é tratado automaticamente como produção concluída e deve ser sinalizado para análise. O status é derivado, sem novo estado persistido. Mapeamento proposto para os valores existentes: `PENDING` → Pendente, `IN_PROGRESS` → Em andamento, `COMPLETED` → Produção concluída.
- **Reason**: Aprovação parcial pelo responsável. Os valores persistidos existentes são preservados; apenas o rótulo é ajustado.
- **Trade-off**: Os critérios finais e os impactos em indicadores e em outros perfis ainda devem ser verificados antes da implementação. Atendimento integral é indicador separado (AD-011).
- **Scope**: indicadores, lista e detalhe de pedidos, painel do gerente, PCP.
- **Date**: 2026-10-22
- **Status**: partially approved. Critérios detalhados pendentes.

### AD-014

- **Decision**: Filtros de data de pedidos: datas interpretadas em `America/Sao_Paulo`, último dia selecionado incluído integralmente. Referência do filtro mantida em `createdAt`.
- **Reason**: Correção de tratamento de fuso horário, que hoje exclui o último dia (interpretação UTC de data sem horário). A semântica do filtro não muda.
- **Trade-off**: Usar a data original do pedido no Top Gerente fica para validação posterior no ambiente de integração.
- **Scope**: consulta de pedidos (vendedor e gerente).
- **Date**: 2026-10-22
- **Status**: active (correção aprovada). Implementação concluída e aprovada provisoriamente com 796 testes; validação no navegador pendente. Limitação: a API aceita apenas `de`/`ate` no formato `YYYY-MM-DD` (timestamps ISO são rejeitados com 400).

### AD-015

- **Decision**: O Vendedor mantém a permissão `solicitar_importacao`. O usuário autenticado que solicitou a importação deve ser registrado, reutilizando `logs_auditoria`, sem nova coluna ou tabela.
- **Reason**: `jobs_integracao` não guarda o solicitante, e RFN006 exige rastreabilidade das operações relevantes.
- **Trade-off**: Nenhum campo novo. A auditoria passa a depender da gravação na mesma operação de criação do job.
- **Scope**: integração (solicitação), auditoria, permissões (sem ampliação).
- **Date**: 2026-10-22
- **Status**: active. Implementado em 2026-10-24: o usuário autenticado é obtido da sessão e propagado ao caso de uso; o job e o `AuditLog` (`IMPORT_REQUESTED`) são gravados na mesma transação. Cada solicitação bem-sucedida gera uma linha append-only; `NEW_ATTEMPT` e `REUSED_JOB` distinguem nova tentativa de reutilização. A consolidação de repetições do mesmo usuário permanece pendente de decisão.

### AD-016

- **Decision**: Remessas: sem alteração de comportamento nesta etapa. Mantidos: remessa por item, número, data prevista, confirmação opcional, sem alteração automática de saldo e sem vínculo automático com entregas.
- **Reason**: Confirmação, reconfirmação, remoção e auditoria não têm decisão formal.
- **Trade-off**: O comportamento atual (reconfirmação sobrescreve a data; remoção de confirmada permitida; sem auditoria) permanece até aprovação.
- **Scope**: expedição (remessas), permissões, auditoria.
- **Date**: 2026-10-22
- **Status**: pending approval (D6).

### AD-017

- **Decision**: Divergências: nenhum novo fluxo de resolução ou permissão nesta etapa. Proposta registrada: Gerente de Produção para divergências operacionais; Responsável Técnico para falhas de integração; Vendedor apenas recebe avisos de leitura. O Vendedor não altera execução nem entrega.
- **Reason**: Responsáveis e ações permitidas ainda não foram definidos.
- **Trade-off**: Divergências seguem visíveis apenas em `logs_auditoria` e no evento do job até a definição do fluxo.
- **Scope**: integração, indicadores, pedidos, permissões.
- **Date**: 2026-10-22
- **Status**: proposed (D7). Pending approval.

### AD-018

- **Decision**: O filtro por setor de `GET /api/pedidos` usa o **código do setor** (`CORTE_DOBRA`, `TELHAS`, `REVENDA`, enum `SectorCode`), e não o texto digitado nem o id interno (cuid). A interface oferece os setores como seleção fixa ("Todos" não envia o parâmetro). Código inexistente ou inválido responde `400 invalid_filters`. Pedido entra no filtro quando tem ao menos uma atividade no setor; pedido sem itens classificados não entra no filtro de setor, mas aparece sem filtro. O status do pedido continua calculado sobre **todos** os itens, independentemente do setor selecionado; as regras de status não foram alteradas.
- **Reason**: O campo era texto livre e comparava com o id interno, então um nome como "Telhas" não retornava nada. O código é estável entre ambientes (o id muda entre bancos) e já é o enum do banco.
- **Trade-off**: A API passa a rejeitar valores antes aceitos (mudança de contrato; único consumidor conhecido é a própria tela). Rótulos dos setores ficam fixos na interface; se o nome de um setor mudar no banco, o rótulo não acompanha. Nenhum campo ou tabela nova.
- **Scope**: consulta de pedidos (vendedor e gerente), filtros da lista, status do pedido (somente preservado).
- **Date**: 2026-10-22
- **Status**: active (correção aprovada provisoriamente com 815 testes automatizados). Pendentes: validação no navegador e teste de integração com MySQL da consulta real.

### AD-019

- **Decision**: A pesquisa por número do pedido usa o **número comercial** `Order.legacyNumber` (origem `orcamento.Orc` no Top Gerente), nunca o id interno `Order.id`. O parâmetro da API é `numero`; a comparação é **parcial (contém)**, sem diferenciar maiúsculas e com espaços nas bordas removidos. Campo vazio ou só com espaços não restringe a consulta. A pesquisa é aplicada no servidor sobre todos os pedidos acessíveis, antes do limite padrão de 20, e combina com cliente, setor, status e período.
- **Reason**: RF008 permite ao Vendedor pesquisar por número do pedido, mas a lista só oferecia cliente, setor, status e período. O número comercial é o identificador usado na importação e não coincide com o id interno.
- **Trade-off**: Por ser parcial, um trecho curto pode retornar números semelhantes (ex.: `100` retorna `100`, `1000` e `2100`). O filtro continua em memória no servidor, após carregar todos os pedidos, como os demais filtros; não há paginação nova. O índice existente em `legacyNumber` não é usado pela busca parcial.
- **Scope**: consulta de pedidos (vendedor e gerente), lista de pedidos, API `GET /api/pedidos`, documentação. Permissões, status, saldos e conclusão preservados.
- **Date**: 2026-10-22
- **Status**: active (aprovada provisoriamente em 2026-10-22). Decisões confirmadas: pesquisa parcial por `legacyNumber`, combinação com os demais filtros, permissões existentes preservadas e `Order.id` inalterado. Pendentes: validação no navegador, teste de integração com MySQL e otimização das consultas para não carregar todos os pedidos em memória na etapa **A1 — Paginação**. Sem alteração de banco, migração ou deploy.

### AD-020

- **Decision**: A lista de pedidos passa a ser paginada **no servidor**, no MySQL via Prisma. `limite` (padrão 20, teto 100) e `offset` continuam sendo os parâmetros; a resposta acrescenta `paginacao` com `pagina`, `total` e `totalPaginas`. Filtros de número comercial (parcial), cliente, setor, status derivado e período, além da ordenação `createdAt desc, id asc`, são aplicados no banco antes de `skip`/`take`. Página e total são lidos na mesma transação (`findMany` + `count`). O status derivado é traduzido para relation filters (`every`/`some`/`NOT`) reproduzindo exatamente `statusDoPedido`, sem incorporar as regras pendentes da AD-013. `%` e `_` são escapados e tratados como literais. Página inexistente responde `200` com lista vazia e total correto. A interface navega entre páginas, mantém os filtros na URL e volta à primeira página ao alterar/limpar filtros ou após importar um pedido. Nenhuma alteração de banco, migração, índice ou workflow de CI nesta etapa.
- **Reason**: O limite de 20 era aplicado em memória (`slice`) após carregar todos os pedidos, itens e atividades; Vendedor e Gerente não conseguiam chegar ao 21º pedido. Filtros e contagem no banco eliminam o carregamento integral e permitem navegação completa.
- **Trade-off**: A tradução do status para SQL é um espelho de `statusDoPedido` e precisa ser mantida em sincronia se a AD-013 for alterada. Por usar offset, uma importação concorrente pode deslocar um item entre páginas; a ordenação determinística evita duplicados na mesma resposta e a interface volta à primeira página após importar. A collation `utf8mb4_unicode_ci` torna a busca também insensível a acentos (mudança documentada). A busca parcial com `%...%` não usa o índice de `legacyNumber`. Índice em `createdAt` não foi criado (D6); desempenho deve ser medido com `EXPLAIN` antes de propor migração.
- **Scope**: consulta de pedidos (Vendedor e Gerente), API `GET /api/pedidos`, lista de pedidos, testes e documentação. Filtros AD-014/A2/A6, status global, permissões, saldos e conclusão preservados.
- **Date**: 2026-10-22
- **Status**: active (aprovada e implementada). Testes unitários, de rota, de componente e de integração com MySQL local aprovados; validação no navegador pendente. Sem commit, push ou deploy.

### AD-021

- **Decision**: O perfil Operador passa a ter **telas separadas**: (1) **Meus pedidos** (`/operador/fila`), com as atividades atribuídas e o botão “Abrir atividade”; (2) **Ocorrências** (`/operador/ocorrencias`), para registrar e consultar as próprias ocorrências; (3) **execução** (`/operador/atividades/[id]`), focada em produzir, com link para a ocorrência. A ocorrência continua vinculada à atividade (`ocorrencias.activityId → atividades.orderItemId → pedidos_itens.orderId → pedidos`), sem tabela ou campo novo. O Gerente de Produção passa a ver o resumo no painel via `GET /api/indicadores/ocorrencias` (total, últimos 7 dias, por tipo e recentes com pedido, item, setor, responsável, motivo e data/hora); o Operador vê as próprias via `GET /api/producao/ocorrencias`. Não foi criada uma página redundante de “pedido”: a atividade é a unidade operacional executada. O pool do banco do app passou a aceitar `DB_CONNECTION_LIMIT` (padrão 15) e `DB_ACQUIRE_TIMEOUT_MS` (padrão 30 s) para suportar as chamadas paralelas do painel em RDS lento.
- **Reason**: O operador tinha uma única tela com execução, ocorrência e ordem, e o gerente não enxergava as ocorrências registradas no chão de fábrica. A separação reduz a sobrecarga e fecha o fluxo de informação sem alterar as regras de produção.
- **Trade-off**: A situação de “análise/resolução” da ocorrência **não existe** no modelo/regras e não foi inventada; fica como lacuna de negócio. Não há chave de idempotência para ocorrência (o duplo envio é mitigado pela interface). O resumo do painel carrega até 200 ocorrências para contar; se o volume crescer, migrar a contagem para o banco. O pool maior consome mais conexões do RDS; ajustar por ambiente se o limite do banco for menor.
- **Scope**: telas e navegação do Operador, ocorrências (registro/consulta), painel e API do Gerente, configuração do pool, testes e documentação. Permissões, saldos, status, prazos, entregas, remessas, importação e Top Gerente preservados. Sem migração de banco.
- **Date**: 2026-10-26
- **Status**: active (implementada e validada localmente: 1023 testes, Playwright 9/9, lint/typecheck/build OK, banco inspecionado).

### AD-022

- **Decision**: Os PRs **#15 (Gerente)** e **#14 (Vendedor/Integração)** foram integrados preservando as duas contribuições: (a) o painel do Gerente carrega indicadores, alertas e ocorrências de forma **independente** (`Promise.allSettled`), com erro por bloco, botão **Atualizar** e horário da última atualização; “Cumprimento de prazo” mostra **—** quando não há concluídas com prazo; (b) o detalhe do pedido permite **recolher/abrir itens** (primeiro aberto, “Abrir todos/Recolher todos”) e padroniza “Prazo de entrega (item)” e “Prazo operacional (setor)”; (c) o menu do Gerente passa a usar **“Importar pedido”** e **“Fila de produção”**; (d) a importação reaplica a **espera prolongada** (60 s técnicos, pausa do polling e consulta manual do mesmo job), separa falha de consulta de falha da importação e combina orientação traduzida com o código técnico; (e) job **ativo antigo** é auditado como `REUSED_JOB` (`newDispatch: false`), pois não há novo despacho; (f) filtros e página são preservados no retorno do detalhe (Vendedor e Gerente) via `useSearchParams` e navegação completa do link “Voltar”.
- **Reason**: Os dois PRs corrigiam regressões e lacunas de clareza nos perfis Gerente e Vendedor. A integração mantém o comportamento de ambos sem reintroduzir duplicação de despacho, perda de filtros ou mensagens técnicas sem orientação.
- **Trade-off**: A navegação “Voltar” do detalhe passou a ser **full page load** (mais lenta que client-side), necessária para hidratar a listagem com a query antes do primeiro render. O limite de 60 s é **técnico**, não prazo de negócio/SLA. O job ativo antigo não é reenviado; se o conector ficar preso, a recuperação exige decisão operacional (mesma política anterior). A base local tem 7 pedidos, então o cenário de página 2 não é exercitável nela.
- **Scope**: painel e detalhe do Gerente, detalhe/lista do Vendedor, importação, auditoria de job ativo, navegação/URL, testes e documentação. Permissões, saldos, prazos, entregas, remessas, ocorrências, Top Gerente e banco preservados. Sem migração.
- **Date**: 2026-10-27
- **Status**: active (integrada e validada localmente: **1037 testes**, lint 0 erros, typecheck/build OK; Playwright **15/15** novos + **11/11** responsivo/impressão + **9/9** Operador; deploy e validação hospedada concluídos em 2026-10-27).

### AD-023

- **Decision**: Correções de interface pedidas pelo professor/Saul aplicadas imediatamente: (a) quantidades sempre no **padrão brasileiro** (vírgula; metro com 2 casas, peça inteira) e percentuais com **1 casa decimal** (ex.: 62,5%); (b) **previsão de entrega** visível na lista do Vendedor/Gerente, no detalhe, na atividade do Operador, na Expedição e na impressão; (c) **histórico de prazos** por item, usando `logs_auditoria` (`DEADLINE_CHANGED`, antes/depois, usuário e data), sem nova tabela; (d) **remessa com número automático** (o usuário informa só a data) e **Vendedor sem ações de remessa** — apenas leitura das datas; `programar_remessa` passa a Gerente/Expedição; (e) tela de Setores explica o mapeamento categoria→setor e lista os mapeamentos; (f) tela de Usuários explica que a inativação preserva o histórico.
- **Reason**: O professor considerou as correções de UI urgentes para apresentar ao cliente; Saul não entendia o mapeamento e a inativação de usuários; o Vendedor não deveria executar tarefas da Expedição.
- **Trade-off**: O histórico usa a auditoria genérica (não uma tabela específica de prazos); a consulta é sob demanda. O Vendedor deixa de confirmar/remover remessas (API 403); a Expedição ainda não tem uma tela dedicada de remessas — a gestão continua no detalhe pelo Gerente até a migração do banco. A previsão da lista usa o **maior** prazo entre os itens (pedido completo), não o próximo prazo.
- **Scope**: lista/detalhe do Vendedor e Gerente, atividade/ordem do Operador, Entregas, Administração (setores/usuários), imports de formatação, prazos, remessas, testes e documentação. Sem migração de banco.
- **Date**: 2026-10-27
- **Status**: active (implementada; **1037 testes**, lint 0 erros, typecheck/build OK; Playwright **15/15** de UI; deploy `365f143` validado em produção; vídeo completo em `docs/video/demo-completa-2026-10-27.mp4`).

### AD-024
- **Decision**: A reestruturação do banco apontada pelo professor **não** foi executada nesta rodada. O diagnóstico e o plano estão em `docs/revisao-banco-professor.md`: padronizar nomes físicos em **português**, trocar CUID por **BIGINT**, criar `perfis` + `usuarios_perfis`, substituir `remessas_programadas` por previsões/entregas, remodelar `execucoes` como `apontamentos` e renomear `managerOverride`/`regra_produto_setor`, além de detalhar as regras de negócio.
- **Reason**: A mudança altera PKs/FKs, URLs, DTOs, repositórios, dados e testes; o professor sugeriu desenhar o banco manualmente e gerar o SQL antes de mexer no código. Fazer isso junto com correções de UI colocaria a demonstração em risco.
- **Trade-off**: O banco continua com nomes mistos e IDs string até a migração aprovada; a dívida está documentada. O histórico de prazos já foi resolvido sem schema novo.
- **Scope**: banco, Prisma, ETL, contratos e documentação. Fora do escopo desta rodada.
- **Date**: 2026-10-27
- **Status**: proposed (aguardando decisão/migração dedicada).

### AD-026

*Nota de numeração: o AD-025 foi registrado na branch do PR #24 (V04, atraso comercial), ainda não mergeado. Para evitar colisão quando ele entrar, a próxima decisão nesta base é a AD-026.*

- **Decision**: A classificação manual do item é uma **única unidade transacional** (V06). A transição condicional do item pendente, a leitura autoritativa da categoria persistida, a criação, reativação ou reutilização do mapeamento, a auditoria correspondente e a criação da atividade rodam na mesma transação MySQL; qualquer falha desfaz toda a solicitação. O domínio fica desacoplado de Prisma: a rota recebe uma **unidade de trabalho** (`UnidadeTrabalhoClassificacao`) que entrega portas de classificação e de mapeamento ligadas ao mesmo cliente transacional, sem transações aninhadas e sem operação decisiva no `prisma` global dentro do escopo. Dentro da transação, a garantia de mapeamento usa leitura bloqueante (`SELECT ... FOR UPDATE` por categoria) para consultar o estado atual e preservar o mapeamento ativo vencedor; mapeamento ativo é reutilizado sem auditoria, inativo é reativado com o setor escolhido (auditado como `UPDATE`), categoria nova cria o mapeamento (auditado como `CREATE`) e item sem categoria não cria mapeamento. Conflitos transatórios identificados — deadlock/conflito de escrita (`P2034`) e categoria nova disputada (`P2002` na chave única de `legacyCategory`) — repetem a **unidade completa** até um limite pequeno (máximo duas tentativas extras); `409`/`404`/`400` e demais erros propagam sem repetição. O fluxo automático (`classificarPorMapeamento`) e o comportamento administrativo de `/api/mapeamentos` não mudam. Nenhuma migração. Falhas controladas existem apenas no ambiente de teste de integração, não em produção.
- **Reason**: Após os merges de V05 (#17) e V02 (#19), `garantirMapeamento` e sua auditoria rodavam fora da transação que classifica o item: uma falha posterior (inclusive o conflito `409` do árbitro) deixava mapeamento criado ou reativado por uma operação que não se efetivou.
- **Trade-off**: A transação fica mais larga (item + mapeamento + auditoria + atividade) e cada chamada abre transação interativa própria. Corridas de criação da mesma categoria nova podem gerar deadlock/`P2002`, resolvidos pela repetição da unidade (comprovado em integração). A leitura bloqueante serializa os concorrentes da mesma categoria (espera na linha), protegendo a política de permanência do mapeamento ativo vencedor. Nenhum campo novo; nenhum contrato HTTP alterado (`200`, `400`, `404`, `409` preservados).
- **Scope**: `classificar-item.ts`, adapters Prisma de classificação/mapeamento, nova unidade transacional Prisma, rota `POST /api/pedidos/itens/[itemId]/classificar`, testes de domínio/adapter/integração e documentação. Permissões (`classificar_item`), autoria da sessão, importação automática, `/api/mapeamentos`, interface, saldos e prazos preservados. Sem migração, sem deploy nesta etapa.
- **Date**: 2026-10-29
- **Status**: active (implementada e validada localmente: integração MySQL V06 9/9 e regressões 31/31 no banco `v06_integration`; 1114 testes na suíte padrão, lint 0 erros, typecheck/build OK; PR aberto, sem merge).

## Handoff — V06 atomicidade entre mapeamento, auditoria e classificação (2026-10-29)

- **Feature**: V06 — unidade transacional da classificação manual (AD-026).
- **Phase / Task**: implementação, testes e gates locais concluídos; PR aberto contra `main` (sem merge).
- **Completed**:
  - `classificar-item.ts`: portas `ClassificacaoEmTransacao` e `UnidadeTrabalhoClassificacao`; `classificarItem` executa a unidade completa (transição → categoria autoritativa → setor → mapeamento/auditoria → atividade).
  - `prisma-classificacao-repository.ts`: helpers de escopo (`transicionarPendenteNoEscopo`, `criarAtividadeNoEscopo`) reutilizados pelo `markClassified` global (fluxo automático preservado) e pela implementação transacional; tradução do `P2002` da atividade única mantida.
  - `prisma-setores-repository.ts`: `criarMapeamentoEmTransacao(tx)` reutiliza `garantirMapeamento`/`criarMapeamento` com auditoria na mesma transação e `findByCategory` bloqueante (`FOR UPDATE`) no cliente transacional; repositório global de `/api/mapeamentos` inalterado.
  - `prisma-unidade-trabalho-classificacao.ts` (novo): abre a transação interativa, entrega os dois repositórios ligados ao `tx` e repete a unidade completa nos conflitos transatórios (`P2034`; `P2002` de `legacyCategory`), limite de 3 tentativas.
  - Rota de classificação com `401/403/400/404/409/200` preservados (AUTH-14); categoria do item persistido e autor da sessão (V05) intactos.
  - Testes: 8 de adapter (política de retry), 9 de integração V06 (cenários 1–9; o cenário 10 é o conjunto de regressões V02/V05 executado em integração) e suíte padrão com **1114** testes aprovados + 40 gated ignorados.
- **In-progress**: nenhum.
- **Next step**: revisão e merge do PR da branch `fix/v06-classificacao-mapeamento-transacional` (número/link registrados no encerramento da sessão); acompanhar CI `verify`.
- **Blockers**: nenhum para o PR. O banco de integração é exclusivo de V06 (`v06_integration`) no container temporário `3e-review-mysql` (127.0.0.1:33306) — não é o banco da aplicação.
- **Files changed**: `src/modules/setores/classificar-item.ts` (+ `classificar-item.test.ts`), `src/modules/setores/adapters/prisma-classificacao-repository.ts`, `prisma-setores-repository.ts`, `prisma-unidade-trabalho-classificacao.ts` (+ teste), `classificacao-transacional.integration.test.ts` (novo), `classificacao.integration.test.ts` (ajuste do chamado manual), `src/app/api/pedidos/itens/[itemId]/classificar/route.ts` (+ `route.test.ts`), `.specs/features/setores-e-classificacao/{spec,design,tasks}.md` e este arquivo.
- **Branch**: `fix/v06-classificacao-mapeamento-transacional` (base `origin/main` @ `a72c79c`, que contém V05 #17 e V02 #19, incluindo o `c192751` confirmado).

## Handoff — correções de UI, vídeo e deploy (2026-10-27)

- **Feature**: correções pedidas pelo professor/Saul (AD-023), demonstração completa legendada e capítulo de banco.
- **Phase / Task**: concluída; código, documentação e vídeo publicados em `main`.
- **Completed**:
  - Correções de UI: vírgula/decimais, previsão em todas as telas, histórico de prazos, remessa automática, Vendedor sem remessas, explicações de mapeamento e de inativação.
  - `fix` posterior ao `ce4fbd5`: o histórico recarrega **a cada abertura** (`historico-prazos.tsx`), mostrando alteração feita depois da primeira consulta.
  - Vídeo `docs/video/demo-completa-2026-10-27.mp4` (8m43s, legendas queimadas): fluxo do app, alteração/restauração de prazo no pedido 82249 e capítulo de banco (DBeaver + consultas reais). Transcrição em `docs/video/demo-completa-2026-10-27-transcricao.json`.
  - Scripts de reprodução: `scripts/gravar-demo-completa-2026-10-27.mjs`, `scripts/gravar-demo-prazo.mjs`, `scripts/gerar-capitulo-banco.mjs`, `scripts/gravar-capitulo-banco.mjs`.
  - Gates: **1037 testes** verdes + 24 ignorados; lint 0 erros (7 avisos); typecheck e build OK.
  - Publicação: commits `6205dc3` (fix), `c0ec7e5` (scripts), `fd1f2e4` (vídeo) e `365f143` (docs/evidências); deploy Railway validado com `/api/health` 200, `/login` 200 e Playwright **15/15** contra a produção.
  - Auditoria de prazos em produção: 4 linhas de `DEADLINE_CHANGED` no item 1 do pedido 82249 (duas gravações da demonstração); o vídeo mostra as duas primeiras e o valor atual é 06/12/2026.
- **In-progress**: nenhum.
- **Next step**: aceite do convite de colaborador da Vanusa no GitHub; migração do banco (AD-024) após aprovação; eventual regravação com escrita em banco de teste dedicado.
- **Blockers**: convite da Vanusa pendente de aceite; reestruturação do banco depende de decisões (AD-024); testes de integração MySQL continuam gated.
- **Files changed**: `src/shared/ui/historico-prazos.tsx`, `docs/video/*`, `scripts/{gravar-demo-completa-2026-10-27,gravar-demo-prazo,gerar-capitulo-banco,gravar-capitulo-banco}.mjs`, `docs/{validacao-hospedada,testes-locais}.md`, `.gitignore` e este arquivo.
- **Branch**: `main`.

## Handoff — integração dos PRs #14 e #15 (2026-10-27)

- **Feature**: correções do Gerente (PR #15) e do Vendedor/importação (PR #14).
- **Phase / Task**: integração concluída na branch `integracao-prs-14-15`; gates locais aprovados; deploy pendente.
- **Completed**:
  - Merge do #15 sem conflitos; merge do #14 com conflitos apenas em `STATE.md`, `docs/testes-locais.md` e `docs/validacao-hospedada.md` (resolvidos mantendo as duas seções).
  - Código auto-mergeado em `pedido-detalhe.tsx` e `pedidos-lista.tsx`; validação confirmou que o link “Voltar” usa `<a>` e os itens recolhíveis continuam funcionando.
  - 1037 testes verdes (+14), lint 0 erros, typecheck e build OK.
  - Navegador: 15/15 (filtros/retorno Vendedor e Gerente, painel/Atualizar, itens recolhíveis, rótulos, importação sem envio, sem erros de console/hidratação).
  - Regressões: 11/11 responsivo/impressão e 9/9 Operador.
  - Deploy Railway e validação hospedada: 15/15 + 11/11 + 9/9; `/api/health` e `/login` 200.
- **In-progress**: nenhum.
- **Next step**: manter os PRs #14/#15 fechados (já constam como merged) e planejar o go-live (conector real + banco dedicado).
- **Blockers**: testes de integração MySQL continuam gated; conector Top Gerente real e go-live seguem pendentes.
- **Files changed**: `src/app/(app)/gerente/painel`, `src/app/(app)/gerente/pedidos`, `src/app/(app)/vendedor/pedidos`, `src/shared/ui/{pedido-detalhe,pedidos-lista,importar-pedido,navegacao-perfil}`, `src/modules/integracao/{solicitar-importacao,transparencia-importacao}`, testes, `scripts/validar-prs-14-15.mjs`, docs e este arquivo.
- **Branch**: `integracao-prs-14-15` → `main`.

## Handoff — perfil Operador e ocorrências (AD-021)

- **Feature**: separação das telas do Operador, feedback de ações e visibilidade das ocorrências pelo Gerente.
- **Phase / Task**: implementação e validação local concluídas; commit/push/deploy e validação hospedada em andamento.
- **Completed**:
  - `/operador/fila` virou **Meus pedidos** (cards, status, botão “Abrir atividade”).
  - `/operador/ocorrencias` (nova): registrar com atividade pré-selecionada e consultar as próprias ocorrências.
  - `/operador/atividades/[id]`: execução + link para ocorrência; formulário saiu da tela de execução.
  - Menu do Operador: **Pedidos** e **Ocorrências**; ícone próprio.
  - Painel do Gerente: card **Ocorrências recentes** (total, 7 dias, por tipo, pedido/item/setor/responsável/motivo/data).
  - APIs: `GET /api/producao/ocorrencias` (próprias, `registrar_ocorrencia`) e `GET /api/indicadores/ocorrencias` (todas, `consultar_pedidos`).
  - Pool do banco configurável (`DB_CONNECTION_LIMIT`, `DB_ACQUIRE_TIMEOUT_MS`), eliminando o `pool timeout` observado no RDS.
  - Testes: 1023 aprovados (+24 ignorados), Playwright 9/9, lint/typecheck/build OK.
- **In-progress**: commit, push e deploy; validação hospedada com `scripts/validar-operador.mjs`.
- **Next step**: validar `PLAYWRIGHT_BASE_URL=https://3e-operacoes-production.up.railway.app node scripts/validar-operador.mjs` e, se aprovado, gravar a demonstração do Operador.
- **Blockers**: situação de análise/resolução de ocorrência depende de decisão de negócio; idempotência de ocorrência e notificação ativa ao gerente fora do escopo.
- **Files changed**: `src/app/(app)/operador/{fila,ocorrencias,atividades/[id]}`, `src/app/(app)/gerente/painel/page.tsx`, `src/shared/ui/{navegacao-perfil,app-shell}`, `src/modules/ocorrencias/{painel-ocorrencias,adapters/prisma-ocorrencias-repository}`, `src/app/api/producao/ocorrencias`, `src/app/api/indicadores/ocorrencias`, `src/shared/db/prisma.ts`, `scripts/validar-operador.mjs`, testes e documentos (`docs/diagnostico-operador.md`, `docs/testes-locais.md`, `docs/avaliacao-heuristicas.md`, `docs/README.md`, este arquivo).
- **Branch**: main

## Handoff — revisão integrada pós-merges (2026-10-25)

- **Feature**: revisão do perfil Vendedor e das correções dos PRs #5–#13 após os merges
- **Phase / Task**: correções aplicadas e validadas localmente; PR #14 aberto para revisão
- **Completed**:
  - Reaplicação do #13 sobre a UI de transparência do #8: limite técnico de 60s, pausa do polling, consulta manual do mesmo job e falha de consulta separada de falha da importação.
  - Recuperação das mensagens de erro do #5: o código técnico continua visível, mas a orientação traduzida (`mensagens-importacao`) voltou a ser usada.
  - Auditoria do #11 corrigida para job ativo antigo: `REUSED_JOB`/`newDispatch: false`, pois não há novo despacho.
  - Retorno do detalhe do Gerente passou a preservar filtros e página, como no Vendedor (componente compartilhado do #7).
  - Validação local em 2026-10-25: MySQL isolado com migrations/seed, 24 testes de integração reais, API de importação com job ativo antigo e retry, e 15 cenários de navegador (Vendedor/Gerente, importação, espera prolongada, falhas e retorno).
  - Defeitos encontrados e corrigidos na validação: perda de página/filtros na hidratação de link direto, divergência de hidratação e perda de filtros no retorno client-side do detalhe.
  - Preservados: transparência de reimportação e unidade do #8, quantidades/vocabulário do #9, proteção de remessas do #10, rótulo do período do #12, filtros AD-014/AD-018/AD-019 e paginação A1.
- **In-progress**: nenhum
- **Next step**: revisar/mergear o PR #14; manter pendente a validação com o conector Top Gerente real e em produção.
- **Blockers**: conector Top Gerente real e ambiente de produção; decisões pendentes AD-010, AD-012/T00.4, AD-013, AD-016/D6 e AD-017/D7.
- **Branch**: fix/vendedor-integracao-pos-merge
- **PR**: #14

## Handoff — auditoria da solicitação de importação (AD-015)

- **Feature**: rastreabilidade do usuário autenticado que solicita importação de pedido
- **Phase / Task**: implementação concluída e validada localmente; aguardando validação transacional no MySQL de teste e revisão
- **Completed**:
  - `POST /api/integracao/pedidos` obtém o usuário exclusivamente da sessão (`auth.usuario.userId`); `userId`/`actorId` enviados no corpo são ignorados.
  - O caso de uso exige `requestedByUserId`; autoria vazia é rejeitada, sem criar job nem auditoria.
  - Job e `AuditLog` são gravados na mesma transação (`criarComAuditoria`); o despacho só é agendado depois que a transação retorna.
  - Reutilização dentro da janela grava `REUSED_JOB` com `newDispatch: false`; criação/novo despacho grava `NEW_ATTEMPT` com `newDispatch: true`.
  - A auditoria `IMPORT_REQUESTED` registra usuário, job, número do pedido, chave de idempotência e momento, sem tokens, sessão ou payload. É append-only e não sobrescreve autoria anterior.
  - A rota explícita `/reprocessar` e o retry automático não foram alterados; o PR #5 (aberto) mexe nesse fluxo e não foi incorporado.
- **In-progress**: nenhum
- **Next step**: executar teste transacional no MySQL de teste (criação conjunta e rollback real) e confirmar a granularidade de auditoria para repetições do mesmo usuário.
- **Blockers**: sem `.env`/credenciais de MySQL neste ambiente; PRs #5 e #8 abertos tocam os mesmos arquivos e exigirão resolução de conflito; granularidade de solicitações repetidas pendente de decisão.
- **Files changed**: `src/app/api/integracao/pedidos/route.ts`, `route.test.ts`, `src/modules/integracao/solicitar-importacao.ts`, `solicitar-importacao.test.ts`, `src/modules/integracao/adapters/prisma-integracao-repository.ts`, `prisma-integracao-repository.test.ts`, `docs/requisitos.md`, `docs/banco-de-dados.md`, `docs/perfis-permissoes.md`, `docs/integracao-top-gerente.md` e este arquivo.
- **PR**: #11 (Draft), separado dos anteriores; sem merge.
- **Branch**: fix/vendedor-auditoria-solicitacao-importacao

## Handoff AD-009 (prazos)

- **Feature**: persistência, exibição e acompanhamento dos prazos (AD-009, correção do perfil Vendedor)
- **Phase / Task**: implementação concluída e validada localmente; aguardando validação no navegador e autorização de commit
- **Completed**:
  - Causa: o prazo era gravado em `pedidos_itens.deadlineAt`, mas `GET /api/pedidos/[orderId]` não devolvia o campo e `PedidoDetalhe` usava apenas estado local (`salvos`). Após F5, o badge e o input ficavam vazios.
  - Correção: `deadlineAt` e `activityDeadlineAt` no detalhe; input e badge hidratados da API; “Sem prazo”; prazo do setor somente leitura; `400` para data inválida/ambígua.
  - Semântica: `YYYY-MM-DD` estrito convertido para o fim do dia em `America/Sao_Paulo` (`fimDoDiaNoFuso`); prazo de hoje não é atrasado; prazo de ontem é.
  - Preservados: independência entre níveis, permissões (`consultar_pedidos`/`definir_prazo`), status, conclusão, entregas, remessas, filtros AD-014/AD-018/AD-019/A1 e conector.
  - Sem migração, sem script de conversão, sem alteração de banco/CI.
  - Testes: 866 automatizados + 23 de integração com MySQL de teste (17 de consulta + 6 de prazos); lint e typecheck sem erros; build OK.
- **In-progress**: nenhum
- **Next step**: executar o roteiro manual de `docs/testes-locais.md` §7 com Vendedor e Gerente (salvar, F5, novo login, hoje, vencido, independência). Depois, autorização para o commit.
- **Blockers**: validação no navegador pendente; prazos antigos em meia-noite UTC não verificados no banco real (D6); alerta comercial e sinalização de atraso do item (critério de conclusão, AD-011); auditoria de prazo (RFN006); remoção de prazo; edição do prazo operacional; data do ERP.
- **Uncommitted files**: `src/shared/time/dia-do-periodo.ts`, `src/shared/time/dia-civil.ts`, `src/modules/prazos/prazo.ts`, `src/modules/indicadores/consulta-pedidos.ts`, `src/modules/indicadores/adapters/prisma-indicadores-repository.ts`, `src/shared/ui/pedido-detalhe.tsx`, testes correspondentes, `src/modules/prazos/adapters/prazos.integration.test.ts`, documentos (`docs/decisoes.md`, `docs/requisitos.md`, `docs/regras-negocio.md`, `docs/banco-de-dados.md`, `docs/perfis-permissoes.md`, `docs/testes-locais.md`, `docs/backlog.md`, `docs/modelo-dados/mer.md`) e `.specs` (`features/prazos-e-alertas/*`, este arquivo). Nenhum commit foi feito.
- **Branch**: fix/fluxos-vendedor1-preparação-decisões-negócio

## Handoff

- **Feature**: paginação e otimização da consulta de pedidos (AD-020, correção A1)
- **Phase / Task**: implementação concluída e validada localmente; aguardando validação no navegador e autorização para a próxima correção
- **Completed**:
  - Problema: o limite padrão de 20 era aplicado com `slice` depois de carregar todos os pedidos, itens e atividades; a interface não enviava `limite`/`offset` e não havia navegação por páginas nem total real.
  - Correção: filtros, ordenação e paginação no MySQL via Prisma; `paginacao` na resposta; `count` e página na mesma transação; status derivado traduzido para SQL preservando os critérios atuais; `%`/`_` literais; navegação Anterior/Próxima, página na URL, reset para a primeira página ao filtrar/limpar/importar.
  - Preservados: AD-014 (datas em `America/Sao_Paulo`, fim exclusivo), AD-018 (setor por código, status global), AD-019 (pesquisa parcial por `legacyNumber`) e permissões de Vendedor/Gerente.
  - Sem alteração de banco, migração, índice, CI ou regras de negócio.
  - Testes: 832 testes unitários, de rota e de componente aprovados; 17 testes de integração com MySQL local aprovados separadamente; 1 arquivo de integração ignorado na suíte padrão (`npm test`), conforme D8. `tsc`, lint e build executados (ver validação).
- **In-progress**: nenhum
- **Next step**: executar o roteiro manual de `docs/testes-locais.md` §6 (Vendedor e Gerente): primeira página, navegação, retorno, última página, pesquisa por número, filtros combinados, preservação/reset de filtros, retorno do detalhe e total. Avaliar `EXPLAIN` com volume real; propor índice em `(createdAt, id)` somente se justificado e autorizado. Aguardar autorização antes de iniciar outra correção.
- **Blockers**: validação no navegador pendente; índice/`EXPLAIN` não avaliado com volume real; Expedição continua limitada à primeira página (fora do escopo da A1); aprovação do contrato do conector e de eventual campo em `OrderItem` (AD-010); T00.4 (AD-012); decisões D6 (AD-016) e D7 (AD-017); validação da data original do pedido no ambiente de integração
- **Uncommitted files**: `src/modules/indicadores/consulta-pedidos.ts`, `src/modules/indicadores/consulta-pedidos.test.ts`, `src/modules/indicadores/adapters/filtros-pedidos-prisma.ts`, `src/modules/indicadores/adapters/filtros-pedidos-prisma.test.ts`, `src/modules/indicadores/adapters/prisma-indicadores-repository.ts`, `src/modules/indicadores/adapters/consulta-pedidos.integration.test.ts`, `src/app/api/pedidos/route.ts`, `src/app/api/pedidos/route.test.ts`, `src/app/api/pedidos/[orderId]/route.test.ts`, `src/app/api/indicadores/route.test.ts`, `src/shared/ui/pedidos-lista.tsx`, `src/shared/ui/pedidos-lista.test.tsx`, `docs/requisitos.md`, `docs/testes-locais.md`, `docs/diagnostico-docentes.md`, `.specs/features/indicadores-e-consulta/spec.md`, `.specs/features/indicadores-e-consulta/design.md`, `.specs/features/indicadores-e-consulta/validation.md` e `.specs/STATE.md`. Nenhum commit foi feito pelo agente.
- **Branch**: fix/fluxos-vendedor1-preparação-decisões-negócio

## Handoff anterior (AD-019, pesquisa por número)

- **Feature**: pesquisa por número do pedido (AD-019, correção A6 do perfil Vendedor)
- **Phase / Task**: implementação concluída e aprovada provisoriamente; decisões confirmadas em 2026-10-22; aguardando registro do commit pelo responsável e autorização para a próxima correção
- **Completed**:
  - Problema: a lista de pedidos permitia filtrar por cliente, setor, status e período, mas não pelo número comercial, apesar de RF008 prever pesquisa por número.
  - Causa: `GET /api/pedidos` e `PedidosLista` não tinham o parâmetro/campo `numero`; o domínio também não filtrava por `PedidoConsultado.numero` (`Order.legacyNumber`).
  - Correção: filtro parcial (contém) em `legacyNumber`, com `trim`; campo "Pesquisar por número" na lista; restauração pela URL; combinação com os demais filtros; filtro aplicado no servidor antes do limite de 20.
  - Sem alteração de banco, migração, status, saldos, conclusão, permissões ou paginação.
  - Testes: 839 testes automatizados aprovados (suíte completa), `tsc` sem erros e lint sem erros nos arquivos alterados.
  - Decisões confirmadas: manter a pesquisa parcial; preservar a combinação com os demais filtros; manter as permissões existentes; não alterar `Order.id`.
- **In-progress**: nenhum
- **Next step**: aguardar o registro do commit pelo responsável. Após autorização, tratar a **A1 — Paginação**, incluindo a otimização das consultas para evitar carregar todos os pedidos em memória quando houver alternativa viável.
- **Blockers**: validação no navegador dos filtros pendente; teste de integração com MySQL da consulta de pedidos não existe; otimização das consultas pendente na A1; aprovação do contrato do conector e de eventual campo em `OrderItem` (AD-010); T00.4 (AD-012); decisões D6 (AD-016) e D7 (AD-017); validação da data original do pedido no ambiente de integração
- **Uncommitted files**: `src/modules/indicadores/consulta-pedidos.ts`, `src/modules/indicadores/consulta-pedidos.test.ts`, `src/app/api/pedidos/route.ts`, `src/app/api/pedidos/route.test.ts`, `src/shared/ui/pedidos-lista.tsx`, `src/shared/ui/pedidos-lista.test.tsx`, `docs/requisitos.md`, `.specs/features/indicadores-e-consulta/spec.md` e `.specs/STATE.md`. Nenhum commit foi feito pelo agente.
- **Branch**: fix/fluxos-vendedor1-preparação-decisões-negócio

## Handoff anterior (AD-018, filtro por setor)

- **Feature**: filtro por setor de pedidos (AD-018, correção A2 do perfil Vendedor)
- **Phase / Task**: implementação concluída e aprovada provisoriamente; documentação atualizada; aguardando autorização para a próxima correção
- **Completed**:
  - Problema: o filtro "Setor" era texto livre comparado ao id interno do setor; "Telhas" retornava lista vazia.
  - Correção: filtro por código do setor (`SectorCode`), seleção fixa na interface, validação na API (`400 invalid_filters` para código inválido) e consulta comparando `sector.code`. Novo módulo `src/modules/setores/codigos-setor.ts`.
  - Status do pedido preservado como global (todos os itens); regras de status inalteradas.
  - Testes: 815 testes automatizados aprovados (suíte completa), `tsc` sem erros e lint sem erros nos arquivos alterados.
- **In-progress**: nenhum
- **Next step**: após autorização, próxima correção da Etapa 1: prazo na tela e alerta de atividade (AD-009). Antes de fechar a AD-014 e a AD-018, validar no navegador (Vendedor e Gerente) os filtros de data e de setor.
- **Blockers**: validação no navegador dos filtros de data e de setor pendente; teste de integração com MySQL da consulta de pedidos não existe; aprovação do contrato do conector e de eventual campo em `OrderItem` (AD-010); T00.4 (AD-012); decisões D6 (AD-016) e D7 (AD-017); validação da data original do pedido no ambiente de integração
- **Uncommitted files**: alterações da AD-014 e da AD-018 em código (`src/app/api/pedidos/route.ts`, `route.test.ts`, `src/modules/indicadores/consulta-pedidos.ts`, `consulta-pedidos.test.ts`, `src/modules/indicadores/adapters/prisma-indicadores-repository.ts`, `src/shared/ui/pedidos-lista.tsx`, `pedidos-lista.test.tsx`, `src/modules/setores/codigos-setor.ts`, `codigos-setor.test.ts`, `src/shared/time/dia-do-periodo.ts`, `dia-do-periodo.test.ts`) e a documentação `docs/requisitos.md` e `.specs/STATE.md`. Nenhum commit foi feito.
- **Branch**: fix/fluxos-vendedor1-preparação-decisões-negócio

## Handoff anterior (AD-014, filtro de data de pedidos)

- **Feature**: filtro de data de pedidos (AD-014), primeira correção da Etapa 1
- **Phase / Task**: implementação concluída e aprovada provisoriamente; aguardando autorização para a próxima correção
- **Completed**:
  - Filtro de período de `GET /api/pedidos` interpreta `de`/`ate` como dias civis em `America/Sao_Paulo`, com horário de verão tratado pelo helper `src/shared/time/dia-do-periodo.ts`.
  - Intervalo `[de, ate)`: `de` inclusivo no início do dia; `ate` exclusivo, no início do dia seguinte.
  - Referência do filtro mantida em `createdAt`; permissões e demais filtros inalterados.
  - Testes: 796 testes aprovados (suíte completa), typecheck e lint sem erros nos arquivos alterados.
  - Commit documental de referência: `2962b07`.
- **In-progress**: nenhum
- **Next step**: após autorização, próxima correção da Etapa 1: prazo na tela e alerta de atividade (AD-009). Validar o filtro de data no navegador antes de fechar a AD-014.
- **Blockers**: validação no navegador do filtro de data pendente; aprovação do contrato do conector e de eventual campo em `OrderItem` (AD-010); T00.4 (AD-012); decisões D6 (AD-016) e D7 (AD-017); validação da data original do pedido no ambiente de integração.
- **Uncommitted files**: alterações da AD-014 (`src/app/api/pedidos/route.ts`, `src/app/api/pedidos/route.test.ts`, `src/modules/indicadores/consulta-pedidos.ts`, `src/modules/indicadores/consulta-pedidos.test.ts`, `src/shared/time/dia-do-periodo.ts`, `src/shared/time/dia-do-periodo.test.ts`) e este `.specs/STATE.md`. Nenhum commit foi feito.
- **Branch**: fix/fluxos-vendedor1-preparação-decisões-negócio (o registro anterior de `main` estava incorreto)

## Handoff anterior (2026-10-22, planejamento Vendedor)

- **Feature**: planejamento das correções do perfil Vendedor (X2 executado; D2 e demais implementações pendentes)
- **Phase / Task**: documentação atualizada; aguardando autorização para o modo Build
- **Completed**: `docs/requisitos.md`, `docs/banco-de-dados.md`, `docs/perfis-permissoes.md` e `.specs/STATE.md` atualizados com decisões aprovadas e pendentes (AD-009 a AD-017)
- **In-progress**: nenhum
- **Next step**: após autorização do Build, executar as correções técnicas independentes na ordem: filtro de data (AD-014), prazo na tela e alerta de atividade (AD-009), correção mínima do status (AD-013), auditoria de prazo e de solicitação de importação (AD-015). Depois: cancelamento lógico (AD-010), com contrato aprovado; Revenda (AD-012); estados completos (AD-013).
- **Blockers**: aprovação do contrato do conector e de eventual campo em `OrderItem` (AD-010); T00.4 (AD-012); decisões D6 (AD-016) e D7 (AD-017); validação da data original do pedido no ambiente de integração
- **Uncommitted files**: os quatro documentos listados acima
- **Branch**: main

## Handoff anterior (2026-10-21)

- **Feature**: correção de setor (AD-006/AD-007) + totais por unidade (AD-008)
- **Phase / Task**: concluído; próximo: deploy e validação hospedada das duas correções
- **Completed**: PRs #2 e #3 do Marcelo revisados e mergeados; 785 testes, lint/typecheck/build OK; conflitos resolvidos (totais renumerado para AD-008)
- **In-progress** (file:line): nenhum
- **Next step**: deploy no Railway e smoke test das telas afetadas (detalhe/painel/entregas)
- **Blockers**: nenhum para desenvolvimento; integração real depende do conector na rede da 3E
- **Uncommitted files**: (atualizado no commit)
- **Branch**: main
