# Banco de dados 3E — tabelas, relações e propósito

**Banco**: `3e_operacoes_v2` (MySQL 8.4)
**Data**: 03/11/2026
**Estrutura**: 14 tabelas + 5 views
**Diagramas**: [DER](diagramas/der-banco-pt-v2.png) · [MER](diagramas/mer-banco-pt-v2.png) · [Classes](diagramas/classes-banco-pt-v2.png)
**Relatório da evolução**: [banco-evolucao-2026-10-31.md](banco-evolucao-2026-10-31.md)

Este documento explica **por que cada tabela existe**, **para que serve**, **quais relações ela tem** e **o que aconteceria sem ela**. Ele complementa os diagramas: o DER mostra a estrutura física, o MER a visão conceitual e o diagrama de classes a visão de persistência.

---

## 1. Como ler as relações

| Conceito | Significado no 3E |
| --- | --- |
| **1:1** | Um registro de A corresponde a no máximo um de B. Ex.: item × operação (a linha do item guarda a operação). |
| **1:N** | Um registro de A pode ter vários de B; cada B pertence a um A. Ex.: pedido → itens. |
| **N:N** | Vários A para vários B. Ex.: usuário × perfil e usuário × setor. |
| **PK** | Chave primária: identifica a linha. |
| **FK** | Chave estrangeira: aponta para a PK de outra tabela. |
| **UK** | Chave única: impede duplicidade de uma combinação. |
| **NULL** | A relação é opcional naquele ponto. Ex.: item ainda sem setor. |
| **`ON DELETE RESTRICT`** | Impede excluir o pai enquanto houver filhos. Protege histórico. |
| **`ON DELETE CASCADE`** | Exclui os filhos junto com o pai. Usado em vínculos que não fazem sentido sozinhos. |
| **`ON DELETE SET NULL`** | Mantém o filho e apaga a referência. Usado em autoria/opcionalidade. |

**Regra de ouro do 3E**: usuários e setores **não são excluídos**; são inativados (`ativo`/`situacao`). As regras de `ON DELETE` são uma rede de segurança, não o fluxo normal.

---

## 2. Visão geral

| # | Tabela | Categoria | Registros* | Serve para |
| --- | --- | --- | ---: | --- |
| 1 | `usuarios` | Identidade | 8 | Quem é a pessoa, credencial e situação |
| 2 | `usuarios_perfis` | Identidade | 8 | O que a pessoa pode fazer (N:N) |
| 3 | `usuarios_setores` | Identidade | 9 | Onde a pessoa atua (N:N) |
| 4 | `setores` | Cadastro | 3 | Corte e Dobra, Telhas, Revenda |
| 5 | `regras_classificacao` | Cadastro | 29 | Categoria/código/descrição → setor |
| 6 | `pedidos` | Comercial | 10 | Cabeçalho do pedido importado |
| 7 | `pedidos_itens` | Comercial + operação | 63 | Item, setor, situação, prioridade, prazos |
| 8 | `apontamentos` | Operação | 16 | Execução/separação parcial |
| 9 | `ocorrencias` | Operação | 14 | Perda, refugo, indisponibilidade, pausa, parada |
| 10 | `motivos_ocorrencia` | Cadastro | 9 | Catálogo de motivos |
| 11 | `entregas` | Operação | 9 | Entrega realizada |
| 12 | `entregas_previstas` | Operação | 3 | Previsão/remessa |
| 13 | `jobs_integracao` | Integração | 15 | Importação do Top Gerente |
| 14 | `logs_auditoria` | Auditoria | 120 | Quem alterou o quê, quando e por quê |

\* Contagem do ambiente de produção em 31/10/2026.

### Mapa rápido

```text
usuarios 1 ── N usuarios_perfis
usuarios 1 ── N usuarios_setores N ── 1 setores
setores 1 ── N regras_classificacao
setores 1 ── N pedidos_itens
pedidos 1 ── N pedidos_itens
pedidos_itens 1 ── N apontamentos
pedidos_itens 1 ── N ocorrencias N ── 1 motivos_ocorrencia
pedidos_itens 1 ── N entregas
pedidos_itens 1 ── N entregas_previstas
apontamentos 1 ── N ocorrencias (opcional)
pedidos 1 ── N jobs_integracao
usuarios 1 ── N jobs_integracao (solicitante)
usuarios 1 ── N logs_auditoria
jobs_integracao 1 ── N logs_auditoria (eventos, vínculo lógico)
```

---

## 3. Identidade e acesso

### 3.1 `usuarios`

**Por que existe**: é a identidade da pessoa. Sem ela, não há como autenticar, autorizar, registrar autoria de execução/entrega/ocorrência nem manter histórico de quem fez o quê.

**Para que serve**:
- Login (e-mail + `senha_hash`).
- Situação (`ACTIVE`/`INACTIVE`): inativar bloqueia o acesso sem apagar o histórico.
- Autoria: `apontamentos.usuario_id`, `ocorrencias.usuario_id`, `entregas.usuario_id`, `logs_auditoria.usuario_id`, `pedidos_itens.classificado_por`.
- Vínculo com perfis e setores (N:N).

**Principais colunas**:

| Coluna | Tipo | Papel |
| --- | --- | --- |
| `id` | varchar PK | Identificador (CUID) |
| `nome` | varchar | Nome exibido |
| `email` | varchar UK | Login; único |
| `senha_hash` | varchar | Hash scrypt; nunca senha em texto |
| `situacao` | enum | `ACTIVE`/`INACTIVE` |
| `criado_em`, `atualizado_em` | datetime | Auditoria temporal |

