-- CreateTable
CREATE TABLE `ProductSectorRule` (
    `id` VARCHAR(191) NOT NULL,
    `matchType` VARCHAR(191) NOT NULL DEFAULT 'CONTAINS',
    `matchValue` VARCHAR(191) NOT NULL,
    `sectorId` VARCHAR(191) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductSectorRule_matchType_matchValue_idx`(`matchType`, `matchValue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduledDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `remessa` INTEGER NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ScheduledDelivery_orderItemId_scheduledAt_idx`(`orderItemId`, `scheduledAt`),
    UNIQUE INDEX `ScheduledDelivery_orderItemId_remessa_key`(`orderItemId`, `remessa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductSectorRule` ADD CONSTRAINT `ProductSectorRule_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledDelivery` ADD CONSTRAINT `ScheduledDelivery_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
