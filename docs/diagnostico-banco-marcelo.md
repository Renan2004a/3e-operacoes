# Diagnóstico técnico — adaptação do 3E Operações ao banco `3e_ferro_aco_operacoes`

**Data**: 31/10/2026
**Escopo**: análise de viabilidade e plano de adaptação. **Nenhum arquivo da aplicação, schema, migration, configuração, conexão ou banco foi alterado nesta etapa.**
**Fonte analisada**: `banco_novo_marcelo/01_banco_3e_mysql.sql` (1.598 linhas), `banco_novo_marcelo/3e_ferro_aco_operacoes_tabelas.png`, `prisma/schema.prisma`, `prisma/migrations/`, código em `src/modules/` e `src/app/`, conector em `connector-local/` e documentos de domínio.
**Observação**: o script novo **não foi executado**. Ele é um script de instalação limpa (`CREATE DATABASE 3e_ferro_aco_operacoes`), não uma migração do banco atual.

---

## 1. Resumo executivo

**É possível adaptar a aplicação atual ao novo banco sem reconstruir o sistema**, mas a adaptação **não é trivial**. A conclusão é de **viabilidade média**: não há incompatibilidade estrutural que inviabilize o modelo, porém existem mudanças relevantes de identidade (CUID → BIGINT), de modelagem (a tabela `atividades` deixa de existir), de regras de validação (ocorrências e remessas ficam mais restritas), de contrato de integração (vendedor por item) e de migração de dados históricos.

O ponto mais favorável é arquitetural: a aplicação já separa domínio de persistência em **portas e adaptadores**. Praticamente todo o acesso ao banco está em `src/modules/*/adapters/`; há apenas **1 rota** que importa o Prisma diretamente e **5 consultas SQL cruas** no código de produção. Isso permite trocar o banco por baixo dos casos de uso, preservando telas, rotas e regras.

O ponto mais desfavorável é o modelo novo **remover a entidade `atividade`** e **derivar status em views**. Hoje a `atividade` é o eixo de várias telas, APIs, permissões, prazos, ocorrências, fila, painel e impressão. A adaptação exige uma camada de tradução que trate o **item** como a “atividade” (1:1), sem alterar os contratos externos.

**Recomendação**: manter a aplicação atual e adaptá-la (Alternativa A), mas executar em etapas com validação paralela (Alternativa C). Antes de qualquer implementação, o modelo novo precisa de uma **revisão pontual** (itens da seção 6), pois há regras do novo banco que **rejeitariam operações que hoje funcionam**.

| Dimensão | Resultado |
| --- | --- |
| Cobertura de entidades | O novo banco cobre todas as entidades operacionais atuais e acrescenta `produto`, `unidade_medida`, `divergencia` e anulação de entrega/apontamento. |
| Preservação de telas e APIs | Alta, se a camada de adaptação mantiver os DTOs atuais (IDs como string, status derivados). |
| Preservação de regras | Média. Ocorrências, remessas e classificação precisam de decisão para não perder comportamento. |
| Migração de dados | Média/alta complexidade. Há campos obrigatórios sem origem no banco atual. |
| Risco geral | **Médio**, concentrado em ETL, IDs e regras mais restritivas. |
| Viabilidade | **Média**. |

---

## 2. Diagnóstico da arquitetura atual

### 2.1 Stack e organização

- **Next.js 16.4.3 (App Router) + TypeScript**, frontend e API no mesmo projeto.
- **MySQL** como banco próprio, acessado por **Prisma** com adapter `@prisma/adapter-mariadb` (`src/shared/db/prisma.ts`).
- **Domínio isolado** em `src/modules/`: `auth`, `pedidos`, `producao`, `expedicao`, `ocorrencias`, `setores`, `usuarios`, `prazos`, `indicadores`, `integracao`.
- Cada módulo tem casos de uso puros e **adaptadores Prisma** (`src/modules/*/adapters/`). As rotas em `src/app/api/` orquestram casos de uso.
- **35 rotas de API**, **18 páginas** e **135 arquivos de teste** (1.185 testes verdes + 47 ignorados).
- **Integração** com o Top Gerente por job assíncrono + conector local (`connector-local/`), sem polling.

### 2.2 Banco atual (17 tabelas de aplicação)

Confirmado no banco de demonstração (`3e_operacoes_demo`) via `information_schema`:

| Tabela atual | Finalidade real | Onde é usada |
| --- | --- | --- |
| `usuarios` | Identidade, senha (`passwordHash`), situação (`ACTIVE/INACTIVE`) | Login, sessão, autorização, administração |
| `usuarios_perfis` | N:N usuário × `RoleCode` | Permissões, menus, APIs |
| `usuarios_setores` | N:N usuário × setor | Fila do Operador, escopo de execução/ocorrência |
| `setores` | Cadastro de setores (`SectorCode`) | Classificação, fila, painel, filtros |
| `mapeamentos_categoria_setor` | Categoria do legado → setor (única por categoria) | Classificação automática, tela de setores |
| `regras_produto_setor` | Sugestão por código/descrição (`CONTAINS`/`PREFIX`) | Sugestão de setor no detalhe do pedido |
| `pedidos` | Cabeçalho importado (`legacyOrderKey`, `legacyNumber`, cliente, vendedor) | Lista, detalhe, filtros, jobs |
| `pedidos_itens` | Item comercial + `classificationStatus`, `deadlineAt` | Todo o fluxo operacional |
| `atividades` | Item × setor; status, prioridade, prazo operacional | Fila, execução, ocorrência, painel, impressão |
| `execucoes` | Quantidade executada, usuário, data/hora | Saldo, status, indicadores |
| `ocorrencias` | Perda, refugo, indisponibilidade, pausa, parada, defeito | Operador, painel do Gerente |
| `motivos_ocorrencia` | Catálogo por tipo | Formulário de ocorrência |
| `entregas` | Entrega realizada, exceção, autorizador, disponível antes | Expedição, histórico, saldo |
| `remessas_programadas` | Previsão de entrega por item, número, confirmação | Detalhe do pedido, Expedição |
| `jobs_integracao` | Job de importação, status, tentativas, erro | Técnico, importação |
| `eventos_job_integracao` | Trilha do job (texto) | Tela do Técnico |
| `logs_auditoria` | Auditoria polimórfica (`action`, `entityType`, `entityId`, JSON) | Histórico de prazos, correções, exceções |

**Relações principais** (FKs reais): `pedidos 1─N pedidos_itens 1─N atividades 1─N execucoes/ocorrencias`; `pedidos_itens 1─N entregas/remessas_programadas`; `usuarios N─N setores/perfis`; `setores 1─N mapeamentos/regras/atividades`.

**Exclusão**: o banco atual usa `ON DELETE CASCADE` em itens, atividades, execuções, ocorrências, entregas, remessas e vínculos N:N. Na prática, a aplicação **não exclui** pedidos/itens/atividades; a única exclusão física é a remoção de remessa (`prisma.scheduledDelivery.delete`).

### 2.3 Regras de negócio implementadas no código

As regras vivem nos casos de uso e **não no banco**:

