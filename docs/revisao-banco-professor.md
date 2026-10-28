# Revisão do banco de dados — apontamentos do professor

**Data**: 27/10/2026
**Escopo**: diagnóstico do modelo atual e plano de migração. **Nenhuma alteração destrutiva foi executada nesta rodada.**
**Motivo**: o professor sugeriu desenhar o banco manualmente, gerar o SQL e só depois levar para a ferramenta de código. As correções de interface foram feitas imediatamente; a reestruturação do banco exige uma migração dedicada.

---

## 1. Resumo executivo

O banco atual funciona, mas mistura **nomes em português e inglês**, usa **IDs CUID (string)** em todas as tabelas, mantém **remessas em tabela própria**, tem uma tabela de **execuções** que não responde às perguntas operacionais e não tem **histórico de prazos** (este último foi resolvido usando a auditoria existente).

| Decisão necessária | Opções | Recomendação |
| --- | --- | --- |
| Idioma dos nomes físicos | tudo em português / tudo em inglês | **Português**, pois as tabelas já estão em português e a interface/regras são PT-BR. Colunas e enums passam a português. |
| Tipo de ID | CUID string / BIGINT auto-incremento | **BIGINT** (`BIGINT UNSIGNED AUTO_INCREMENT`) em todas as tabelas; FKs do mesmo tipo. |
| Perfis | enum `RoleCode` + `usuarios_perfis` / tabela `perfis` | Tabela **`perfis`** (`id`, `codigo`, `nome`) + **`usuarios_perfis`** (N:N). |
| Remessas | tabela `remessas_programadas` / datas no item | **Remover a tabela** e usar `pedidos_itens.previsao_entrega` + `entregas` (realizado). Se houver várias previsões por item, criar `entregas_previstas` com data/quantidade. |
| Execução | `execucoes` (quantidade + data) / apontamento com início/fim | **`apontamentos`** com início, fim, quantidade, status, usuário, atividade e observação. |
| Exceção de entrega | `managerOverride` booleano | Renomear para **`excecao_autorizada`**, com `motivo_excecao`, `autorizado_por` e data da autorização. |

> Enquanto a migração não for aprovada, o sistema continua no modelo atual. A correção de UI **não** depende dela, exceto o histórico de prazos, que usa a tabela `logs_auditoria` já existente.

---

## 2. Diagnóstico por item

### 2.1 Nomes mistos (português × inglês)

- Tabelas: `pedidos`, `pedidos_itens`, `atividades`, `execucoes`, `entregas`, `ocorrencias`, `setores`, `usuarios`, `logs_auditoria`…
- Colunas: `orderId`, `sectorId`, `deadlineAt`, `classificationStatus`, `requestedQuantity`, `managerOverride`…
- Enums: `RoleCode`, `ActivityStatus`, `IntegrationJobStatus`.

**Problema**: quem abre o banco vê dois idiomas. **Recomendação**: padronizar tudo em **português** (tabelas, colunas, enums, índices). Exemplos:

| Hoje | Proposto |
| --- | --- |
| `pedidos_itens.orderId` | `pedidos_itens.pedido_id` |
| `pedidos_itens.legacyItemKey` | `pedidos_itens.chave_item_legado` |
| `atividades.sectorId` | `atividades.setor_id` |
| `atividades.deadlineAt` | `atividades.prazo_operacional` |
| `execucoes.quantity` | `apontamentos.quantidade` |
| `entregas.managerOverride` | `entregas.excecao_autorizada` |
| `RoleCode` | `PerfilCodigo` |

### 2.2 ID string (CUID)

- Todas as PKs/FKs são `VARCHAR`/CUID.
- URLs, APIs e testes usam string; a troca para inteiro afeta **contratos**, links, logs e testes.

**Recomendação**: `BIGINT UNSIGNED AUTO_INCREMENT` em todas as tabelas; FKs `BIGINT UNSIGNED`; remover `cuid()` do Prisma; atualizar DTOs, rotas e testes. Fazer em uma branch de migração, com ETL e comparação de contagens/somas.

### 2.3 `role` / `perfil`

