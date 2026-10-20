-- DropForeignKey
ALTER TABLE `atividades` DROP FOREIGN KEY `Activity_orderItemId_fkey`;

-- DropForeignKey
ALTER TABLE `atividades` DROP FOREIGN KEY `Activity_sectorId_fkey`;

-- DropForeignKey
ALTER TABLE `entregas` DROP FOREIGN KEY `Delivery_authorizedByUserId_fkey`;

-- DropForeignKey
ALTER TABLE `entregas` DROP FOREIGN KEY `Delivery_orderItemId_fkey`;

-- DropForeignKey
ALTER TABLE `entregas` DROP FOREIGN KEY `Delivery_userId_fkey`;

-- DropForeignKey
ALTER TABLE `eventos_job_integracao` DROP FOREIGN KEY `IntegrationJobEvent_jobId_fkey`;

-- DropForeignKey
ALTER TABLE `execucoes` DROP FOREIGN KEY `Execution_activityId_fkey`;

-- DropForeignKey
ALTER TABLE `execucoes` DROP FOREIGN KEY `Execution_userId_fkey`;

-- DropForeignKey
ALTER TABLE `jobs_integracao` DROP FOREIGN KEY `IntegrationJob_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `mapeamentos_categoria_setor` DROP FOREIGN KEY `CategorySectorMapping_sectorId_fkey`;

-- DropForeignKey
ALTER TABLE `ocorrencias` DROP FOREIGN KEY `Occurrence_activityId_fkey`;

-- DropForeignKey
ALTER TABLE `ocorrencias` DROP FOREIGN KEY `Occurrence_motivoId_fkey`;

-- DropForeignKey
ALTER TABLE `ocorrencias` DROP FOREIGN KEY `Occurrence_userId_fkey`;

-- DropForeignKey
ALTER TABLE `pedidos_itens` DROP FOREIGN KEY `OrderItem_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `regras_produto_setor` DROP FOREIGN KEY `ProductSectorRule_sectorId_fkey`;

-- DropForeignKey
ALTER TABLE `remessas_programadas` DROP FOREIGN KEY `ScheduledDelivery_orderItemId_fkey`;

-- DropForeignKey
ALTER TABLE `usuarios_perfis` DROP FOREIGN KEY `UserRole_userId_fkey`;

-- DropForeignKey
ALTER TABLE `usuarios_setores` DROP FOREIGN KEY `UserSector_sectorId_fkey`;

-- DropForeignKey
ALTER TABLE `usuarios_setores` DROP FOREIGN KEY `UserSector_userId_fkey`;