**Relações**: 1:N com `usuarios_perfis`, `usuarios_setores`, `apontamentos`, `ocorrencias`, `entregas`, `entregas_previstas`, `jobs_integracao`, `logs_auditoria`; 1:N opcional com `pedidos_itens` (`classificado_por`).

**Onde é usada**: login, sessão, matriz de permissões, todas as telas que mostram responsáveis, auditoria.

**Sem ela**: não haveria autenticação nem autoria; o sistema não saberia quem executou, entregou ou alterou.

---

### 3.2 `usuarios_perfis`

**Por que existe**: um usuário pode ter **mais de um perfil** e um perfil pode pertencer a **vários usuários**. É uma relação N:N. Guardar isso em colunas na `usuarios` obrigaria a duplicar a linha do usuário ou usar listas sem integridade.

**Para que serve**: definir **o que a pessoa pode fazer**. A matriz de permissões (`src/modules/usuarios/permissoes.ts`) consulta os perfis para autorizar ações: executar, registrar ocorrência, definir prioridade, entregar, autorizar exceção, classificar, importar, gerenciar usuários/setores, monitorar integração, definir prazo, programar remessa e corrigir setor.

**Estrutura**: PK composta `(usuario_id, perfil)`. `perfil` é o enum `RoleCode` (`OPERATOR`, `PRODUCTION_MANAGER`, `SELLER`, `SHIPPING`, `SYSTEM_RESPONSIBLE`, `TECHNICAL_RESPONSIBLE`).

**Relações**: N:1 com `usuarios` (`ON DELETE CASCADE`).

**Onde é usada**: `autorizar()` nas rotas, menus por perfil, regras de negócio que dependem de papel (ex.: só Gerente autoriza entrega acima do disponível).

**Sem ela**: cada usuário teria um único perfil fixo, ou o perfil viraria texto solto sem integridade.

**Observação**: `usuarios_perfis` **não é a tabela de perfis**; é a associação. O catálogo de perfis é o enum. Uma tabela `perfis` separada é uma evolução possível (+1 tabela), mas não é necessária para o funcionamento atual.

---

### 3.3 `usuarios_setores`

**Por que existe**: um usuário pode atuar em **vários setores** e um setor pode ter **vários usuários**. Também é N:N. Sem ela, o Operador veria a fila de todos os setores ou precisaria de uma linha duplicada por setor.

**Para que serve**: definir **onde a pessoa atua** (escopo operacional).
- O Operador só vê a fila dos setores vinculados.
- A execução e a ocorrência validam se o usuário pertence ao setor da atividade.
- O Gerente usa o vínculo como contexto/filtro; a permissão de gestão é global.
- O Vendedor pode não ter setor (atua em todos os pedidos).

**Estrutura**: PK composta `(usuario_id, setor_id)`.

**Relações**: N:1 com `usuarios` e `setores` (`ON DELETE CASCADE`).

**Onde é usada**: `listarSetoresDoUsuario`, `usuarioPertenceAoSetor`, fila do Operador, filtros do painel.

**Sem ela**: não haveria como restringir a fila por setor nem validar que o Operador pertence ao setor da atividade.

**Exemplo real**:

| Usuário | Perfil | Setores |
| --- | --- | --- |
| Operador | `OPERATOR` | Corte e Dobra, Telhas |
| Gerente de Produção | `PRODUCTION_MANAGER` | Corte e Dobra, Revenda, Telhas |
| Vendedor | `SELLER` | — |
| Vanusa | `SELLER` | Revenda |

**Perfil ≠ setor**: perfil é **autorização**; setor é **escopo**. Um não implica o outro.

---

### 3.4 `setores`

**Por que existe**: é o cadastro dos destinos operacionais. Sem ele, o item não teria para onde ir e a fila não teria chave de agrupamento.

**Para que serve**:
- Classificar o item (`pedidos_itens.setor_id`).
- Montar a fila do Operador.
- Filtrar pedidos por setor.
- Direcionar regras de classificação (`regras_classificacao.setor_id`).
- Separar indicadores e ocorrências por setor.

**Estrutura**: `id`, `codigo` (enum `CORTE_DOBRA`, `TELHAS`, `REVENDA`), `nome`, `ativo`.

**Relações**: 1:N com `usuarios_setores`, `regras_classificacao`, `pedidos_itens`.

**Onde é usada**: classificação, fila, filtros, painel, impressão, administração de setores.

**Sem ela**: não haveria destino operacional; a fila e a classificação não existiriam.

**Observação**: o setor é inativado (`ativo=false`), não excluído. As FKs usam `RESTRICT` para impedir exclusão acidental com histórico.

---

## 4. Classificação

### 4.1 `regras_classificacao`

**Por que existe**: unifica duas necessidades que antes estavam em tabelas separadas:
- **categoria do legado → setor** (mapeamento único por categoria);
- **código/descrição do produto → setor** (sugestão por regra).

Sem ela, seria preciso manter `mapeamentos_categoria_setor` + `regras_produto_setor`, com conceitos duplicados e mais tabelas.

**Para que serve**:
- Classificar automaticamente o item quando a categoria tem mapeamento ativo.
- Sugerir setor no detalhe do pedido com base em código/descrição.
- Dar suporte à tela de setores/mapeamentos e às regras de produto.

**Estrutura**:
- `tipo_correspondencia`: `CATEGORIA`, `CODIGO_PRODUTO`, `DESCRICAO`.
- `operador`: `IGUAL`, `CONTEM`, `PREFIXO`.
- `valor`, `setor_id`, `prioridade`, `ativo`, `vigente_de`, `vigente_ate`.
- UK `(tipo_correspondencia, operador, valor)` — evita regra duplicada para o mesmo valor.

**Relações**: N:1 com `setores` (`RESTRICT`).

