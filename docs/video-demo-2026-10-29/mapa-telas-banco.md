# Mapa tela → banco — 3E Operações

Banco de demonstração: `3e_operacoes_demo` (MySQL 8.4). Todas as consultas foram executadas de fato; os resultados aparecem no capítulo de banco.

| Tela / funcionalidade | Tabelas principais | Colunas e regras |
| --- | --- | --- |
| Login e sessão | `usuarios` | `email`, `passwordHash` (scrypt), `status`; sessão em cookie assinado (HMAC), não no banco |
| Permissões | `usuarios_perfis`, `usuarios_setores`, `setores` | perfil (`role`) e vínculo com setor; a API aplica a matriz de permissões |
| Lista de pedidos | `pedidos`, `pedidos_itens`, `atividades` | número, cliente, status derivado, previsão = maior `deadlineAt` |
| Detalhe do pedido | `pedidos`, `pedidos_itens`, `atividades`, `execucoes`, `entregas` | solicitado, executado (soma das execuções), entregue (soma das entregas), pendente |
| Previsão de entrega | `pedidos_itens.deadlineAt` | data civil no fuso `America/Sao_Paulo`; fim do dia |
| Histórico de prazos | `logs_auditoria` | `action = DEADLINE_CHANGED`, `beforeJson`/`afterJson`, `userId`, `createdAt` |
| Desmembramento | `pedidos_itens.classificationStatus`, `atividades`, `mapeamentos_categoria_setor` | categoria → setor; criação da atividade na mesma transação |
| Fila do Operador | `atividades` | filtro por setor do usuário, sem concluídas, ordem por prioridade e criação |
| Execução | `execucoes` | usuário, quantidade, data/hora; status da atividade recalculado |
| Ocorrências | `ocorrencias`, `motivos_ocorrencia` | tipo, motivo, quantidade, duração, observação, usuário |
| Entregas | `entregas` | quantidade, exceção (`managerOverride`), motivo, autorizador, disponível antes |
| Remessas | `remessas_programadas` | número automático por item, data prevista, confirmação |
| Painel do Gerente | `atividades`, `execucoes`, `ocorrencias`, `entregas` | contagens, alertas, cumprimento de prazo |
| Administração | `usuarios`, `usuarios_perfis`, `usuarios_setores`, `setores`, `mapeamentos_categoria_setor`, `regras_produto_setor` | inativação preserva histórico; mapeamento único por categoria |
| Integração | `jobs_integracao`, `eventos_job_integracao`, `pedidos` | job idempotente por número; eventos de despacho, retry, sucesso e falha |
| Auditoria geral | `logs_auditoria` | prazos, correção de setor, exceção de entrega, solicitação de importação |

## Consultas usadas no capítulo

```sql
-- Pedidos e previsão
SELECT p.legacyNumber, p.customerName, COUNT(i.id) AS itens,
       MAX(i.deadlineAt) AS previsao
FROM pedidos p LEFT JOIN pedidos_itens i ON i.orderId = p.id
GROUP BY p.id;

-- Atividades por setor/status
SELECT s.name, a.status, a.priority, p.legacyNumber, i.description
FROM atividades a
JOIN setores s ON s.id = a.sectorId
JOIN pedidos_itens i ON i.id = a.orderItemId
JOIN pedidos p ON p.id = i.orderId;

-- Histórico de prazos
SELECT beforeJson, afterJson, userId, createdAt
FROM logs_auditoria WHERE action = 'DEADLINE_CHANGED'
ORDER BY createdAt DESC;

-- Estrutura de uma tabela
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = '3e_operacoes_demo' AND TABLE_NAME = 'pedidos_itens';

-- Chaves estrangeiras
SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = '3e_operacoes_demo' AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## Relacionamentos principais

```text
pedidos 1 ── N pedidos_itens
pedidos_itens 1 ── N atividades
atividades 1 ── N execucoes
atividades 1 ── N ocorrencias
pedidos_itens 1 ── N entregas
pedidos_itens 1 ── N remessas_programadas
usuarios 1 ── N usuarios_perfis
usuarios 1 ── N usuarios_setores
setores 1 ── N atividades
mapeamentos_categoria_setor N ── 1 setores
jobs_integracao 1 ── N eventos_job_integracao
```

## Conferência da demonstração

- **Prazo**: item 3 do pedido 82268 recebeu 20/11/2026 e 27/11/2026; duas linhas em `logs_auditoria` com antes/depois.
- **Entrega**: “Entregar tudo” no pedido 82268 gravou a entrega e atualizou o disponível; a exceção acima do saldo foi demonstrada e cancelada.
- **Produção**: execução de 1 unidade registrada em `execucoes`; status da atividade recalculado.
- **Ocorrência**: perda de 2 unidades com motivo em `ocorrencias`.
- **Usuário**: `tecnico.demo@3e.local` criado, inativado e reativado em `usuarios`.
- **Mapeamento**: `CATEGORIA_DEMO → Corte e Dobra` em `mapeamentos_categoria_setor`.
- **Importação**: pedido 82262 em `jobs_integracao`/`pedidos`; reimportação sem duplicar.