-- AddForeignKey
ALTER TABLE `usuarios_perfis` ADD CONSTRAINT `usuarios_perfis_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_setores` ADD CONSTRAINT `usuarios_setores_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios_setores` ADD CONSTRAINT `usuarios_setores_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `setores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mapeamentos_categoria_setor` ADD CONSTRAINT `mapeamentos_categoria_setor_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `setores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `regras_produto_setor` ADD CONSTRAINT `regras_produto_setor_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `setores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos_itens` ADD CONSTRAINT `pedidos_itens_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atividades` ADD CONSTRAINT `atividades_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `pedidos_itens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atividades` ADD CONSTRAINT `atividades_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `setores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `execucoes` ADD CONSTRAINT `execucoes_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `atividades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `execucoes` ADD CONSTRAINT `execucoes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ocorrencias` ADD CONSTRAINT `ocorrencias_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `atividades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ocorrencias` ADD CONSTRAINT `ocorrencias_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ocorrencias` ADD CONSTRAINT `ocorrencias_motivoId_fkey` FOREIGN KEY (`motivoId`) REFERENCES `motivos_ocorrencia`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas` ADD CONSTRAINT `entregas_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `pedidos_itens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas` ADD CONSTRAINT `entregas_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entregas` ADD CONSTRAINT `entregas_authorizedByUserId_fkey` FOREIGN KEY (`authorizedByUserId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `remessas_programadas` ADD CONSTRAINT `remessas_programadas_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `pedidos_itens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobs_integracao` ADD CONSTRAINT `jobs_integracao_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `pedidos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `eventos_job_integracao` ADD CONSTRAINT `eventos_job_integracao_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `jobs_integracao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `atividades` RENAME INDEX `Activity_orderItemId_sectorId_key` TO `atividades_orderItemId_sectorId_key`;

-- RenameIndex
ALTER TABLE `entregas` RENAME INDEX `Delivery_authorizedByUserId_idx` TO `entregas_authorizedByUserId_idx`;

-- RenameIndex
ALTER TABLE `entregas` RENAME INDEX `Delivery_orderItemId_occurredAt_idx` TO `entregas_orderItemId_occurredAt_idx`;

-- RenameIndex
ALTER TABLE `eventos_job_integracao` RENAME INDEX `IntegrationJobEvent_jobId_createdAt_idx` TO `eventos_job_integracao_jobId_createdAt_idx`;

-- RenameIndex
ALTER TABLE `execucoes` RENAME INDEX `Execution_activityId_occurredAt_idx` TO `execucoes_activityId_occurredAt_idx`;

-- RenameIndex
ALTER TABLE `jobs_integracao` RENAME INDEX `IntegrationJob_idempotencyKey_key` TO `jobs_integracao_idempotencyKey_key`;

-- RenameIndex
ALTER TABLE `logs_auditoria` RENAME INDEX `AuditLog_entityType_entityId_createdAt_idx` TO `logs_auditoria_entityType_entityId_createdAt_idx`;

-- RenameIndex
ALTER TABLE `mapeamentos_categoria_setor` RENAME INDEX `CategorySectorMapping_legacyCategory_key` TO `mapeamentos_categoria_setor_legacyCategory_key`;

-- RenameIndex
ALTER TABLE `motivos_ocorrencia` RENAME INDEX `MotivoOcorrencia_tipo_codigo_key` TO `motivos_ocorrencia_tipo_codigo_key`;

-- RenameIndex
ALTER TABLE `ocorrencias` RENAME INDEX `Occurrence_activityId_occurredAt_idx` TO `ocorrencias_activityId_occurredAt_idx`;

-- RenameIndex
ALTER TABLE `ocorrencias` RENAME INDEX `Occurrence_motivoId_idx` TO `ocorrencias_motivoId_idx`;

-- RenameIndex
ALTER TABLE `pedidos` RENAME INDEX `Order_legacyNumber_idx` TO `pedidos_legacyNumber_idx`;

-- RenameIndex
ALTER TABLE `pedidos` RENAME INDEX `Order_legacyOrderKey_key` TO `pedidos_legacyOrderKey_key`;

-- RenameIndex
ALTER TABLE `pedidos_itens` RENAME INDEX `OrderItem_orderId_legacyItemKey_key` TO `pedidos_itens_orderId_legacyItemKey_key`;

-- RenameIndex
ALTER TABLE `regras_produto_setor` RENAME INDEX `ProductSectorRule_matchType_matchValue_idx` TO `regras_produto_setor_matchType_matchValue_idx`;

-- RenameIndex
ALTER TABLE `remessas_programadas` RENAME INDEX `ScheduledDelivery_orderItemId_remessa_key` TO `remessas_programadas_orderItemId_remessa_key`;

-- RenameIndex
ALTER TABLE `remessas_programadas` RENAME INDEX `ScheduledDelivery_orderItemId_scheduledAt_idx` TO `remessas_programadas_orderItemId_scheduledAt_idx`;

-- RenameIndex
ALTER TABLE `setores` RENAME INDEX `Sector_code_key` TO `setores_code_key`;

-- RenameIndex
ALTER TABLE `usuarios` RENAME INDEX `User_email_key` TO `usuarios_email_key`;