**Onde é usada**: `classificarPorMapeamento`, `sugerirSetor`, tela `admin/setores`, importação.

**Sem ela**: a classificação automática e a sugestão de setor não teriam fonte; o item ficaria sempre pendente.

**Exemplo**: `CATEGORIA` + `IGUAL` + `Telhas` → setor Telhas; `DESCRICAO` + `CONTEM` + `perfil` → Corte e Dobra.

---

## 5. Comercial

### 5.1 `pedidos`

**Por que existe**: é o cabeçalho do pedido importado do Top Gerente. Sem ele, os itens não teriam dono, cliente, número ou vínculo com o job de importação.

**Para que serve**:
- Guardar a identidade do pedido no legado (`chave_legado`, `numero_legado`).
- Guardar cliente e vendedor.
- Servir de âncora para itens e jobs.
- Alimentar a lista, os filtros e a previsão do pedido.

**Estrutura**: `id`, `chave_legado` (UK), `numero_legado`, `cliente_nome`, `vendedor_codigo`, `data_origem`, `sincronizado_em`, timestamps.

**Relações**: 1:N com `pedidos_itens` (`CASCADE`) e `jobs_integracao` (`SET NULL`).

**Onde é usada**: lista/detalhe de pedidos, importação, logs, indicadores.

**Sem ela**: não haveria agrupamento comercial; cada item ficaria solto.

---

### 5.2 `pedidos_itens` — o coração do sistema

**Por que existe**: é o item comercial **e** a unidade operacional. Antes existiam `pedidos_itens` + `atividades`; como a relação era sempre 1:1 (um item, um setor), a atividade foi absorvida aqui. Isso eliminou uma tabela, uma duplicação de status e a ambiguidade de “quantas atividades um item tem”.

**Para que serve**:
- Guardar o snapshot comercial: código, descrição, unidade, quantidade solicitada.
- Guardar a operação: setor de destino, situação, prioridade, prazo operacional.
- Guardar o prazo de entrega.
- Guardar a classificação: quando e por quem.
- Ser a âncora de apontamentos, ocorrências, entregas e previsões.
- Alimentar saldos, fila, painel, impressão e detalhe do pedido.

**Estrutura**:

| Coluna | Papel |
| --- | --- |
| `pedido_id` | Pedido dono (FK) |
| `chave_item_legado` | Identidade do item no legado; UK com `pedido_id` |
| `codigo_produto`, `descricao`, `categoria_legado`, `unidade` | Snapshot comercial |
| `quantidade_solicitada` | Quantidade pedida |
| `setor_id` | Setor de destino; **NULL = pendente de classificação** |
| `situacao` | `PENDING`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `DIVERGENT` |
| `prioridade` | Ordem na fila |
| `prazo_entrega` | Prazo comercial |
| `prazo_operacional` | Prazo do setor |
| `classificado_em`, `classificado_por` | Quando e quem classificou |

**Relações**:
- N:1 com `pedidos` (`CASCADE`).
- N:1 com `setores` (`RESTRICT`, nullable).
- N:1 com `usuarios` (`classificado_por`, `SET NULL`).
- 1:N com `apontamentos`, `ocorrencias`, `entregas`, `entregas_previstas`.

**Onde é usada**: praticamente todo o sistema — lista, detalhe, classificação, correção, fila, execução, ocorrência, entrega, previsão, impressão, indicadores.

**Sem ela**: não haveria item; nada operacional existiria.

**Por que não há tabela `atividades`**: a relação é 1:1. Uma tabela separada só para guardar `setor_id`, `situacao`, `prioridade` e prazos criaria um JOIN obrigatório em toda consulta e permitiria duas atividades para o mesmo item — algo que o código já proibia. A view `vw_atividades` preserva a leitura no formato antigo (`id` = item).

---

## 6. Operação

### 6.1 `apontamentos`

**Por que existe**: registrar **execução/separação parcial**. Um item pode ser produzido em várias etapas, por pessoas diferentes, em momentos diferentes. Sem ela, só haveria um total, sem histórico.

**Para que serve**:
- Somar o executado do item.
- Calcular o saldo a produzir e o disponível para entrega.
- Definir o status da atividade (`IN_PROGRESS`, `COMPLETED`, `DIVERGENT`).
- Registrar quem executou, quando, quanto e observações.
- Permitir anulação lógica (sem apagar o histórico).
- Ser a base do indicador de produção e da impressão da ordem.

**Estrutura**: `item_id`, `usuario_id`, `quantidade`, `registrado_em`, `iniciado_em`, `finalizado_em`, `observacao`, `situacao`, `chave_idempotencia` (UK), `anulado_em`, `anulado_por`, `motivo_anulacao`.

**Relações**:
- N:1 com `pedidos_itens` (`RESTRICT`).
- N:1 com `usuarios` (`RESTRICT` para executor; `SET NULL` para anulador).
- 1:N com `ocorrencias` (vínculo opcional).

**Onde é usada**: tela do Operador, status da fila, saldo, painel, ordem de produção.

**Sem ela**: não haveria como registrar produção parcial, saber quem produziu nem recalcular saldo.

**Idempotência**: a `chave_idempotencia` evita duplicar o mesmo apontamento em retry. No ETL, os registros antigos receberam `legado:execucao:<id>`.

---

### 6.2 `ocorrencias`

**Por que existe**: registrar **eventos que não são produção**: perda, refugo, indisponibilidade, pausa, parada e defeito. Eles precisam ser preservados para indicadores e para o Gerente, mas não entram no saldo como execução.

**Para que serve**:
- Registrar o tipo, a quantidade (quando houver), a duração (quando houver), o motivo e a observação.
- Mostrar o histórico na atividade e no painel do Gerente.
- Alimentar indicadores de perda/refugo/indisponibilidade.
- Permitir anulação lógica.