- **Status do pedido** é derivado em `src/modules/indicadores/consulta-pedidos.ts` (`statusDoPedido`, `situacaoDoItem`): `PENDING` se todos os itens estão sem atividade ou com atividades `PENDING`; `COMPLETED` se todos os itens estão classificados e com atividades `COMPLETED`; caso contrário `IN_PROGRESS`.
- **Status da atividade** é gravado em `atividades.status` por `resolverStatusExecucao` (`PENDING → IN_PROGRESS → COMPLETED/DIVERGENT`). `PAUSED` existe no enum, mas **não é escrito por nenhum fluxo**.
- **Saldo**: `pendente = solicitado − executado` (`src/modules/expedicao/saldo-pedido.ts`) e `disponível = max(executado − entregue, 0)` (`src/modules/expedicao/disponibilidade.ts`). Unidades diferentes nunca são somadas (`totais-por-unidade.ts`).
- **Classificação**: um item tem **no máximo uma atividade**; o código impede a segunda (`criarAtividadeNoEscopo`). Ou seja, na prática já é **1 item → 1 setor**.
- **Correção de setor**: só é permitida sem execução, ocorrência, entrega ou atividade iniciada (`motivoBloqueioCorrecao`).
- **Entrega acima do disponível**: só Gerente, com motivo obrigatório, autorizador e `availableBefore` (`registrar-entrega.ts`).
- **Remessa**: número automático por item, confirmação opcional, sem baixa de saldo, remoção física (`remessas.ts`).
- **Ocorrência**: motivo obrigatório para `PERDA`, `REFUGO` e `INDISPONIBILIDADE`; **quantidade é opcional**; **duração não é coletada pela tela**; `PAUSA`/`PARADA` aceitam registro sem duração (`registrar-ocorrencia.ts` e `ocorrencia-form.tsx`).
- **Prazo**: data civil validada e persistida como **fim do dia em `America/Sao_Paulo`** (`prazos/prazo.ts`); histórico via `logs_auditoria` (`DEADLINE_CHANGED`).
- **Autenticação**: `passwordHash` (scrypt) e `status` vêm de `usuarios`; a sessão é um cookie assinado, não uma tabela (`auth/adapters/prisma-auth-repository.ts`).
- **Integração**: job idempotente por `pedido:<numero>`; estados `PENDING/DISPATCHED/RUNNING/SUCCEEDED/FAILED`; retry com backoff; detecção de job travado por `updatedAt` (~10 min); callback autenticado por token.

### 2.4 Integração com o Top Gerente

- O conector executa `SELECT` em `orcamento` + `orcamento_itens`, com `WHERE o.Emp = ? AND o.Orc = ?`, e devolve `emp`, `orc`, `legacyOrderKey = "${emp}:${orc}"`, `sellerCode` e itens com `seq`, `productCode`, `description`, `unit`, `requestedQuantity`.
- **O `Vend` usado é o do cabeçalho (`o.Vend`)**, não o do item (`i.Vend`). No legado, a PK de `orcamento_itens` é `(Emp, Vend, Orc, Seq)`; a PK de `orcamento` é `(Emp, Orc)`. O modelo novo usa `vendedor_codigo_origem` na identidade do item — o conector precisa passar a enviar `i.Vend`.
- O callback persiste o pedido em transação (`upsertOrder`) e registra divergências de quantidade/unidade em `logs_auditoria`.
- Reimportar o mesmo pedido atualiza dados comerciais e **preserva** o histórico operacional; mudança de unidade com registros operacionais é bloqueada e auditada.

### 2.5 Autenticação, autorização e administração

- 6 perfis (`RoleCode`): `OPERATOR`, `PRODUCTION_MANAGER`, `SELLER`, `SHIPPING`, `SYSTEM_RESPONSIBLE`, `TECHNICAL_RESPONSIBLE`.
- Matriz de permissões em `src/modules/usuarios/permissoes.ts` (fonte única no servidor).
- Usuários não são excluídos: são inativados (`status = INACTIVE`), o que derruba a sessão na próxima requisição.
- Setores são um enum (`CORTE_DOBRA`, `TELHAS`, `REVENDA`); a criação de setor pelo Administrador só aceita esses três códigos na prática.

### 2.6 Telas e fluxos por perfil

| Perfil | Rotas principais | Fluxo |
| --- | --- | --- |
| Todos | `login` | Autenticação, sessão, redirecionamento por perfil |
| Vendedor | `vendedor/pedidos`, `vendedor/pedidos/[orderId]`, `integracao` | Consulta, filtros, prazo, histórico, desmembramento, importação |
| Gerente | `gerente/painel`, `gerente/pedidos`, `gerente/pedidos/[orderId]`, `gerente/atividades` | Painel, alertas, drill-down, correção de setor, remessas, entregas, impressão |
| Operador | `operador/fila`, `operador/atividades/[id]`, `operador/ocorrencias`, `producao/atividades/[id]/ordem` | Fila por setor, execução, ocorrência, ordem de produção |
| Expedição | `expedicao/entregas`, `expedicao/entregas/[orderId]` | Lista de pedidos, detalhe, disponibilidade, entrega, histórico, remessas |
| Administração | `admin/usuarios`, `admin/setores` | Usuários, perfis, inativação, setores, mapeamentos |
| Técnico | `tecnico/integracao`, `integracao` | Jobs, eventos, erros, reprocessamento, importação |

**Conclusão da seção**: o frontend é fortemente acoplado ao conceito de **atividade** e ao **status gravado**. Preservar os contratos dessas telas é o principal requisito de projeto da adaptação.

---

## 3. Análise do novo banco `3e_ferro_aco_operacoes`

### 3.1 Inventário real

**19 tabelas**, **6 views** e **5 procedures**:

| Grupo | Tabelas |
| --- | --- |
| Cadastros | `setor`, `perfil`, `usuario`, `usuario_perfil`, `usuario_setor`, `unidade_medida`, `produto` |
| Comercial | `pedido`, `pedido_item` |
| Operação | `motivo_ocorrencia`, `apontamento`, `ocorrencia`, `entrega`, `entrega_prevista` |
| Integração/classificação | `job_integracao`, `evento_job_integracao`, `divergencia`, `regra_classificacao` |
| Auditoria | `logs_auditoria` |

**Views**: `vw_item_saldos`, `vw_item_andamento`, `vw_fila_setor`, `vw_pedido_resumo`, `vw_divergencia_aberta`, `vw_entrega_prevista`.

**Procedures**: `sp_registrar_apontamento`, `sp_anular_apontamento`, `sp_registrar_entrega`, `sp_anular_entrega`, `sp_definir_setor_item`.

### 3.2 Decisões de modelagem (e o que elas mudam)

1. **IDs `BIGINT UNSIGNED AUTO_INCREMENT`**. Substituem os CUID string. Vantagem: integridade e índice. Impacto: Prisma devolve `bigint`; `JSON.stringify` lança erro em `BigInt`; contratos, URLs e testes precisam de conversão. A aplicação não manipula IDs como texto (`slice`, `substring`), o que reduz o risco.
2. **`pedido_item` é o item e a “atividade” ao mesmo tempo**. Existe **um único** `id_setor_destino` nullable; **não existe `atividade`**. Prioridade (`prioridade_fila`), prazo operacional (`prazo_operacional`) e classificação (`classificado_em`, `classificado_por`) ficam no item.
3. **Status são derivados**. Não há coluna de status de item/atividade/pedido; as views calculam `situacao_execucao`, `situacao_entrega`, `situacao_atendimento`, `situacao_prazo_*`, `exige_atencao`.
4. **Cancelamento e anulação são lógicos**. `pedido_item.cancelado`, `apontamento.anulado_em`, `entrega.anulado_em`, `ocorrencia.anulado_em`, `entrega_prevista.anulada_em`. Nada é apagado.
5. **Idempotência explícita**. `apontamento`, `ocorrencia`, `entrega`, `job_integracao`, `divergencia` e `entrega_prevista` têm `chave_idempotencia` única (ou UK equivalente).
6. **Unidade de medida é catálogo**. `pedido_item.id_unidade_medida` é obrigatório e referencia `unidade_medida`; a unidade comercial original é preservada em `unidade_origem_codigo`.
7. **Regras de classificação unificadas**. `regra_classificacao` substitui `mapeamentos_categoria_setor` + `regras_produto_setor`, com `tipo_correspondencia` (`CATEGORIA`, `CODIGO_PRODUTO`, `DESCRICAO`), `operador` (`IGUAL`, `CONTEM`, `PREFIXO`), prioridade e vigência.
8. **Divergência formal**. `divergencia` registra `QUANTIDADE`, `UNIDADE`, `CANCELAMENTO` e `OUTRO`, com situação e resolução.
9. **Entrega prevista é a remessa**. `entrega_prevista` tem número por item, data, quantidade opcional, confirmação com autor e anulação lógica.
10. **Auditoria com FK de usuário**. `logs_auditoria.id_usuario` referencia `usuario`; `entidade_id` é `BIGINT` (referência lógica, sem FK polimórfica).