- Hoje: `RoleCode` é enum e `usuarios_perfis` guarda `(usuarioId, role)`.
- O professor aponta que o correto é existir uma **tabela `perfil`**.

**Proposta**:
```sql
CREATE TABLE perfis (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE, -- OPERADOR, GERENTE, VENDEDOR...
  nome VARCHAR(80) NOT NULL
);

CREATE TABLE usuarios_perfis (
  usuario_id BIGINT UNSIGNED NOT NULL,
  perfil_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (usuario_id, perfil_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (perfil_id) REFERENCES perfis(id)
);
```
Os códigos podem ser mantidos iguais aos enums atuais para facilitar o código (`PERFIL.OPERADOR` etc.).

### 2.4 Relacionamento Usuário × Execução × Atividade

- Hoje: `execucoes(activityId, userId, quantity, occurredAt)`.
- Não responde: quando começou/terminou, quanto tempo durou, quem pausou, por que, qual o status do apontamento, se houve retrabalho.

**Proposta**: `apontamentos`:
```sql
CREATE TABLE apontamentos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  atividade_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  quantidade DECIMAL(18,3) NOT NULL,
  iniciado_em DATETIME NOT NULL,
  finalizado_em DATETIME NULL,
  status ENUM('EM_ANDAMENTO','PAUSADO','CONCLUIDO','CANCELADO') NOT NULL,
  observacao TEXT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (atividade_id) REFERENCES atividades(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
```
A atividade continua ligada ao item/setor. O apontamento é o registro de trabalho (quem, quando, quanto, por quanto tempo).

### 2.5 `entregas` e `managerOverride`

- `managerOverride` é um booleano; o nome não explica a regra.
- `authorizedByUserId`, `overrideReason`, `availableBefore` já existem, mas o nome mistura inglês e não deixa claro o fluxo.

**Proposta**: `excecao_autorizada` (boolean), `motivo_excecao`, `autorizado_por_id`, `disponivel_antes`, `ocorrido_em`. A regra: entrega acima do disponível só com autorização de gerente e motivo; a entrega é registrada e o saldo recalculado.

### 2.6 `regra_produto_setor`

- Nome e modelo confusos: `matchType`, `matchValue`, `sectorId`, `priority`.
- Não fica claro se a regra é por código, descrição ou categoria, nem a vigência.

**Proposta**: `regras_classificacao`:
```sql
CREATE TABLE regras_classificacao (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo_correspondencia ENUM('CODIGO','DESCRICAO','CATEGORIA') NOT NULL,
  valor VARCHAR(160) NOT NULL,
  setor_id BIGINT UNSIGNED NOT NULL,
  prioridade INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  vigente_de DATE NULL,
  vigente_ate DATE NULL,
  FOREIGN KEY (setor_id) REFERENCES setores(id)
);
```
Documentar exemplos reais (ex.: categoria `TELHA_TERMOACUSTICA` → Telhas; código `TR-980` → Telhas) e a ordem de avaliação (prioridade, depois especificidade).

### 2.7 `remessas_programadas`

- Hoje: tabela própria com `remessa` (1ª, 2ª…), `scheduledAt`, `confirmedAt`.
- O professor: **não precisa existir**; a data prevista pode estar no item/pedido e as entregas reais em `entregas`; um `SELECT` por data nos itens basta para saber o que está previsto.

**Proposta**:
- `pedidos_itens.previsao_entrega DATE NULL` (a previsão atual).
- `entregas` para o realizado (data, quantidade, autorização).
- Se o negócio exigir **várias previsões por item**, criar `entregas_previstas` (`item_id`, `data_prevista`, `quantidade_prevista`, `numero` automático, `confirmada_em`), sem a tabela `remessas_programadas` com nome/estrutura atuais.
- Na interface, a “remessa” passa a ser uma **previsão de entrega** com número automático; a expedição confirma a entrega real.

**Impacto**: remove a tabela, o repositório Prisma de remessas e o fluxo de confirmação/remoção atual; exige migração de dados e ajuste do detalhe do pedido, expedição e indicadores.