**Estrutura**: `item_id`, `usuario_id`, `tipo`, `quantidade`, `duracao_minutos`, `motivo_id`, `observacao`, `ocorrido_em`, `apontamento_id` (opcional), `chave_idempotencia` (UK), campos de anulação.

**Relações**:
- N:1 com `pedidos_itens` (`RESTRICT`).
- N:1 com `usuarios` (`RESTRICT`).
- N:1 com `motivos_ocorrencia` (`SET NULL`).
- N:1 com `apontamentos` (`SET NULL`, opcional).

**Onde é usada**: formulário do Operador, histórico, painel do Gerente, indicadores.

**Sem ela**: perdas e paradas não teriam registro; o painel e os indicadores ficariam cegos.

**Regra preservada**: perda/refugo/indisponibilidade exigem motivo; a quantidade é opcional; pausa/parada aceitam duração. O banco não impõe a regra mais restritiva do modelo do Marcelo para não quebrar o comportamento atual.

---

### 6.3 `motivos_ocorrencia`

**Por que existe**: é o catálogo de motivos. Sem ele, o motivo seria texto livre, difícil de padronizar e comparar.

**Para que serve**: fornecer a lista de motivos por tipo (`PERDA`, `REFUGO`, `INDISPONIBILIDADE`, `PAUSA`, `PARADA`, `DEFEITO`), com código, descrição e situação.

**Relações**: 1:N com `ocorrencias` (`SET NULL`).

**Onde é usada**: formulário de ocorrência, validação de motivo por tipo, painel.

**Sem ele**: os motivos seriam inconsistentes e não haveria como filtrar/agrupar.

---

### 6.4 `entregas`

**Por que existe**: registrar a **entrega realizada**. É diferente de previsão (remessa). Sem ela, não haveria baixa de saldo, histórico de entrega nem autorização de exceção.

**Para que serve**:
- Registrar quantidade, data, responsável.
- Calcular o disponível (`executado − entregue`).
- Registrar exceção acima do disponível, com motivo e autorizador.
- Guardar o disponível antes da exceção.
- Permitir anulação lógica.
- Alimentar o histórico de entregas e o status do item.

**Estrutura**: `item_id`, `usuario_id`, `quantidade`, `excecao_autorizada`, `motivo_excecao`, `autorizado_por`, `disponivel_antes`, `entregue_em`, `chave_idempotencia` (UK), campos de anulação.

**Relações**:
- N:1 com `pedidos_itens` (`CASCADE`).
- N:1 com `usuarios` (registro `RESTRICT`, autorizador `RESTRICT`, anulador `SET NULL`).

**Onde é usada**: Expedição, Gerente, histórico de entregas, saldo, detalhe do pedido.

**Sem ela**: não haveria entrega, saldo disponível nem histórico.

**Observação**: `entregas` ainda usa `ON DELETE CASCADE` no item, por compatibilidade com o schema antigo. O app não exclui itens; se quiser padronizar a proteção de histórico, o ideal é migrar para `RESTRICT` em uma fase futura.

---

### 6.5 `entregas_previstas`

**Por que existe**: registrar a **previsão/remessa**, que é diferente da entrega realizada. O item pode ter várias previsões (1ª, 2ª, 3ª remessa), com data e confirmação. Sem ela, só haveria uma data no item e não haveria histórico de programação.

**Para que serve**:
- Programar entregas futuras por item.
- Numerar as remessas.
- Registrar quem criou, quem confirmou e quando.
- Permitir anulação com motivo.
- Alimentar o detalhe do pedido e a Expedição.

**Estrutura**: `item_id`, `numero_remessa`, `data_prevista`, `quantidade_prevista`, `confirmada_em`, `confirmada_por`, `criado_por`, `observacao`, `anulada_em`, `anulada_por`, `motivo_anulacao`.

**Relações**:
- N:1 com `pedidos_itens` (`CASCADE`).
- N:1 com `usuarios` (criador/confirmador/anulador, `SET NULL`).

**Onde é usada**: detalhe do pedido, Expedição, programação de remessas.

**Sem ela**: não haveria múltiplas previsões nem histórico de confirmação; a remessa viraria um campo único no item.

**Previsto ≠ realizado**: `entregas_previstas` não baixa saldo e não cria `entregas`. A confirmação é uma informação de programação, não uma entrega.

---

## 7. Integração e auditoria

### 7.1 `jobs_integracao`

**Por que existe**: a importação do Top Gerente é assíncrona. O job registra a solicitação, o despacho, as tentativas, o erro e o pedido resultante. Sem ele, a importação não teria idempotência, retry nem diagnóstico.

**Para que serve**:
- Controlar a importação por número de pedido.
- Evitar jobs duplicados (`chave_idempotencia` UK).
- Registrar tentativas, erro e conclusão.
- Guardar o solicitante.
- Servir à tela do Técnico.

**Estrutura**: `pedido_id`, `numero_legado`, `empresa_origem`, `chave_idempotencia` (UK), `situacao`, `tentativas`, `erro_codigo`, `erro_mensagem`, `solicitado_por`, timestamps.

**Relações**:
- N:1 com `pedidos` (`SET NULL`).
- N:1 com `usuarios` (`solicitado_por`, `SET NULL`).
- 1:N lógico com `logs_auditoria` (eventos).

**Onde é usada**: importação, callback, retry, tela do Técnico.

**Sem ela**: a importação não teria controle de estado nem histórico de tentativas.

---

### 7.2 `logs_auditoria`

**Por que existe**: registrar **quem alterou o quê, quando, por quê e com quais valores**. É a fonte do histórico de prazos, da correção de setor, da exceção de entrega, da solicitação de importação e dos eventos de job.