### 3.3 Pontos fortes do modelo novo

- **Normalização real**: `perfil`, `unidade_medida`, `produto` e `motivo_ocorrencia` deixam de ser enums/texto solto.
- **Histórico preservado**: anulação lógica em apontamento, entrega, ocorrência e previsão; cancelamento lógico de item.
- **Concorrência**: procedures com `SELECT ... FOR UPDATE` e ordem de lock consistente; UKs de idempotência.
- **Rastreabilidade**: autoria em classificação, confirmação de remessa, exceção de entrega e anulação.
- **Consultas operacionais prontas**: saldos, andamento, fila e resumo por pedido já vêm em views.
- **Integridade**: FKs `RESTRICT`, CHECKs de consistência (classificação, cancelamento, exceção, anulação, tipo de ocorrência).
- **Separação correta** entre realizado (`entrega`, `apontamento`) e previsto (`entrega_prevista`).

### 3.4 Lacunas e riscos do modelo novo

Ver seção 6 para o detalhamento com evidências. Em resumo:

- `usuario` **não tem** `senha_hash` nem status; a autenticação atual depende disso.
- `ocorrencia` **exige quantidade** para perda/refugo/indisponibilidade e **exige duração** para pausa/parada; a tela atual não coleta duração e trata quantidade como opcional.
- `entrega_prevista` **exige `criado_por`** e `confirmada_por`; o fluxo atual não registra autores.
- `pedido_item.id_unidade_medida` obrigatório: unidade desconhecida do ERP quebra a importação.
- `pedido_item.quantidade_solicitada > 0`: item com quantidade zero/negativa quebra a importação.
- `pedido_item` inclui `vendedor_codigo_origem` na UK; o conector envia o vendedor do cabeçalho, não o do item.
- `logs_auditoria.entidade_id` é `BIGINT`; a aplicação grava ids compostos (`"1:82268:3"`) nas divergências.
- `job_integracao.solicitado_por` é obrigatório; o reprocessamento atual não recebe usuário.
- `evento_job_integracao.detalhe` é JSON; a aplicação grava texto e a tela exibe texto.
- `atividade` não existe: as telas operacionais (fila, atividade, ocorrência, ordem, painel e detalhe do pedido) e as rotas de produção usam `activityId` como eixo.
- Procedures abrem transação própria; não podem ser chamadas dentro de `prisma.$transaction` (o próprio SQL alerta).

### 3.5 Avaliação pontual do modelo (checklist do pedido)

| Pergunta | Resposta |
| --- | --- |
| Todas as entidades necessárias estão contempladas? | **Sim**, com exceção de credencial de usuário e autoria de classificação/remessa. |
| Os relacionamentos estão corretos? | **Sim** para o domínio atual: pedido → item → apontamento/ocorrência/entrega/previsão; usuário N:N perfil/setor; setor → regra. |
| Existem tabelas redundantes? | **Não.** `entrega` (realizado) e `entrega_prevista` (previsto) são distintas; `divergencia` é a única que pode ficar sem uso inicial. |
| Existem informações em tabela “errada”? | `prazo_operacional` e `classificado_por` ficam no item porque não há `atividade`; é coerente com o modelo. `produto` pode ficar vazio sem prejuízo. |
| PK/FK estão corretas? | **Sim**, com destaque para a UK de identidade do item (ressalva P7) e para a FK composta de motivo/tipo. |
| N:N estão adequados? | **Sim**: `usuario_perfil` e `usuario_setor` com PK composta. |
| Tipos de dados são compatíveis? | **Sim** para quantidades (`DECIMAL(18,3)`), instantes (`DATETIME(6)`) e prazos (`DATE`), com ressalva de conversão de fuso e de catálogo de unidades. |
| Suporta registros parciais? | **Sim**: `apontamento` e `entrega` são incrementos; várias linhas somam. |
| Permite preservar histórico? | **Sim**: anulação lógica, cancelamento lógico e auditoria append-only. |
| Atende às regras de negócio? | **Parcialmente**: as regras de saldo, entrega e exceção estão corretas; ocorrência e remessa estão mais restritivas que o comportamento atual. |
| Faltam informações da estrutura atual? | **Sim**: `senha_hash`, `classificado_por` (origem), autores de remessa e chave textual de entidade na auditoria. |

---

## 4. Comparação entre as estruturas (matriz de correspondência)

| Banco atual | Novo banco | Ação necessária | Impacto |
| --- | --- | --- | --- |
| `usuarios` | `usuario` | Mapear `name/email/ativo`; **adicionar `senha_hash`** (ou manter credencial em tabela separada) e mapear `status` ↔ `ativo`. | Médio |
| `usuarios_perfis` | `usuario_perfil` + `perfil` | Trocar enum `RoleCode` por `perfil.codigo`; adaptador traduz `OPERADOR` ↔ `OPERATOR`. | Médio |
| `usuarios_setores` | `usuario_setor` | Mapeamento direto; IDs numéricos. | Baixo |
| `setores` | `setor` | Mapeamento direto; novo setor `EXPEDICAO` entra no catálogo. | Baixo |
| `mapeamentos_categoria_setor` | `regra_classificacao` | Uma linha `tipo_correspondencia='CATEGORIA'`, `operador='IGUAL'`; `status` → `ativo`. | Médio |
| `regras_produto_setor` | `regra_classificacao` | `CONTAINS` → `CONTEM`; `PREFIX` → `PREFIXO`; **duplicar** cada regra em `CODIGO_PRODUTO` e `DESCRICAO` para preservar o comportamento atual (a regra atual vale para os dois campos). | Médio |
| `pedidos` | `pedido` | `legacyOrderKey` (`emp:orc`) → `empresa_origem` + `numero_origem`; `sellerLegacyCode` → `vendedor_codigo`; `sourceUpdatedAt` → `data_orcamento`; `lastSyncedAt` → `sincronizado_em`. | Baixo |
| `pedidos_itens` | `pedido_item` | Separar identidade; mapear unidade para catálogo; `classificationStatus` → `id_setor_destino`/`classificado_*`; `deadlineAt` → `prazo_entrega` (DATE). | Alto |
| `atividades` | **sem tabela** | Eliminar; usar `pedido_item.id_setor_destino`, `prioridade_fila`, `prazo_operacional` e status derivados. | Alto |
| `execucoes` | `apontamento` | `occurredAt` → `registrado_em`/`finalizado_em`; sintetizar `chave_idempotencia`; `userId` → `id_usuario_executor`/`id_usuario_registro`. | Médio |
| `ocorrencias` | `ocorrencia` | Vínculo passa de atividade para item; `note` → `observacoes`; sintetizar chave; revisar CHECKs (quantidade/duração). | Alto |
| `motivos_ocorrencia` | `motivo_ocorrencia` | Mapeamento direto; FK composta `(id_motivo, tipo)` substitui validação em código. | Baixo |
| `entregas` | `entrega` | `managerOverride` → `excecao_autorizada`; `overrideReason` → `motivo_excecao`; `availableBefore` → `disponivel_antes`; `occurredAt` → `entregue_em`; sintetizar chave. **Anulação lógica é nova.** | Médio |
| `remessas_programadas` | `entrega_prevista` | `remessa` → `numero_remessa`; `scheduledAt` → `data_prevista`; `confirmedAt` → `confirmada_em`; adicionar `criado_por`/`confirmada_por`; **remoção vira anulação com motivo**. | Médio |
| `jobs_integracao` | `job_integracao` | `legacyOrderNumber` → `numero_origem`; adicionar `empresa_origem`; mapear 5 status para 6; `solicitado_por` obrigatório. | Médio |
| `eventos_job_integracao` | `evento_job_integracao` | `detail` (texto) → `detalhe` (JSON); `jobId` → `id_job`. | Baixo |
| `logs_auditoria` | `logs_auditoria` | `entityId` string → `entidade_id` BIGINT; alinhar vocabulário de `acao`/`entidade_tipo`. | Médio |
| — | `produto` | Tabela nova; pode ficar vazia (`pedido_item.id_produto` é nullable). | Baixo |
| — | `unidade_medida` | Tabela nova; precisa de seed e de fallback para unidades desconhecidas. | Médio |
| — | `divergencia` | Tabela nova; pode substituir as auditorias `UNIT_DIVERGENCE`/`QUANTITY_DIVERGENCE` ou conviver com elas. | Baixo/Médio |
| — | `entrega.anulado_em` | Recurso novo (anulação de entrega); não há tela hoje. | Baixo |
| — | `pedido_item.cancelado` | Recurso novo (AD-010); não há contrato do conector hoje. | Médio |

