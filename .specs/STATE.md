# STATE - 3E Operações

## Estado atual

Projeto em bootstrap. A estrutura inicial, documentação, skills locais e subagentes foram preparados. Ainda não há implementação funcional da integração com o Top Gerente nem telas finais.

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

## Pontos ainda a validar com dados reais

- Tabelas e joins exatos do Top Gerente para pedido, itens, categoria, cliente e vendedor.
- Lista oficial de categorias e seu mapeamento operacional para os três setores.
- Lista fechada real de motivos de perda, refugo e indisponibilidade.
- Regra de Revenda para o significado final de “indisponível” no saldo pendente.

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

## Handoff

- **Feature**: correção de setor (AD-006/AD-007) + totais por unidade (AD-008)
- **Phase / Task**: concluído; próximo: deploy e validação hospedada das duas correções
- **Completed**: PRs #2 e #3 do Marcelo revisados e mergeados; 785 testes, lint/typecheck/build OK; conflitos resolvidos (totais renumerado para AD-008)
- **In-progress** (file:line): nenhum
- **Next step**: deploy no Railway e smoke test das telas afetadas (detalhe/painel/entregas)
- **Blockers**: nenhum para desenvolvimento; integração real depende do conector na rede da 3E
- **Uncommitted files**: (atualizado no commit)
- **Branch**: main
