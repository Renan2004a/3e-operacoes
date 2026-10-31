-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha_hash` VARCHAR(191) NOT NULL,
    `situacao` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios_perfis` (
    `usuario_id` VARCHAR(191) NOT NULL,
    `perfil` ENUM('OPERATOR', 'PRODUCTION_MANAGER', 'SELLER', 'SHIPPING', 'SYSTEM_RESPONSIBLE', 'TECHNICAL_RESPONSIBLE') NOT NULL,

    PRIMARY KEY (`usuario_id`, `perfil`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setores` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` ENUM('CORTE_DOBRA', 'TELHAS', 'REVENDA') NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `setores_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios_setores` (
    `usuario_id` VARCHAR(191) NOT NULL,
    `setor_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`usuario_id`, `setor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `regras_classificacao` (
    `id` VARCHAR(191) NOT NULL,
    `tipo_correspondencia` VARCHAR(191) NOT NULL,
    `operador` VARCHAR(191) NOT NULL,
    `valor` VARCHAR(191) NOT NULL,
    `setor_id` VARCHAR(191) NOT NULL,
    `prioridade` INTEGER NOT NULL DEFAULT 0,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `vigente_de` DATE NULL,
    `vigente_ate` DATE NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `regras_classificacao_ativo_prioridade_idx`(`ativo`, `prioridade`),
    INDEX `regras_classificacao_setor_id_idx`(`setor_id`),
    UNIQUE INDEX `regras_classificacao_tipo_correspondencia_operador_valor_key`(`tipo_correspondencia`, `operador`, `valor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos` (
    `id` VARCHAR(191) NOT NULL,
    `chave_legado` VARCHAR(191) NOT NULL,
    `numero_legado` VARCHAR(191) NOT NULL,
    `cliente_nome` VARCHAR(191) NULL,
    `vendedor_codigo` VARCHAR(191) NULL,
    `data_origem` DATETIME(3) NULL,
    `sincronizado_em` DATETIME(3) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pedidos_chave_legado_key`(`chave_legado`),
    INDEX `pedidos_numero_legado_idx`(`numero_legado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos_itens` (
    `id` VARCHAR(191) NOT NULL,
    `pedido_id` VARCHAR(191) NOT NULL,
    `chave_item_legado` VARCHAR(191) NOT NULL,
    `codigo_produto` VARCHAR(191) NULL,
    `descricao` VARCHAR(191) NULL,
    `categoria_legado` VARCHAR(191) NULL,
    `unidade` VARCHAR(191) NOT NULL,
    `quantidade_solicitada` DECIMAL(18, 3) NOT NULL,
    `prazo_entrega` DATETIME(3) NULL,
    `setor_id` VARCHAR(191) NULL,
    `situacao` ENUM('PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'DIVERGENT') NOT NULL DEFAULT 'PENDING',
    `prioridade` INTEGER NOT NULL DEFAULT 0,
    `prazo_operacional` DATETIME(3) NULL,
    `classificado_em` DATETIME(3) NULL,
    `classificado_por` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `pedidos_itens_setor_id_situacao_prioridade_idx`(`setor_id`, `situacao`, `prioridade`),
    INDEX `pedidos_itens_prazo_entrega_idx`(`prazo_entrega`),
    UNIQUE INDEX `pedidos_itens_pedido_id_chave_item_legado_key`(`pedido_id`, `chave_item_legado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `apontamentos` (
    `id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(18, 3) NOT NULL,
    `registrado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `iniciado_em` DATETIME(3) NULL,
    `finalizado_em` DATETIME(3) NULL,
    `observacao` VARCHAR(191) NULL,
    `situacao` VARCHAR(191) NOT NULL DEFAULT 'CONCLUIDO',
    `chave_idempotencia` VARCHAR(191) NULL,
    `anulado_em` DATETIME(3) NULL,
    `anulado_por` VARCHAR(191) NULL,
    `motivo_anulacao` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `apontamentos_chave_idempotencia_key`(`chave_idempotencia`),
    INDEX `apontamentos_item_id_registrado_em_idx`(`item_id`, `registrado_em`),
    INDEX `apontamentos_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ocorrencias` (
    `id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(18, 3) NULL,
    `duracao_minutos` INTEGER NULL,
    `motivo_id` VARCHAR(191) NULL,
    `observacao` VARCHAR(191) NULL,
    `ocorrido_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `apontamento_id` VARCHAR(191) NULL,
    `chave_idempotencia` VARCHAR(191) NULL,
    `anulado_em` DATETIME(3) NULL,
    `anulado_por` VARCHAR(191) NULL,
    `motivo_anulacao` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ocorrencias_chave_idempotencia_key`(`chave_idempotencia`),
    INDEX `ocorrencias_item_id_ocorrido_em_idx`(`item_id`, `ocorrido_em`),
    INDEX `ocorrencias_motivo_id_idx`(`motivo_id`),
    INDEX `ocorrencias_apontamento_id_idx`(`apontamento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `motivos_ocorrencia` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `motivos_ocorrencia_tipo_codigo_key`(`tipo`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entregas` (
    `id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `quantidade` DECIMAL(18, 3) NOT NULL,
    `excecao_autorizada` BOOLEAN NOT NULL DEFAULT false,
    `motivo_excecao` VARCHAR(191) NULL,
    `autorizado_por` VARCHAR(191) NULL,
    `disponivel_antes` DECIMAL(18, 3) NULL,
    `entregue_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `chave_idempotencia` VARCHAR(191) NULL,
    `anulado_em` DATETIME(3) NULL,
    `anulado_por` VARCHAR(191) NULL,
    `motivo_anulacao` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `entregas_chave_idempotencia_key`(`chave_idempotencia`),
    INDEX `entregas_item_id_entregue_em_idx`(`item_id`, `entregue_em`),
    INDEX `entregas_autorizado_por_idx`(`autorizado_por`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entregas_previstas` (
    `id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `numero_remessa` INTEGER NOT NULL,
    `data_prevista` DATETIME(3) NOT NULL,
    `quantidade_prevista` DECIMAL(18, 3) NULL,
    `confirmada_em` DATETIME(3) NULL,
    `confirmada_por` VARCHAR(191) NULL,
    `criado_por` VARCHAR(191) NULL,
    `observacao` VARCHAR(191) NULL,
    `anulada_em` DATETIME(3) NULL,
    `anulada_por` VARCHAR(191) NULL,
    `motivo_anulacao` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `entregas_previstas_item_id_data_prevista_idx`(`item_id`, `data_prevista`),
    UNIQUE INDEX `entregas_previstas_item_id_numero_remessa_key`(`item_id`, `numero_remessa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobs_integracao` (
    `id` VARCHAR(191) NOT NULL,
    `pedido_id` VARCHAR(191) NULL,
    `numero_legado` VARCHAR(191) NOT NULL,
    `empresa_origem` VARCHAR(191) NOT NULL DEFAULT '1',
    `chave_idempotencia` VARCHAR(191) NOT NULL,
    `situacao` ENUM('PENDING', 'DISPATCHED', 'RUNNING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `erro_codigo` VARCHAR(191) NULL,
    `erro_mensagem` VARCHAR(191) NULL,
    `solicitado_por` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,
    `despachado_em` DATETIME(3) NULL,
    `concluido_em` DATETIME(3) NULL,

    UNIQUE INDEX `jobs_integracao_chave_idempotencia_key`(`chave_idempotencia`),
    INDEX `jobs_integracao_numero_legado_idx`(`numero_legado`),
    INDEX `jobs_integracao_situacao_atualizado_em_idx`(`situacao`, `atualizado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logs_auditoria` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NULL,
    `acao` VARCHAR(191) NOT NULL,
    `entidade_tipo` VARCHAR(191) NOT NULL,
    `entidade_id` VARCHAR(191) NULL,
    `antes_json` JSON NULL,
    `depois_json` JSON NULL,
    `motivo` VARCHAR(191) NULL,
    `correlacao_id` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `logs_auditoria_entidade_tipo_entidade_id_criado_em_idx`(`entidade_tipo`, `entidade_id`, `criado_em`),
    INDEX `logs_auditoria_usuario_id_criado_em_idx`(`usuario_id`, `criado_em`),
    INDEX `logs_auditoria_correlacao_id_idx`(`correlacao_id`),
    INDEX `logs_auditoria_acao_criado_em_idx`(`acao`, `criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios_perfis` ADD CONSTRAINT `usuarios_perfis_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_setores` ADD CONSTRAINT `usuarios_setores_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_setores` ADD CONSTRAINT `usuarios_setores_setor_id_fkey` FOREIGN KEY (`setor_id`) REFERENCES `setores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `regras_classificacao` ADD CONSTRAINT `regras_classificacao_setor_id_fkey` FOREIGN KEY (`setor_id`) REFERENCES `setores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos_itens` ADD CONSTRAINT `pedidos_itens_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos_itens` ADD CONSTRAINT `pedidos_itens_setor_id_fkey` FOREIGN KEY (`setor_id`) REFERENCES `setores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos_itens` ADD CONSTRAINT `pedidos_itens_classificado_por_fkey` FOREIGN KEY (`classificado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `apontamentos` ADD CONSTRAINT `apontamentos_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `pedidos_itens`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `apontamentos` ADD CONSTRAINT `apontamentos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `apontamentos` ADD CONSTRAINT `apontamentos_anulado_por_fkey` FOREIGN KEY (`anulado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ocorrencias` ADD CONSTRAINT `ocorrencias_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `pedidos_itens`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ocorrencias` ADD CONSTRAINT `ocorrencias_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ocorrencias` ADD CONSTRAINT `ocorrencias_motivo_id_fkey` FOREIGN KEY (`motivo_id`) REFERENCES `motivos_ocorrencia`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ocorrencias` ADD CONSTRAINT `ocorrencias_apontamento_id_fkey` FOREIGN KEY (`apontamento_id`) REFERENCES `apontamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ocorrencias` ADD CONSTRAINT `ocorrencias_anulado_por_fkey` FOREIGN KEY (`anulado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas` ADD CONSTRAINT `entregas_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `pedidos_itens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas` ADD CONSTRAINT `entregas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas` ADD CONSTRAINT `entregas_autorizado_por_fkey` FOREIGN KEY (`autorizado_por`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas` ADD CONSTRAINT `entregas_anulado_por_fkey` FOREIGN KEY (`anulado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas_previstas` ADD CONSTRAINT `entregas_previstas_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `pedidos_itens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas_previstas` ADD CONSTRAINT `entregas_previstas_criado_por_fkey` FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas_previstas` ADD CONSTRAINT `entregas_previstas_confirmada_por_fkey` FOREIGN KEY (`confirmada_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas_previstas` ADD CONSTRAINT `entregas_previstas_anulada_por_fkey` FOREIGN KEY (`anulada_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobs_integracao` ADD CONSTRAINT `jobs_integracao_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobs_integracao` ADD CONSTRAINT `jobs_integracao_solicitado_por_fkey` FOREIGN KEY (`solicitado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs_auditoria` ADD CONSTRAINT `logs_auditoria_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Regras de integridade (CHECK) e views de leitura
-- ============================================================================

ALTER TABLE `pedidos_itens`
  ADD CONSTRAINT `ck_item_quantidade` CHECK (`quantidade_solicitada` > 0),
  ADD CONSTRAINT `ck_item_prioridade` CHECK (`prioridade` >= 0);

ALTER TABLE `apontamentos`
  ADD CONSTRAINT `ck_apontamento_quantidade` CHECK (`quantidade` > 0);

ALTER TABLE `ocorrencias`
  ADD CONSTRAINT `ck_ocorrencia_quantidade` CHECK (`quantidade` IS NULL OR `quantidade` > 0),
  ADD CONSTRAINT `ck_ocorrencia_duracao` CHECK (`duracao_minutos` IS NULL OR `duracao_minutos` > 0);

ALTER TABLE `entregas`
  ADD CONSTRAINT `ck_entrega_quantidade` CHECK (`quantidade` > 0);

ALTER TABLE `entregas_previstas`
  ADD CONSTRAINT `ck_previsao_numero` CHECK (`numero_remessa` > 0),
  ADD CONSTRAINT `ck_previsao_quantidade` CHECK (`quantidade_prevista` IS NULL OR `quantidade_prevista` > 0);

ALTER TABLE `jobs_integracao`
  ADD CONSTRAINT `ck_job_tentativas` CHECK (`tentativas` >= 0);

-- View de compatibilidade: a "atividade" agora é o próprio item.
CREATE OR REPLACE VIEW `vw_atividades` AS
SELECT
  i.`id` AS `id`,
  i.`id` AS `item_id`,
  i.`pedido_id` AS `pedido_id`,
  i.`setor_id` AS `setor_id`,
  i.`situacao` AS `status`,
  i.`prioridade` AS `priority`,
  i.`prazo_operacional` AS `prazo_operacional`,
  i.`classificado_em` AS `classificado_em`,
  i.`criado_em` AS `criado_em`,
  i.`atualizado_em` AS `atualizado_em`
FROM `pedidos_itens` i
WHERE i.`setor_id` IS NOT NULL;

-- Saldos por item, sem somar unidades diferentes.
CREATE OR REPLACE VIEW `vw_item_saldos` AS
SELECT
  i.`id` AS `item_id`,
  i.`pedido_id` AS `pedido_id`,
  p.`numero_legado` AS `numero_legado`,
  p.`cliente_nome` AS `cliente_nome`,
  i.`chave_item_legado` AS `chave_item_legado`,
  i.`codigo_produto` AS `codigo_produto`,
  i.`descricao` AS `descricao`,
  i.`unidade` AS `unidade`,
  i.`quantidade_solicitada` AS `quantidade_solicitada`,
  COALESCE(a.`quantidade_executada`, 0) AS `quantidade_executada`,
  COALESCE(e.`quantidade_entregue`, 0) AS `quantidade_entregue`,
  GREATEST(i.`quantidade_solicitada` - COALESCE(a.`quantidade_executada`, 0), 0) AS `saldo_executar`,
  GREATEST(COALESCE(a.`quantidade_executada`, 0) - COALESCE(e.`quantidade_entregue`, 0), 0) AS `disponivel_entrega`,
  GREATEST(i.`quantidade_solicitada` - COALESCE(e.`quantidade_entregue`, 0), 0) AS `saldo_entregar`,
  i.`setor_id` AS `setor_id`,
  s.`nome` AS `setor_nome`,
  i.`situacao` AS `situacao`,
  i.`prioridade` AS `prioridade`,
  i.`prazo_entrega` AS `prazo_entrega`,
  i.`prazo_operacional` AS `prazo_operacional`
FROM `pedidos_itens` i
JOIN `pedidos` p ON p.`id` = i.`pedido_id`
LEFT JOIN `setores` s ON s.`id` = i.`setor_id`
LEFT JOIN (
  SELECT `item_id`, SUM(`quantidade`) AS `quantidade_executada`
  FROM `apontamentos` WHERE `anulado_em` IS NULL GROUP BY `item_id`
) a ON a.`item_id` = i.`id`
LEFT JOIN (
  SELECT `item_id`, SUM(`quantidade`) AS `quantidade_entregue`
  FROM `entregas` WHERE `anulado_em` IS NULL GROUP BY `item_id`
) e ON e.`item_id` = i.`id`;

-- Fila operacional por setor.
CREATE OR REPLACE VIEW `vw_fila_setor` AS
SELECT
  i.`id` AS `item_id`,
  i.`pedido_id` AS `pedido_id`,
  p.`numero_legado` AS `numero_legado`,
  p.`cliente_nome` AS `cliente_nome`,
  i.`descricao` AS `descricao`,
  i.`codigo_produto` AS `codigo_produto`,
  i.`unidade` AS `unidade`,
  i.`quantidade_solicitada` AS `quantidade_solicitada`,
  i.`setor_id` AS `setor_id`,
  s.`codigo` AS `setor_codigo`,
  s.`nome` AS `setor_nome`,
  i.`situacao` AS `situacao`,
  i.`prioridade` AS `prioridade`,
  i.`prazo_operacional` AS `prazo_operacional`,
  i.`criado_em` AS `criado_em`
FROM `pedidos_itens` i
JOIN `pedidos` p ON p.`id` = i.`pedido_id`
JOIN `setores` s ON s.`id` = i.`setor_id`
WHERE i.`setor_id` IS NOT NULL AND i.`situacao` <> 'COMPLETED';

-- Resumo por pedido (contagens, nunca soma de unidades diferentes).
CREATE OR REPLACE VIEW `vw_pedido_resumo` AS
SELECT
  p.`id` AS `pedido_id`,
  p.`numero_legado` AS `numero_legado`,
  p.`cliente_nome` AS `cliente_nome`,
  p.`vendedor_codigo` AS `vendedor_codigo`,
  COUNT(i.`id`) AS `total_itens`,
  COALESCE(SUM(i.`setor_id` IS NULL), 0) AS `itens_nao_classificados`,
  COALESCE(SUM(i.`situacao` = 'COMPLETED'), 0) AS `itens_concluidos`,
  COALESCE(SUM(i.`situacao` = 'PENDING'), 0) AS `itens_pendentes`,
  COALESCE(SUM(i.`situacao` IN ('IN_PROGRESS','DIVERGENT','PAUSED')), 0) AS `itens_em_andamento`,
  MAX(i.`prazo_entrega`) AS `previsao`
FROM `pedidos` p
LEFT JOIN `pedidos_itens` i ON i.`pedido_id` = p.`id`
GROUP BY p.`id`, p.`numero_legado`, p.`cliente_nome`, p.`vendedor_codigo`;

-- Eventos de integração agora vivem na auditoria; a view preserva a leitura.
CREATE OR REPLACE VIEW `vw_eventos_job_integracao` AS
SELECT
  `id` AS `id`,
  `entidade_id` AS `job_id`,
  `acao` AS `tipo`,
  JSON_UNQUOTE(JSON_EXTRACT(`depois_json`, '$.detalhe')) AS `detalhe`,
  `criado_em` AS `criado_em`
FROM `logs_auditoria`
WHERE `entidade_tipo` = 'JobIntegracao';