**Leitura da matriz**: não há tabela atual sem correspondência funcional. As duas mudanças estruturais são a **eliminação de `atividades`** e a **identidade numérica**. O restante é renomeação/realocação de campos.

---

## 5. Matriz de preservação das funcionalidades

Legenda: **P** = preservada sem mudança de comportamento; **B** = exige adaptação de backend; **F** = exige adaptação de frontend; **D** = decisão de negócio necessária; **R** = risco de perda se nada for feito.

| # | Funcionalidade | Evidência atual | Como fica no novo banco | Ação | Risco |
| --- | --- | --- | --- | --- | --- |
| 1 | Login por e-mail/senha | `usuarios.passwordHash`, `status` | `usuario.ativo`; **sem senha** | B + D: adicionar `senha_hash` ou mover credencial | Alto se não decidido |
| 2 | Sessão por cookie assinado | `auth/sessao.ts` | Inalterado (não usa banco) | P | Baixo |
| 3 | Perfis e permissões | `RoleCode` + `usuarios_perfis` | `perfil.codigo` + `usuario_perfil` | B | Baixo |
| 4 | Setores do usuário | `usuarios_setores` | `usuario_setor` | B | Baixo |
| 5 | Criar/inativar usuário | `gerenciar-usuarios.ts` | `usuario` + `ativo` | B | Baixo |
| 6 | Administrar setores | `setores` (enum) | `setor.codigo` (texto) | B (+ ganho: setores livres) | Baixo |
| 7 | Mapeamento categoria → setor | `mapeamentos_categoria_setor` | `regra_classificacao` | B | Médio |
| 8 | Sugestão por código/descrição | `regras_produto_setor` | `regra_classificacao` (2 tipos) | B + D | Médio |
| 9 | Importar pedido do Top Gerente | `jobs_integracao` + `pedidos` | `job_integracao` + `pedido` | B | Médio |
| 10 | Reimportação idempotente | UK `legacyOrderKey` | UK `(sistema, empresa, numero)` | P/B | Baixo |
| 11 | Callback + retry + job travado | `eventos_job_integracao`, `updatedAt` | `evento_job_integracao`, `atualizado_em` | B | Médio |
| 12 | Reprocessar job | `reprocessar.ts` (sem usuário) | `solicitado_por` obrigatório | B + D | Médio |
| 13 | Divergência de quantidade | `logs_auditoria` `QUANTITY_DIVERGENCE` | `divergencia` (`QUANTIDADE`) | B (opcional usar a tabela) | Baixo |
| 14 | Divergência de unidade (bloqueio) | `logs_auditoria` `UNIT_DIVERGENCE` | `divergencia` (`UNIDADE`) + unidade preservada | B | Médio |
| 15 | Classificação manual | `pedidos_itens.classificationStatus` + `atividades` | `pedido_item.id_setor_destino` + `classificado_*` | B | Médio |
| 16 | Classificação automática | `mapeamentos_categoria_setor` | `regra_classificacao` | B | Baixo (hoje a categoria vem nula do conector) |
| 17 | Correção de setor com motivo | `atividades.sectorId` + auditoria | `pedido_item.id_setor_destino` + auditoria | B | Médio |
| 18 | Fila do Operador por setor | `atividades` + `usuarios_setores` | `vw_fila_setor` / `pedido_item` | B | Médio |
| 19 | Execução parcial | `execucoes` | `apontamento` | B | Médio |
| 20 | Status da atividade | `atividades.status` | derivado (`vw_item_andamento`) | B | Alto |
| 21 | Prioridade da fila | `atividades.priority` | `pedido_item.prioridade_fila` | B | Baixo |
| 22 | Prazo operacional (leitura) | `atividades.deadlineAt` | `pedido_item.prazo_operacional` | B | Baixo |
| 23 | Prazo de entrega + histórico | `pedidos_itens.deadlineAt` + `logs_auditoria` | `pedido_item.prazo_entrega` + `logs_auditoria` | B | Médio (DATE × instante) |
| 24 | Ocorrências (perda/refugo/etc.) | `ocorrencias` + `motivos_ocorrencia` | `ocorrencia` + `motivo_ocorrencia` | B + D (CHECKs) | Alto |
| 25 | Painel de ocorrências | `ocorrencias` | `ocorrencia` | B | Baixo |
| 26 | Entrega parcial/total | `entregas` | `entrega` | B | Médio |
| 27 | Exceção acima do disponível | `managerOverride` etc. | `excecao_autorizada` etc. | B | Baixo |
| 28 | Histórico de entregas | `entregas` | `entrega` (+ anulação) | B | Baixo |
| 29 | Remessa: criar/confirmar/remover | `remessas_programadas` | `entrega_prevista` | B + F (motivo da remoção) | Médio |
| 30 | Anulação de entrega | **não existe** | `entrega.anulado_em` | Novo (opcional) | Baixo |
| 31 | Cancelamento de item | **não existe** | `pedido_item.cancelado` | Novo (AD-010) | Médio |
| 32 | Painel do Gerente (contagens/alertas) | `atividades`, `execucoes`, `ocorrencias` | views + `pedido_item` | B | Médio |
| 33 | Lista/detalhe com filtros e status | `consulta-pedidos.ts` + Prisma | views/SQL derivado | B | Alto (filtro por status) |
| 34 | Impressão da ordem | `atividades` | `pedido_item` + setor | B | Baixo |
| 35 | Auditoria e histórico | `logs_auditoria` | `logs_auditoria` | B (ID numérico) | Médio |
| 36 | 404, permissões, responsividade | UI/rotas | Inalterado | P | Baixo |

### 5.1 O que realmente não se perde

- **Um item continua tendo um único setor** — o código atual já impede a segunda atividade.
- **A fila continua por setor e prioridade** — `vw_fila_setor` cobre.
- **Saldos e disponibilidade continuam iguais** — as fórmulas do novo banco são as mesmas (`solicitado − executado`, `executado − entregue`).
- **Entrega acima do disponível continua bloqueada** — o novo `ck_entrega_excecao` e a procedure refletem a regra.
- **Histórico de prazos continua** — `logs_auditoria` com `DEADLINE_CHANGED`.
- **Permissões continuam no servidor** — o banco só guarda perfis e vínculos.

### 5.2 O que exige decisão antes de implementar