**Para que serve**:
- Histórico de prazos (`DEADLINE_CHANGED`).
- Correção de setor (`SECTOR_CORRECTION`).
- Exceção de entrega (`DELIVERY_MANAGER_OVERRIDE`).
- Solicitação de importação (`IMPORT_REQUESTED`).
- Eventos de job (`DESPACHADO`, `RETRY`, `FAILED`, `STALE_TIMEOUT` etc.).
- Auditoria geral de alterações.

**Estrutura**: `usuario_id`, `acao`, `entidade_tipo`, `entidade_id`, `antes_json`, `depois_json`, `motivo`, `correlacao_id`, `criado_em`.

**Relações**:
- N:1 com `usuarios` (`SET NULL`).
- **Sem FK polimórfica**: `entidade_tipo` + `entidade_id` apontam logicamente para tabelas diferentes. Não é possível ter uma FK única para várias tabelas.
- Eventos de job: `entidade_tipo='JobIntegracao'`, `entidade_id=job_id`; a view `vw_eventos_job_integracao` lê esses registros.

**Onde é usada**: histórico de prazos, correção de setor, tela do Técnico, auditoria.

**Sem ela**: não haveria histórico de alterações; o sistema saberia o estado atual, mas não como chegou nele.

**Por que absorveu `eventos_job_integracao`**: evento de job é um evento de auditoria. Manter uma tabela separada só para isso aumentaria o número de tabelas sem ganho de clareza. A view preserva a leitura da linha do tempo.

---

## 8. Todas as relações (matriz de FKs)

| # | Origem | Coluna | Destino | Cardinalidade | Obrigatória? | `ON DELETE` | Por quê |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `usuarios_perfis` | `usuario_id` | `usuarios.id` | N:1 | Sim | CASCADE | Vínculo não existe sem usuário |
| 2 | `usuarios_setores` | `usuario_id` | `usuarios.id` | N:1 | Sim | CASCADE | Vínculo não existe sem usuário |
| 3 | `usuarios_setores` | `setor_id` | `setores.id` | N:1 | Sim | CASCADE | Vínculo não existe sem setor |
| 4 | `regras_classificacao` | `setor_id` | `setores.id` | N:1 | Sim | RESTRICT | Setor com regra não deve ser excluído |
| 5 | `pedidos_itens` | `pedido_id` | `pedidos.id` | N:1 | Sim | CASCADE | Item não existe sem pedido |
| 6 | `pedidos_itens` | `setor_id` | `setores.id` | N:1 | Não | RESTRICT | Item pode estar pendente; setor com item não deve ser excluído |
| 7 | `pedidos_itens` | `classificado_por` | `usuarios.id` | N:1 | Não | SET NULL | Autor pode ser preservado mesmo se o usuário sumir |
| 8 | `apontamentos` | `item_id` | `pedidos_itens.id` | N:1 | Sim | RESTRICT | Apontamento é histórico; não pode perder o item |
| 9 | `apontamentos` | `usuario_id` | `usuarios.id` | N:1 | Sim | RESTRICT | Histórico exige executor |
| 10 | `apontamentos` | `anulado_por` | `usuarios.id` | N:1 | Não | SET NULL | Autor da anulação é opcional |
| 11 | `ocorrencias` | `item_id` | `pedidos_itens.id` | N:1 | Sim | RESTRICT | Ocorrência é histórico do item |
| 12 | `ocorrencias` | `usuario_id` | `usuarios.id` | N:1 | Sim | RESTRICT | Histórico exige responsável |
| 13 | `ocorrencias` | `motivo_id` | `motivos_ocorrencia.id` | N:1 | Não | SET NULL | Motivo pode ser desativado/removido |
| 14 | `ocorrencias` | `apontamento_id` | `apontamentos.id` | N:1 | Não | SET NULL | Vínculo opcional com execução |
| 15 | `ocorrencias` | `anulado_por` | `usuarios.id` | N:1 | Não | SET NULL | Autor da anulação é opcional |
| 16 | `entregas` | `item_id` | `pedidos_itens.id` | N:1 | Sim | CASCADE | Entrega pertence ao item |
| 17 | `entregas` | `usuario_id` | `usuarios.id` | N:1 | Sim | RESTRICT | Histórico exige responsável |
| 18 | `entregas` | `autorizado_por` | `usuarios.id` | N:1 | Não | RESTRICT | Exceção exige autorizador |
| 19 | `entregas` | `anulado_por` | `usuarios.id` | N:1 | Não | SET NULL | Autor da anulação é opcional |
| 20 | `entregas_previstas` | `item_id` | `pedidos_itens.id` | N:1 | Sim | CASCADE | Previsão pertence ao item |
| 21 | `entregas_previstas` | `criado_por` | `usuarios.id` | N:1 | Não | SET NULL | Autor da previsão é opcional |
| 22 | `entregas_previstas` | `confirmada_por` | `usuarios.id` | N:1 | Não | SET NULL | Autor da confirmação é opcional |
| 23 | `entregas_previstas` | `anulada_por` | `usuarios.id` | N:1 | Não | SET NULL | Autor da anulação é opcional |
| 24 | `jobs_integracao` | `pedido_id` | `pedidos.id` | N:1 | Não | SET NULL | Job pode falhar antes de criar pedido |
| 25 | `jobs_integracao` | `solicitado_por` | `usuarios.id` | N:1 | Não | SET NULL | Job antigo pode não ter solicitante |
| 26 | `logs_auditoria` | `usuario_id` | `usuarios.id` | N:1 | Não | SET NULL | Ação de sistema pode não ter usuário |

**Relações lógicas sem FK**:

