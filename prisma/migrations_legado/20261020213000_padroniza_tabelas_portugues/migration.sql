-- Padroniza os nomes das tabelas para português (snake_case, plural).
-- Usa RENAME TABLE: preserva dados, índices e chaves estrangeiras.
-- Os modelos Prisma continuam em inglês; o mapeamento é feito com @@map.
RENAME TABLE
  `User` TO `usuarios`,
  `UserRole` TO `usuarios_perfis`,
  `Sector` TO `setores`,
  `UserSector` TO `usuarios_setores`,
  `CategorySectorMapping` TO `mapeamentos_categoria_setor`,
  `ProductSectorRule` TO `regras_produto_setor`,
  `Order` TO `pedidos`,
  `OrderItem` TO `pedidos_itens`,
  `Activity` TO `atividades`,
  `Execution` TO `execucoes`,
  `Occurrence` TO `ocorrencias`,
  `MotivoOcorrencia` TO `motivos_ocorrencia`,
  `Delivery` TO `entregas`,
  `ScheduledDelivery` TO `remessas_programadas`,
  `IntegrationJob` TO `jobs_integracao`,
  `IntegrationJobEvent` TO `eventos_job_integracao`,
  `AuditLog` TO `logs_auditoria`;