1. **Ocorrência**: manter a regra atual (quantidade opcional, duração não coletada) e **relaxar os CHECKs** do novo banco, ou endurecer a tela para exigir quantidade/duração? A prioridade declarada é preservar funcionalidades; a recomendação é **relaxar os CHECKs** e, em uma etapa futura, melhorar a captura.
2. **Remoção de remessa**: aceitar exigir motivo (mudança pequena de UX, ganho de auditoria) ou permitir motivo padrão? Recomendação: exigir motivo na UI.
3. **Setor `EXPEDICAO`**: o novo catálogo tem 4 setores; o app tem 3. O setor novo deve aparecer na classificação/filtros? Recomendação: sim para “setor de destino”, mas com rótulo e regra explícitos; validar com o negócio.
4. **Usuário**: adicionar `senha_hash` ao `usuario` (recomendado) ou criar tabela de credenciais separada?
5. **Vendedor por item**: corrigir o conector para enviar `i.Vend` (recomendado) ou retirar `vendedor_codigo_origem` da UK do item?
6. **Divergência**: usar a tabela `divergencia` como fonte oficial ou manter `logs_auditoria` e usar `divergencia` só para o que é novo?
7. **Autoria da classificação**: `classificado_por` é obrigatório; a classificação automática não tem usuário. Usar o solicitante do job ou permitir nulo?

---

## 6. Problemas e incompatibilidades identificados

### 6.1 Bloqueantes estruturais e de regra (o novo banco rejeitaria operações atuais)

**P0 — Credencial de usuário ausente.**
- Atual: `usuarios.passwordHash` (scrypt) e `status` (`ACTIVE/INACTIVE`) são a base do login (`src/modules/auth/adapters/prisma-auth-repository.ts`).
- Novo: `usuario` tem apenas `nome`, `email`, `ativo` e timestamps; não há `senha_hash` nem status.
- Efeito: sem uma coluna de credencial, **nenhum login funciona** após a migração.
- Correção sugerida: adicionar `senha_hash VARCHAR(255) NOT NULL` ao `usuario` (recomendado, menor mudança) e mapear `status` ↔ `ativo`; ou criar uma tabela `credencial` separada.

**P1 — Ocorrência de perda/refugo/indisponibilidade sem quantidade.**
- Atual: `registrarOcorrencia` aceita `quantidade` nula; a tela diz “Opcional, quando houver perda/refugo em quantidade” (`src/shared/ui/ocorrencia-form.tsx`).
- Novo: `ck_ocorrencia_tipo_campos` exige `id_motivo IS NOT NULL AND quantidade IS NOT NULL` para esses tipos.
- Efeito: um registro que hoje funciona passaria a falhar com erro de CHECK.
- Correção sugerida: relaxar o CHECK para permitir quantidade nula (preserva a regra) **ou** tornar a quantidade obrigatória na UI (muda a regra).

**P2 — Pausa/parada sem duração.**
- Atual: a tela **não possui campo de duração**; `duracaoMin` é aceito pela API, mas nunca enviado pelo formulário.
- Novo: `ck_ocorrencia_tipo_campos` exige `duracao_minutos IS NOT NULL` para `PAUSA`/`PARADA`.
- Efeito: **toda** pausa/parada registrada pela tela seria rejeitada.
- Correção sugerida: relaxar o CHECK **ou** adicionar o campo de duração na tela (mudança de comportamento).

**P3 — Remoção de remessa sem motivo.**
- Atual: `DELETE /api/pedidos/remessas/[id]` apaga fisicamente, sem motivo.
- Novo: `entrega_prevista` exige `anulada_em`, `anulada_por` e `motivo_anulacao` (CHECK).
- Efeito: a remoção atual não pode ser replicada sem mudar a UI/API.
- Correção sugerida: trocar o `DELETE` por anulação lógica com motivo; ajustar o diálogo.

**P4 — Classificação sem autor.**
- Atual: a classificação manual recebe `userId`, mas **não o persiste** no item/atividade; a automática não tem usuário.
- Novo: `ck_item_classificacao` exige `classificado_por IS NOT NULL` quando há setor.
- Efeito: a classificação automática e a migração de itens já classificados violam o CHECK.
- Correção sugerida: usar o solicitante do job na automática e um usuário de sistema na migração, ou permitir `classificado_por` nulo para classificação automática.

**P5 — Unidade de medida obrigatória.**
- Atual: `pedidos_itens.unit` é texto livre; o app aceita qualquer unidade (metro com 2 casas; demais inteiras).
- Novo: `pedido_item.id_unidade_medida` é `NOT NULL` e FK para `unidade_medida`.
- Efeito: unidade do ERP fora do catálogo (`MT`, `M²`, `PÇ`, `CX`, vazio) quebra a importação.
- Correção sugerida: normalizar e mapear para o catálogo; **fallback `UN`**; preservar `unidade_origem_codigo` para exibição.

**P6 — Quantidade solicitada maior que zero.**
- Atual: não há CHECK; a importação aceita o que vier do ERP.
- Novo: `ck_item_quantidade (quantidade_solicitada > 0)`.
- Efeito: item com quantidade 0/negativa (devolução, bonificação, erro de cadastro) quebra a importação.
- Correção sugerida: tratar como divergência explícita na importação **ou** relaxar para `>= 0` com regra de negócio.

### 6.2 Bloqueantes de identidade e contrato

**P7 — `vendedor_codigo_origem` na identidade do item.**
- O conector envia `o.Vend` (cabeçalho); a PK legada de `orcamento_itens` é `(Emp, Vend, Orc, Seq)`.
- O novo UK é `(id_pedido, vendedor_codigo_origem, seq_origem)`.
- Se o vendedor do item divergir do cabeçalho (ou mudar em uma reimportação), o mesmo item vira **outra linha**, perdendo o vínculo com execuções/entregas.
- Correção sugerida: enviar `i.Vend` por item (ajuste pequeno no `CONSULTAR_PEDIDO_SQL`) **ou** retirar o vendedor da UK e manter só `(id_pedido, seq_origem)`.

**P8 — IDs `BIGINT` e serialização.**
- Prisma devolve `bigint`; `Response.json`/`JSON.stringify` falham com `BigInt`.
- Há **269 chamadas `Response.json`** no código.
- Correção sugerida: adaptadores convertem `bigint → string` nos DTOs; nenhum `BigInt` cru chega à borda. Alternativa: serializador global com `replacer`. A primeira é mais segura e mantém o contrato atual.

**P9 — `logs_auditoria.entidade_id` é `BIGINT`.**
- Hoje as divergências de unidade/quantidade gravam `entityId` composto (`"${legacyOrderKey}:${legacyItemKey}"`).
- O novo schema não aceita string nesse campo.
- Correção sugerida: gravar o `id_item_pedido` numérico e mover a chave legada para `antes_json`/`depois_json`; ou adicionar uma coluna `chave_entidade VARCHAR(120)`.

**P10 — `job_integracao.solicitado_por` obrigatório.**
- `reprocessar()` cria um job sem usuário (`src/modules/integracao/reprocessar.ts`).
- Correção sugerida: a rota `POST /api/integracao/pedidos/[jobId]/reprocessar` já tem sessão; passar `auth.usuario.userId` ao repositório. Para retries automáticos, herdar o solicitante do job original.

**P11 — `evento_job_integracao.detalhe` é JSON.**
- Hoje `detail` é texto e a tela do Técnico exibe o texto.
- Correção sugerida: gravar `{"mensagem": "...", "codigo": "..."}` e o adaptador devolver `detalhe.mensagem` para a UI, preservando a leitura.

### 6.3 Impactos estruturais (não são “erros”, mas custam)

**P12 — Fim da tabela `atividades`.**
- As telas operacionais e as rotas de produção usam `activityId`: `/operador/atividades/[id]`, `/api/producao/atividades/[id]/execucoes`, `/ocorrencias`, `/prioridade`, `/prazo`, `/ordem`, além do detalhe do pedido e do painel.
- Correção sugerida: manter o **contrato** `atividade` no domínio e mapear `atividade.id = pedido_item.id_item_pedido`. O adaptador lê `pedido_item` + `apontamento` e devolve o DTO atual (`sectorId`, `status`, `priority`, `deadlineAt`, `createdAt`). Nenhuma página precisa mudar.