| Origem | Destino | Como funciona | Por que não tem FK |
| --- | --- | --- | --- |
| `logs_auditoria` | qualquer entidade | `entidade_tipo` + `entidade_id` | Polimórfica; uma FK única não cobre várias tabelas |
| `logs_auditoria` (eventos) | `jobs_integracao` | `entidade_tipo='JobIntegracao'`, `entidade_id=id_job` | Evento é auditoria; a view faz a leitura |
| `entregas` | `entregas_previstas` | Não há vínculo direto | Previsão ≠ realização; a entrega não é “filha” da remessa |

---

## 9. Relações detalhadas

### 9.1 Usuário × perfil (N:N)

- **Tabela de ligação**: `usuarios_perfis`.
- **Chave**: `(usuario_id, perfil)`.
- **Por que N:N**: um usuário pode ser Gerente e Vendedor; um perfil é compartilhado por vários usuários.
- **Uso**: matriz de permissões, menus, autorização de rotas.
- **Exemplo**: `operador@3e.local` tem `OPERATOR`; `gerente@3e.local` tem `PRODUCTION_MANAGER`.

### 9.2 Usuário × setor (N:N)

- **Tabela de ligação**: `usuarios_setores`.
- **Chave**: `(usuario_id, setor_id)`.
- **Por que N:N**: um Operador pode atuar em Corte e Dobra e Telhas; um setor tem vários operadores.
- **Uso**: fila do Operador, validação de setor na execução/ocorrência, filtros.
- **Exemplo**: Operador vinculado a Corte e Dobra e Telhas; Vendedor sem setor.

### 9.3 Setor × regra de classificação (1:N)

- **FK**: `regras_classificacao.setor_id`.
- **Por que 1:N**: um setor tem várias regras (categoria, código, descrição); cada regra aponta para um setor.
- **Uso**: classificação automática e sugestão.
- **Exemplo**: categoria `Telhas` → Telhas; descrição contém `perfil` → Corte e Dobra.

### 9.4 Pedido × item (1:N)

- **FK**: `pedidos_itens.pedido_id`.
- **Por que 1:N**: um pedido tem vários itens; cada item pertence a um pedido.
- **Uso**: lista, detalhe, importação.
- **Exclusão**: `CASCADE` — se o pedido for excluído, os itens vão junto (o app não exclui pedidos).

### 9.5 Setor × item (1:N, opcional)

- **FK**: `pedidos_itens.setor_id` (nullable).
- **Por que 1:N**: um setor tem vários itens; cada item tem **um** setor de destino.
- **Por que nullable**: o item nasce pendente de classificação; `NULL` = pendente.
- **Uso**: fila, classificação, filtros, saldo por setor.
- **Exclusão**: `RESTRICT` — setor com itens não deve ser excluído.

### 9.6 Usuário × item classificado (1:N, opcional)

- **FK**: `pedidos_itens.classificado_por`.
- **Por que 1:N**: um usuário classifica vários itens; cada item tem um autor de classificação.
- **Por que nullable**: itens antigos/migrados podem não ter autor; a classificação automática pode não ter usuário.
- **Uso**: auditoria e rastreabilidade.
- **Exclusão**: `SET NULL` — preserva o item.

### 9.7 Item × apontamento (1:N)

- **FK**: `apontamentos.item_id`.
- **Por que 1:N**: um item pode ter várias execuções parciais; cada apontamento pertence a um item.
- **Uso**: saldo, status, histórico, ordem de produção.
- **Exclusão**: `RESTRICT` — apontamento é histórico; o item não pode ser excluído enquanto houver apontamento.

### 9.8 Item × ocorrência (1:N)

- **FK**: `ocorrencias.item_id`.
- **Por que 1:N**: um item pode ter várias ocorrências; cada ocorrência pertence a um item.
- **Uso**: histórico, painel, indicadores.
- **Exclusão**: `RESTRICT`.

### 9.9 Item × entrega (1:N)

- **FK**: `entregas.item_id`.
- **Por que 1:N**: um item pode ter várias entregas parciais; cada entrega pertence a um item.
- **Uso**: saldo disponível, histórico, status.
- **Exclusão**: `CASCADE` (compatibilidade com o schema antigo; ver observação 6.4).

### 9.10 Item × previsão (1:N)

- **FK**: `entregas_previstas.item_id`.
- **Por que 1:N**: um item pode ter várias remessas; cada previsão pertence a um item.
- **Uso**: programação, confirmação, histórico.
- **Exclusão**: `CASCADE`.

### 9.11 Apontamento × ocorrência (1:N, opcional)

- **FK**: `ocorrencias.apontamento_id` (nullable).
- **Por que 1:N**: uma execução pode ter ocorrências vinculadas (ex.: perda durante a execução); a ocorrência pode existir sem vínculo.
- **Uso**: rastreabilidade.
- **Exclusão**: `SET NULL`.

### 9.12 Motivo × ocorrência (1:N)

- **FK**: `ocorrencias.motivo_id`.
- **Por que 1:N**: um motivo pode ser usado em várias ocorrências; cada ocorrência tem no máximo um motivo.
- **Uso**: formulário, validação, painel.
- **Exclusão**: `SET NULL`.

### 9.13 Usuário × apontamento (1:N)

- **FK**: `apontamentos.usuario_id` (executor) e `anulado_por` (anulador).
- **Por que 1:N**: um usuário executa vários apontamentos; cada apontamento tem um executor.
- **Uso**: histórico, indicadores, auditoria.
- **Exclusão**: `RESTRICT` para executor; `SET NULL` para anulador.

### 9.14 Usuário × entrega (1:N)