### 2.8 `execucoes` não responde às perguntas

Além do modelo de apontamento acima, a tabela atual não guarda:
- início/fim e duração;
- pausas/paradas;
- motivo de refugo/perda (isso está em `ocorrencias`, mas sem vínculo com o apontamento);
- quem iniciou e quem finalizou;
- retrabalho.

**Proposta**: `apontamentos` + vínculo opcional `ocorrencia_id`; regras de soma (executado = soma dos apontamentos concluídos) e de status.

### 2.9 Especificação das regras de negócio

Faltam detalhes explícitos para:
- composição do status do pedido/item/atividade;
- quando uma atividade pode ser concluída;
- efeito de perda/refugo/indisponibilidade no saldo;
- autorização de entrega acima do disponível;
- previsão de entrega e confirmação;
- arredondamento de unidades (metro 2 casas, peça inteira);
- cancelamento lógico de item;
- quem pode alterar prazo e como o histórico é auditado.

**Ação**: transformar `docs/regras-negocio.md` e as specs em tabelas de regra (ID, condição, efeito, exceções, exemplo) e manter um teste de contrato por regra.

---

## 3. Modelo-alvo sugerido (nomes em português)

```text
perfis
usuarios ──< usuarios_perfis >── perfis
usuarios ──< usuarios_setores >── setores
pedidos ──< pedidos_itens ──< atividades ──< apontamentos
pedidos_itens ──< entregas
pedidos_itens ──< ocorrencias >── motivos_ocorrencia
pedidos_itens ──< entregas_previstas (se necessário)
setores ──< regras_classificacao
logs_auditoria (genérica, tipada por ação/entidade)
jobs_integracao ──< eventos_job_integracao
```
- IDs `BIGINT UNSIGNED AUTO_INCREMENT`.
- Datas em UTC no banco, exibição em `America/Sao_Paulo`.
- Quantidades `DECIMAL(18,3)`; exibição com vírgula.
- `logs_auditoria` com índices por `(entidade, entidade_id, criado_em)` e ações tipadas (`PRAZO_ALTERADO`, `EXCECAO_AUTORIZADA`, `REMESSA_CRIADA`…).

---

## 4. Plano de migração (quando aprovado)

1. **Congelar** a estrutura atual e criar branch `migracao-banco-v2`.
2. **Desenhar** o modelo no DBeaver/dbdiagram e gerar o SQL (sugestão do professor).
3. Criar as tabelas novas em paralelo, com nomes em português e IDs inteiros.
4. **ETL**: copiar dados, mapear enums → `perfis`, CUID → BIGINT (tabela de correspondência), remessas → previsões/entregas, execuções → apontamentos.
5. Validar contagens, somas de quantidade, FKs órfãs e amostras por pedido.
6. Atualizar `schema.prisma`, repositórios, DTOs, rotas, URLs e testes em uma branch; rodar contrato e integração MySQL.
7. **Dual-read** (comparar consultas antigas/novas) e depois **cutover** com backup.
8. Atualizar specs, MER/DER, `docs/banco-de-dados.md` e o runbook de rollback.

**Riscos**: URLs/links com CUID, logs históricos, jobs de integração, dados de produção. A migração não deve ser feita junto com correções de UI.

---

## 5. O que foi feito agora (sem migração)

- Histórico de prazos usando `logs_auditoria` (`DEADLINE_CHANGED`, antes/depois, usuário, data). **Sem nova tabela.**
- Datas de previsão expostas na lista, no detalhe, no operador, na expedição e na impressão.
- Quantidades no padrão brasileiro (vírgula) e percentuais com 1 casa decimal.
- Remessa com número automático; Vendedor sem ações de remessa (leitura apenas); API nega 403.
- Tela de setores com explicação do mapeamento e lista dos mapeamentos cadastrados.
- Tela de usuários explica por que a inativação substitui a exclusão (preserva histórico).

> A reestruturação (IDs inteiros, `perfis`, remoção de `remessas_programadas`, `apontamentos`) **não foi executada** porque muda contratos e dados. Precisa de aprovação e de uma janela de migração.