**P13 — Status derivados.**
- `statusDaAtividade` é gravado hoje; no novo modelo é calculado. O filtro por status da lista de pedidos é feito no banco com relation filters do Prisma (`filtros-pedidos-prisma.ts`).
- Correção sugerida: usar as views (`vw_item_andamento`, `vw_pedido_resumo`) para leitura e `$queryRaw` parametrizado para filtros/paginação; manter `statusDoPedido` como contrato de saída.

**P14 — Prazo DATE × instante.**
- Hoje `deadlineAt` é um instante no fim do dia de São Paulo (`2026-11-28T02:59:59.999Z`).
- Novo: `prazo_entrega DATE` / `prazo_operacional DATE`.
- Correção sugerida: converter na borda do adaptador (`fimDoDiaNoFuso` ↔ `DATE` no fuso `America/Sao_Paulo`), com testes de virada de dia. Risco de off-by-one se a conversão for ingênua.

**P15 — Remoção de `status` de usuário.**
- `ativo` booleano substitui `ACTIVE/INACTIVE`; a autorização já checa `INACTIVE` (`autorizacao.ts`). Mapear `ativo=false → INACTIVE` no adaptador.

**P16 — `setor` com 4 códigos.**
- `SectorCode` atual tem 3; o novo tem `EXPEDICAO`. Se o catálogo for lido sem filtro, o setor novo aparece em filtros e na classificação. Decidir se é desejado; se não, marcar com um atributo “não classificável” (não existe no modelo novo) ou filtrar no adaptador.

**P17 — `perfil` como tabela.**
- 49 arquivos usam `RoleCode`. Manter o tipo `RoleCode` no domínio (union de strings) e mapear no adaptador evita tocar todos.

### 6.4 Riscos de migração de dados

| Risco | Evidência | Mitigação |
| --- | --- | --- |
| `classificado_por` sem origem | A classificação atual não persiste autor | Backfill com usuário de sistema; registrar a limitação |
| `confirmada_por`/`criado_por` de remessa sem origem | `remessas_programadas` não tem autores | Backfill com usuário de sistema |
| Ocorrências históricas inválidas | UI permite perda sem quantidade e parada sem duração | Relatório prévio; corrigir/relaxar CHECK antes do ETL |
| Entregas normais com `availableBefore` preenchido | O adapter grava `availableBefore` sempre | No ETL, gravar `disponivel_antes = NULL` quando `excecao=0` (CHECK novo) |
| `entityId` composto na auditoria | `UNIT_DIVERGENCE`/`QUANTITY_DIVERGENCE` | Mapear para `id_item_pedido`; guardar a chave legada no JSON |
| Jobs sem empresa/solicitante | `jobs_integracao` não tem `empresa` nem `solicitado_por` | Derivar empresa do pedido; solicitante da auditoria `IMPORT_REQUESTED` ou usuário de sistema |
| Status de job em inglês | `PENDING…FAILED` | Tabela de conversão explícita |
| Unidades fora do catálogo | Texto livre no ERP | Mapeamento + fallback `UN`; relatório de unidades distintas |
| Itens com quantidade 0/negativa | Sem CHECK atual | Relatório prévio; decisão de negócio |
| Sequência/IDs | CUID → BIGINT | Tabela de correspondência `cuid → bigint` para auditoria e logs |

### 6.5 Concorrência e procedures

O SQL novo alerta: as procedures abrem `START TRANSACTION` internamente e **não podem** ser chamadas dentro de uma transação externa (o `START TRANSACTION` faz commit implícito). A aplicação já resolve a concorrência com `prisma.$transaction` + `SELECT ... FOR UPDATE` (`prisma-producao-repository.ts`, `prisma-expedicao-repository.ts`, `prisma-prazos-repository.ts`).

**Recomendação**: **não** chamar as procedures na primeira adaptação. Manter a concorrência nos adaptadores (padrão atual) e usar as procedures apenas como documentação/defesa opcional. Isso evita o problema de transação aninhada e preserva o comportamento testado.

### 6.6 Observações de qualidade do novo modelo

- **Pontos positivos**: CHECKs bem pensados, UKs de idempotência, anulação lógica, views separadas por fato (evitam multiplicação de somas), FK composta para motivo/tipo e para ocorrência/apontamento.
- **Pontos de atenção**:
  - `pedido_item.vendedor_codigo_origem` na UK (P7).
  - `usuario` sem credencial (P0).
  - `ocorrencia` mais restritiva que a regra atual (P1/P2).
  - `entrega_prevista` exigindo autores que o fluxo não coleta (P3).
  - `classificado_por` obrigatório sem origem para automática/migração (P4).
  - `vw_*` usando `DATE(UTC_TIMESTAMP() - INTERVAL 3 HOUR)` em vez de nome de fuso; funciona hoje (Brasil sem DST), mas é frágil.
  - `pedido_item` não guarda “quem cancelou” (só `cancelado_origem` ERP/USUARIO), o que limita a auditoria do cancelamento.
  - `logs_auditoria` não tem FK polimórfica (correto), mas o `entidade_id` numérico exige padronização de vocabulário.

---

## 7. Comparação das três estratégias

### Alternativa A — adaptar a aplicação atual

**O que é**: manter telas, rotas, casos de uso e testes; trocar o schema Prisma, os adaptadores e a conexão; migrar os dados.

| Critério | Avaliação |
| --- | --- |
| Complexidade | Média/alta. 15 adaptadores Prisma, 5 SQLs crus, 1 rota com Prisma direto, schema novo com 19 modelos. |
| Esforço | **6 a 8 semanas** (1 dev experiente), incluindo ETL e estabilização. 4 a 5 semanas com duas pessoas. |
| Riscos | IDs BIGINT, status derivados, ETL, regras mais restritivas, contrato do conector. |
| Preservação | **Alta**, se a camada de adaptação mantiver os DTOs e a “atividade” como alias do item. |
| Vantagens | Não reescreve UI; aproveita 1.185 testes; uma única base de código; entrega incremental. |
| Desvantagens | Exige uma janela de migração e um ETL cuidadoso; o schema antigo e o novo convivem durante a transição. |

### Alternativa B — MVP em outra pasta

**O que é**: uma aplicação independente, só com o banco novo, para validar o modelo.

| Critério | Avaliação |
| --- | --- |
| Complexidade | Média (se o escopo for estreito) a alta (se tentar paridade). |
| Esforço | **3 a 4 semanas** para um MVP de fluxo (importar → classificar → executar → entregar); **6 a 10 semanas** para algo próximo do sistema atual. |
| Riscos | Duplicação de código/regras; o MVP pode “provar” o banco sem provar a preservação das 36 funcionalidades; manutenção dupla. |
| Preservação | Baixa (por definição, não é o sistema atual). |
| Vantagens | Baixo risco para o sistema em produção; ótimo para validar o modelo e a integração. |
| Desvantagens | Não é o caminho para entregar o sistema; pode virar uma segunda base. |

**Uso recomendado**: como **spike** de 2 a 4 dias (não como MVP completo): subir o banco novo vazio, mapear o Prisma, ler um pedido, registrar uma execução e uma entrega, e comparar com o comportamento atual. Isso reduz a incerteza sem duplicar o sistema.

### Alternativa C — adaptação gradual com validação paralela

**O que é**: manter a aplicação e o banco atuais funcionando; implementar a nova persistência atrás das mesmas portas; migrar módulo a módulo; rodar a suíte contra os dois bancos; fazer o cutover só no fim.

| Critério | Avaliação |
| --- | --- |
| Complexidade | Alta de coordenação, média de código (reusa o trabalho da A). |
| Esforço | **7 a 9 semanas**, com mais overhead de testes e comparação. |
| Riscos | Menor risco funcional; maior custo de manter duas verdades durante a transição. |
| Preservação | **A mais alta**. |
| Vantagens | Cada módulo é validado antes do próximo; é possível comparar contagens/somas; rollback simples. |
| Desvantagens | Exige disciplina de feature flag e de “qual banco é a verdade” em cada etapa. |