- **FK**: `entregas.usuario_id` (registro), `autorizado_por` (exceção), `anulado_por`.
- **Por que 1:N**: um usuário registra várias entregas; cada entrega tem um responsável.
- **Uso**: histórico, exceção, auditoria.
- **Exclusão**: `RESTRICT` para registro/autorizador; `SET NULL` para anulador.

### 9.15 Usuário × previsão (1:N)

- **FK**: `entregas_previstas.criado_por`, `confirmada_por`, `anulada_por`.
- **Por que 1:N**: um usuário cria/confirma/anula várias previsões.
- **Uso**: rastreabilidade da remessa.
- **Exclusão**: `SET NULL`.

### 9.16 Pedido × job (1:N)

- **FK**: `jobs_integracao.pedido_id` (nullable).
- **Por que 1:N**: um pedido pode ter vários jobs (tentativas/reimportações); cada job aponta para o pedido quando existir.
- **Por que nullable**: o job pode falhar antes de criar o pedido.
- **Uso**: importação, retry, tela do Técnico.
- **Exclusão**: `SET NULL`.

### 9.17 Usuário × job (1:N)

- **FK**: `jobs_integracao.solicitado_por` (nullable).
- **Por que 1:N**: um usuário solicita vários jobs; cada job tem um solicitante.
- **Por que nullable**: jobs antigos/migrados podem não ter solicitante.
- **Uso**: auditoria da importação.
- **Exclusão**: `SET NULL`.

### 9.18 Usuário × auditoria (1:N)

- **FK**: `logs_auditoria.usuario_id` (nullable).
- **Por que 1:N**: um usuário gera vários logs; cada log tem um autor (ou nenhum, em ação de sistema).
- **Uso**: histórico de prazos, correções, exceções, importação.
- **Exclusão**: `SET NULL`.

### 9.19 Job × evento de auditoria (1:N lógico)

- **Vínculo**: `logs_auditoria.entidade_tipo='JobIntegracao'` + `entidade_id=jobs_integracao.id`.
- **Por que 1:N**: um job tem vários eventos (despacho, retry, falha, conclusão).
- **Uso**: linha do tempo do Técnico; view `vw_eventos_job_integracao`.
- **Sem FK**: a auditoria é polimórfica; o vínculo é lógico.

---

## 10. Relações que não existem de propósito

| Ausência | Por quê |
| --- | --- |
| `atividades` | A relação item × setor é 1:1; a operação foi absorvida em `pedidos_itens`. Uma tabela separada criaria JOIN obrigatório e permitiria duplicidade. |
| `perfis` | O catálogo de perfis é o enum `RoleCode`; `usuarios_perfis` já normaliza o N:N. Uma tabela `perfis` é opcional (+1 tabela). |
| `produto` | O item guarda código/descrição do legado; não há cadastro local de produto nesta etapa. |
| `unidade_medida` | A unidade é texto validado pela aplicação; um catálogo é opcional (+1 tabela). |
| `divergencia` | As divergências atuais são registradas em `logs_auditoria` (`UNIT_DIVERGENCE`, `QUANTITY_DIVERGENCE`); uma tabela dedicada é opcional. |
| FK polimórfica em `logs_auditoria` | Uma FK única não pode apontar para tabelas diferentes; `entidade_tipo` + `entidade_id` é o padrão. |
| FK de `entregas` para `entregas_previstas` | Previsão e realização são fatos independentes; a entrega não é filha da remessa. |
| Tabela de eventos de job | Evento de job é auditoria; `logs_auditoria` + view evita uma tabela extra. |

---

## 11. Views

| View | Tabelas de origem | Para que serve |
| --- | --- | --- |
| `vw_atividades` | `pedidos_itens` | Compatibilidade: expõe a “atividade” com `id` = item |
| `vw_item_saldos` | `pedidos_itens`, `apontamentos`, `entregas`, `setores` | Solicitado, executado, entregue, disponível e pendente por item |
| `vw_fila_setor` | `pedidos_itens`, `pedidos`, `setores` | Fila por setor, sem itens concluídos |
| `vw_pedido_resumo` | `pedidos`, `pedidos_itens` | Contagens por pedido, sem somar unidades diferentes |
| `vw_eventos_job_integracao` | `logs_auditoria` | Linha do tempo do job a partir da auditoria |

As views são **somente leitura**. Elas não substituem as tabelas; apenas facilitam consultas e relatórios.

---

## 12. Enums e códigos

| Enum | Valores | Onde é usado |
| --- | --- | --- |
| `UserStatus` | `ACTIVE`, `INACTIVE` | `usuarios.situacao` |
| `RoleCode` | `OPERATOR`, `PRODUCTION_MANAGER`, `SELLER`, `SHIPPING`, `SYSTEM_RESPONSIBLE`, `TECHNICAL_RESPONSIBLE` | `usuarios_perfis.perfil` |
| `SectorCode` | `CORTE_DOBRA`, `TELHAS`, `REVENDA` | `setores.codigo` |
| `ActivityStatus` | `PENDING`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `DIVERGENT` | `pedidos_itens.situacao` |
| `IntegrationJobStatus` | `PENDING`, `DISPATCHED`, `RUNNING`, `SUCCEEDED`, `FAILED` | `jobs_integracao.situacao` |

Os **nomes físicos** são em português; os **valores** continuam em inglês para preservar a aplicação, a matriz de permissões e os contratos das APIs. A interface traduz os rótulos.

---

## 13. Consultas de exemplo

### Quem é o usuário, o que pode fazer e onde atua

```sql
SELECT u.nome, u.email,
       GROUP_CONCAT(DISTINCT up.perfil ORDER BY up.perfil) AS perfis,
       GROUP_CONCAT(DISTINCT s.nome ORDER BY s.nome) AS setores
FROM usuarios u
LEFT JOIN usuarios_perfis up ON up.usuario_id = u.id
LEFT JOIN usuarios_setores us ON us.usuario_id = u.id
LEFT JOIN setores s ON s.id = us.setor_id
WHERE u.id = ?
GROUP BY u.id;
```

### Fila de um setor

```sql
SELECT item_id, numero_legado, descricao, unidade,
       quantidade_solicitada, situacao, prioridade, prazo_operacional
FROM vw_fila_setor
WHERE setor_codigo = 'TELHAS'
ORDER BY prioridade DESC, criado_em ASC;
```

### Saldo de um item

```sql
SELECT descricao, unidade, quantidade_solicitada,
       quantidade_executada, quantidade_entregue,
       disponivel_entrega, saldo_executar, saldo_entregar
FROM vw_item_saldos
WHERE item_id = ?;
```

### Histórico de entregas de um item

```sql
SELECT e.entregue_em, e.quantidade, u.nome AS responsavel,
       e.excecao_autorizada, e.motivo_excecao
FROM entregas e
JOIN usuarios u ON u.id = e.usuario_id
WHERE e.item_id = ? AND e.anulado_em IS NULL
ORDER BY e.entregue_em DESC;
```

### Histórico de prazos

```sql
SELECT l.criado_em, u.nome AS autor,
       l.antes_json, l.depois_json, l.motivo
FROM logs_auditoria l
LEFT JOIN usuarios u ON u.id = l.usuario_id
WHERE l.entidade_tipo = 'OrderItem'
  AND l.entidade_id = ?
  AND l.acao = 'DEADLINE_CHANGED'
ORDER BY l.criado_em DESC;
```

### Linha do tempo de um job

```sql
SELECT criado_em, tipo, detalhe
FROM vw_eventos_job_integracao
WHERE job_id = ?
ORDER BY criado_em ASC;
```

### Itens pendentes de classificação

```sql
SELECT id, descricao, quantidade_solicitada
FROM pedidos_itens
WHERE setor_id IS NULL
ORDER BY criado_em ASC;
```

---

## 14. Integridade e exclusão

- **`RESTRICT`** é usado onde o histórico não pode perder o pai: item com apontamento/ocorrência, setor com item/regra.
- **`CASCADE`** é usado em vínculos que não fazem sentido sozinhos: item do pedido, vínculo usuário-perfil/setor, entrega/previsão do item.
- **`SET NULL`** é usado em autoria/opcionalidade: `classificado_por`, `autorizado_por`, `anulado_por`, `solicitado_por`, `usuario_id` da auditoria.
- **Usuários e setores não são excluídos**: são inativados. As regras de exclusão são proteção contra operações indevidas.
- **Exclusão de pedido**: cascateia itens e, por consequência, entregas/previsões; apontamentos/ocorrências com `RESTRICT` impedem a exclusão se houver histórico. Na prática, o app não exclui pedidos.
- **Exclusão de item**: `apontamentos`/`ocorrencias` usam `RESTRICT`; `entregas`/`entregas_previstas` usam `CASCADE`. Se quiser proteção total, a recomendação futura é mudar `entregas` para `RESTRICT`.

---

## 15. Checklist para evoluir o banco

Ao criar uma tabela:
1. Definir PK (CUID ou BIGINT, conforme a decisão).
2. Definir FKs e a regra de exclusão (`RESTRICT` para histórico, `CASCADE` para dependência, `SET NULL` para autoria).
3. Adicionar UKs que representem a identidade real (ex.: `pedido_id + chave_item_legado`).
4. Criar índices para as consultas reais (setor/situação/prioridade, item/data).
5. Mapear no Prisma com `@@map`/`@map` (nomes físicos em português).
6. Atualizar o ETL (`scripts/etl-banco-pt.mjs`) se houver dados antigos.
7. Atualizar views, testes, diagramas e este documento.

Ao criar uma coluna:
1. Preferir `NULL` ou default para não quebrar dados existentes.
2. Fazer backfill antes de tornar `NOT NULL`.
3. Mapear com `@map`.
4. Atualizar o ETL e os testes de contrato.

Ao mudar uma relação:
1. Verificar o impacto no domínio e nos adaptadores.
2. Atualizar a view correspondente.
3. Rodar a suíte e o ETL em cópia.
4. Atualizar DER/MER/classes.

---

## 16. Glossário

| Termo | Significado |
| --- | --- |
| **Entidade** | Conceito do domínio (pedido, item, usuário). |
| **Tabela** | Representação física da entidade. |
| **PK** | Chave primária. |
| **FK** | Chave estrangeira. |
| **UK** | Chave única. |
| **N:N** | Relação muitos-para-muitos, implementada por tabela de associação. |
| **Cardinalidade** | Quantidade de registros que podem se relacionar (1, N, 0..1). |
| **Soft delete** | Anulação lógica (`anulado_em`) em vez de exclusão física. |
| **Idempotência** | Repetir a mesma operação sem duplicar o efeito (`chave_idempotencia`). |
| **View** | Consulta salva, somente leitura. |
| **Enum** | Lista fechada de valores. |
| **ETL** | Extração, transformação e carga dos dados antigos para o banco novo. |

---

**Resumo em uma frase**: `usuarios` diz **quem**; `usuarios_perfis` diz **o que pode**; `usuarios_setores` diz **onde atua**; `pedidos`/`pedidos_itens` dizem **o que foi vendido**; `apontamentos`/`ocorrencias` dizem **o que aconteceu na produção**; `entregas`/`entregas_previstas` dizem **o que foi e o que será entregue**; `jobs_integracao`/`logs_auditoria` dizem **como o dado chegou e quem o alterou**.