**Como fazer sem dual-write complexo**: manter o banco atual como fonte de verdade até o cutover; implementar os adaptadores novos e validá-los com **testes de contrato** e uma **cópia do banco** (não em paralelo de escrita). A “validação paralela” é feita por execução de leitura/ETL em cópia, não por escrita dupla em produção. Isso reduz o risco sem a complexidade de sincronizar dois bancos em tempo real.

### Quadro-resumo

| Critério | A | B | C |
| --- | --- | --- | --- |
| Preserva a aplicação atual | Alta | Baixa | Alta |
| Preserva todas as funcionalidades | Alta (com ajustes) | Baixa/Média | Alta |
| Risco de regressão | Médio | Baixo (para o sistema atual) / Alto (para o produto) | Baixo/Médio |
| Esforço | 6–8 semanas | 3–4 (MVP) / 6–10 (paridade) | 7–9 semanas |
| Prova o modelo novo | Sim, no fim | Sim, cedo | Sim, por módulo |
| Duplica código | Não | Sim | Não |
| Recomendado | **Sim (alvo)** | Só como spike | **Sim (processo)** |

---

## 8. Recomendação técnica

### 8.1 Respostas objetivas

1. **É possível adaptar a aplicação atual ao novo banco sem perder funcionalidades?**
   **Sim, com ajustes no modelo novo e uma camada de adaptação.** Não é uma troca de conexão; é uma migração de persistência com ETL. A arquitetura de portas/adaptadores é o principal facilitador.

2. **O novo banco contempla todas as necessidades atuais?**
   **Quase todas.** Cobre pedidos, itens, classificação, produção, ocorrências, entregas, previsões, integração, auditoria, perfis e setores. Faltam/estão incompletos: credencial de usuário (`senha_hash`), autores de remessa/classificação, e as regras de ocorrência estão mais restritivas que o comportamento atual.

3. **Quais funcionalidades exigiriam mudanças mais significativas?**
   - Status de atividade/pedido (de gravado para derivado).
   - Fila/atividade (de tabela para item + views).
   - Ocorrências (CHECKs de quantidade/duração).
   - Remessas (remoção lógica com motivo e autores).
   - Integração (solicitante obrigatório, status, evento JSON, vendedor por item).
   - Lista/filtros de pedidos (status derivado e paginação).
   - Autenticação (credencial ausente).

4. **Existem tabelas ou informações importantes esquecidas?**
   Não há entidade operacional ausente. Há **campos** importantes sem origem ou sem coluna: `senha_hash`, `classificado_por` (para automática/migração), `criado_por`/`confirmada_por` de remessa, e uma chave de entidade textual para auditorias de divergência. Também falta um lugar explícito para “quem cancelou o item” (além de `ERP`/`USUARIO`).

5. **É melhor adaptar diretamente ou criar primeiro um MVP?**
   **Adaptar diretamente, mas começar com um spike curto** (2–4 dias) no banco novo, sem tocar no sistema em produção. Um MVP completo é desnecessário e duplicaria código; o spike reduz a incerteza técnica.

6. **Qual estratégia apresenta menor risco?**
   **C (adaptação gradual com validação paralela)**, usando o alvo da A. O menor risco vem de migrar por módulo, manter a suíte atual e comparar contagens/somas antes do cutover.

7. **Qual seria a sequência ideal?**
   Revisar o modelo (decisões da seção 6) → spike técnico → fundação (schema, seeds, IDs, serialização) → módulos de leitura → módulos de escrita → integração → ETL e validação → cutover → estabilização.

### 8.2 Classificação de viabilidade

**Viabilidade: MÉDIA.**

**Por que não Alta**: a troca de CUID por BIGINT, a eliminação de `atividades`, os status derivados, as regras mais restritivas de ocorrência/remessa, a unidade obrigatória, a auditoria numérica e a identidade do vendedor por item exigem mudanças relevantes em adaptadores, contratos e ETL. Nenhuma delas é “só renomear”.

**Por que não Baixa**: todas as entidades atuais têm correspondência; a UI pode permanecer; o acesso ao banco está isolado; há apenas 1 rota com Prisma direto e 5 SQLs crus; o novo modelo é mais completo e mais íntegro; a suíte de testes existente é um ativo valioso para a migração.

### 8.3 Recomendação final

1. **Não executar o script novo no banco atual.** Ele cria um banco novo e não migra dados.
2. **Revisar o modelo com Marcelo** nos pontos P0–P7 antes de congelar a versão 2.1 do SQL.
3. **Adotar a aplicação atual como base** e implementar a nova persistência atrás das portas existentes.
4. **Manter o contrato externo** (IDs string, DTOs atuais, status atuais) e traduzir no adaptador. Isso preserva as 18 páginas e as 35 rotas.
5. **Executar o ETL em cópia**, com relatório de contagens/somas e tratamento explícito das linhas inválidas.
6. **Cutover único**, com backup, janela e rollback documentado.

---

## 9. Plano de implementação por etapas

> Pré-requisito: aprovação deste diagnóstico e das decisões da seção 5.2. Nenhuma etapa abaixo foi executada.

### Etapa 0 — Revisão do modelo e decisões (3–5 dias)

- Consolidar as decisões P0–P7 com Marcelo.
- Ajustar o SQL novo (versão 2.1) nos pontos acordados: credencial, ocorrência, remessa, autores, unidade, identidade do item, auditoria.
- Definir o vocabulário de status (manter inglês no domínio e traduzir, ou migrar para português).
- **Gate**: SQL 2.1 aprovado; nenhuma alteração no banco atual.

### Etapa 1 — Spike técnico (2–4 dias)

- Criar um banco vazio `3e_ferro_aco_operacoes` em ambiente de teste.
- Escrever um `schema.prisma` mínimo (ou completo) mapeado ao novo banco.
- Provar: leitura de um pedido + itens; criação de um `apontamento`; criação de uma `entrega` com exceção; leitura de `vw_item_saldos`; serialização de IDs.
- **Gate**: um script de spike lê/escreve no banco novo sem tocar no banco atual.

### Etapa 2 — Fundação (1 semana)

- Schema Prisma definitivo + migrations do banco novo.
- Seeds: setores (4), perfis (6), unidades (UN, PC, M, M2, KG + fallback), motivos.
- Utilitários: `bigint ↔ string`, `DATE ↔ fim do dia SP`, `status` derivados, `idempotency key`.
- Harness de testes com dois bancos (atual e novo) e testes de contrato dos adaptadores.
- **Gate**: `prisma generate`, `migrate deploy` e seed funcionando em banco vazio; testes de fundação verdes.

### Etapa 3 — Módulos de leitura (1–1,5 semana)

- Lista/detalhe de pedidos (filtros, paginação, status derivado).
- Prazos e histórico (`logs_auditoria`).
- Indicadores, painel, alertas e painel de ocorrências.
- **Gate**: paridade visual e de dados com o banco atual em uma cópia; testes de contrato.

### Etapa 4 — Módulos de escrita (1,5–2 semanas)

- Classificação e correção de setor (com autor).
- Execução/apontamento (com idempotência).
- Ocorrências (com a decisão de P1/P2).
- Entregas (com exceção e idempotência) e remessas (com anulação e motivo).
- **Gate**: suíte atual adaptada verde; novos testes de integração MySQL verdes; cenários de concorrência.

### Etapa 5 — Integração (1 semana)

- Mapear `job_integracao` (status, empresa, solicitante), eventos JSON e reprocessamento.
- Ajustar o conector para enviar `i.Vend` por item (se a decisão for P7).
- Testar callback, retry, job travado e reimportação.
- **Gate**: importação real em ambiente de teste com o conector; `SUCCEEDED` e reimportação idempotente.

### Etapa 6 — ETL e validação paralela (1–1,5 semana)

- Tabela de correspondência `cuid → bigint`.
- Migrar usuários, perfis, setores, vínculos, pedidos, itens, atividades (→ item), execuções, ocorrências, entregas, remessas, jobs, eventos e auditoria.
- Relatórios: contagens por tabela, somas de quantidades, órfãos, linhas inválidas, amostras por pedido.
- **Gate**: 100% de contagens e somas conferidas; nenhuma FK órfã; linhas inválidas tratadas e documentadas.

### Etapa 7 — Cutover (2–3 dias)

- Backup completo do banco atual.
- Janela de congelamento; executar ETL final; smoke test (login, lista, detalhe, execução, entrega, remessa, importação).
- Plano de rollback: manter o banco antigo intacto por 30 dias.
- **Gate**: smoke test aprovado; aplicação em produção com o banco novo; banco antigo preservado.

### Etapa 8 — Estabilização (1 semana)

- Monitorar erros, latência e jobs.
- Corrigir divergências de comportamento.
- Atualizar `docs/banco-de-dados.md`, `docs/decisoes.md`, `.specs/STATE.md` e o runbook.
- **Gate**: 1 semana sem regressão crítica; suíte verde; documentação atualizada.

### Estimativa consolidada

| Perfil | Duração |
| --- | --- |
| 1 dev experiente | 7–9 semanas |
| 2 devs (um em ETL/testes) | 5–6 semanas |
| Só o spike (validação do modelo) | 2–4 dias |

Premissas: banco de teste disponível; decisões P0–P7 tomadas na Etapa 0; sem mudanças de escopo durante a migração; dados atuais com volume compatível com o ambiente de teste.

---

## 10. Conclusão sobre a viabilidade

O novo banco é **mais organizado, mais íntegro e mais rastreável** que o atual. Ele resolve os pontos levantados pelo professor (nomes, IDs, perfis, apontamentos, exceção de entrega, regras de classificação, remessas como previsão) e acrescenta anulação lógica, cancelamento de item e divergência formal. A aplicação atual **não precisa ser reconstruída**: a separação em módulos e adaptadores permite trocar a persistência preservando telas, rotas e regras.

A adaptação é **viável, com viabilidade média**, desde que:

1. O modelo novo seja ajustado nos pontos de regra (P0–P7) **antes** da implementação.
2. O contrato externo seja preservado (IDs string, DTOs atuais, status atuais) por uma camada de tradução.
3. As procedures não sejam misturadas com as transações do Prisma.
4. O ETL seja tratado como um projeto à parte, com relatórios e validação.
5. O cutover seja único e com rollback.

**Não recomendo** começar pela implementação direta nem por um MVP completo. Recomendo **revisar o modelo → spike curto → adaptação incremental com validação paralela → ETL → cutover**.

**Aguardo autorização para iniciar qualquer alteração.** Até lá, o banco atual, as migrations, os modelos, as configurações e as funcionalidades permanecem intactos.

---

## Anexo A — Evidências consultadas

- `banco_novo_marcelo/01_banco_3e_mysql.sql` — 19 tabelas, 6 views, 5 procedures, CHECKs, UKs e seeds.
- `banco_novo_marcelo/3e_ferro_aco_operacoes_tabelas.png` — diagrama com as 19 tabelas e FKs.
- `prisma/schema.prisma` — 17 modelos atuais, enums `UserStatus`, `RoleCode`, `SectorCode`, `MappingStatus`, `ItemClassificationStatus`, `ActivityStatus`, `IntegrationJobStatus`.
- `prisma/migrations/20261007000000_init`, `20261015193341_alertas_remessas_regras`, `20261020213000_padroniza_tabelas_portugues`, `20261020213500_padroniza_constraints_portugues`.
- `src/shared/db/prisma.ts` — conexão via `DATABASE_URL` e pool configurável.
- `src/modules/auth/adapters/prisma-auth-repository.ts`, `src/modules/auth/autenticar.ts`, `src/modules/auth/senha.ts` — `passwordHash`, `status`, scrypt.
- `src/modules/pedidos/importar-pedido.ts`, `src/modules/pedidos/adapters/prisma-pedidos-repository.ts`, `src/modules/pedidos/mudanca-unidade.ts` — upsert, divergências, bloqueio de unidade.
- `src/modules/producao/registrar-execucao.ts`, `src/modules/producao/saldo.ts`, `src/modules/producao/adapters/prisma-producao-repository.ts` — status e concorrência.
- `src/modules/expedicao/registrar-entrega.ts`, `src/modules/expedicao/disponibilidade.ts`, `src/modules/expedicao/saldo-pedido.ts`, `src/modules/expedicao/remessas.ts`, `src/modules/expedicao/adapters/prisma-remessa-repository.ts` — entrega, exceção, remessa e exclusão física.
- `src/modules/ocorrencias/registrar-ocorrencia.ts`, `src/modules/ocorrencias/motivos.ts`, `src/shared/ui/ocorrencia-form.tsx` — regras de ocorrência e ausência de duração na tela.
- `src/modules/setores/classificar-item.ts`, `src/modules/setores/corrigir-setor.ts`, `src/modules/setores/sugerir-setor.ts`, `src/modules/setores/adapters/prisma-classificacao-repository.ts` — classificação, correção e sugestão.
- `src/modules/usuarios/permissoes.ts`, `src/modules/usuarios/gerenciar-usuarios.ts`, `src/shared/http/autorizacao.ts` — perfis, matriz e sessão.
- `src/modules/integracao/contratos.ts`, `src/modules/integracao/solicitar-importacao.ts`, `src/modules/integracao/reprocessar.ts`, `src/modules/integracao/processar-callback.ts`, `src/modules/integracao/adapters/prisma-integracao-repository.ts`, `src/app/api/integracao/despacho.ts` — job, callback, retry, status.
- `src/modules/prazos/prazo.ts`, `src/modules/prazos/adapters/prisma-prazos-repository.ts`, `src/app/api/pedidos/itens/[itemId]/prazo/historico/route.ts` — prazo e histórico.
- `src/modules/indicadores/consulta-pedidos.ts`, `src/modules/indicadores/alertas.ts`, `src/modules/indicadores/painel.ts`, `src/modules/indicadores/adapters/filtros-pedidos-prisma.ts`, `src/modules/indicadores/adapters/prisma-indicadores-repository.ts` — status derivado, filtros, alertas e painel.
- `connector-local/src/topgerente.ts` — SQL do legado, `o.Vend`, `i.Seq`, `legacyOrderKey`.
- `docs/legado/schema-top-gerente.md` — PK de `orcamento` `(Emp, Orc)` e de `orcamento_itens` `(Emp, Vend, Orc, Seq)`.
- `docs/revisao-banco-professor.md`, `docs/decisoes.md`, `.specs/STATE.md` — decisões AD-009, AD-010, AD-013, AD-016, AD-017, AD-025 e pendências.
- Banco de demonstração `3e_operacoes_demo` — 17 tabelas de aplicação e FKs com `CASCADE`/`RESTRICT` conferidas via `information_schema`.

## Anexo B — Números do diagnóstico

| Item | Valor |
| --- | --- |
| Tabelas no banco atual | 17 (+ `_prisma_migrations`) |
| Tabelas no banco novo | 19 |
| Views no banco novo | 6 |
| Procedures no banco novo | 5 |
| Rotas de API | 35 |
| Páginas | 18 |
| Arquivos de teste | 135 |
| Testes atuais | 1.185 verdes + 47 ignorados |
| Arquivos que importam Prisma em `src/app` | 1 |
| Consultas SQL cruas em produção | 5 |
| Ocorrências de `RoleCode` | 118 (49 arquivos) |
| Ocorrências de `SectorCode` | 63 |
| Ocorrências de `ActivityStatus` | 92 (29 arquivos) |
| Chamadas `Response.json` | 269 |
