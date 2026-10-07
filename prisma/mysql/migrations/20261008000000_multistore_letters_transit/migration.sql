-- RouteFlow: cartas valendo para várias lojas, regra de exigência de carta por rede/loja,
-- geocodificação automática e itinerários de transporte público por trecho.

-- CreateTable
CREATE TABLE `authorization_letter_stores` (
    `id` VARCHAR(36) NOT NULL,
    `letterId` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NOT NULL,
    `dates` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `authorization_letter_stores_storeId_idx`(`storeId`),
    UNIQUE INDEX `authorization_letter_stores_letterId_storeId_key`(`letterId`, `storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `authorization_letter_stores` ADD CONSTRAINT `authorization_letter_stores_letterId_fkey` FOREIGN KEY (`letterId`) REFERENCES `authorization_letters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorization_letter_stores` ADD CONSTRAINT `authorization_letter_stores_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Migra a loja de cada carta já cadastrada para a nova tabela (antes de remover a coluna)
INSERT INTO `authorization_letter_stores` (`id`, `letterId`, `storeId`, `createdAt`)
SELECT `id`, `id`, `storeId`, `createdAt` FROM `authorization_letters` WHERE `storeId` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `authorization_letters` DROP FOREIGN KEY `authorization_letters_storeId_fkey`;

-- DropIndex
DROP INDEX `authorization_letters_storeId_idx` ON `authorization_letters`;

-- AlterTable
ALTER TABLE `stores` ADD COLUMN `authorizationRequired` BOOLEAN NULL,
    ADD COLUMN `geocodeAttemptedAt` DATETIME(3) NULL,
    ADD COLUMN `geocodeStatus` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `authorization_letters` DROP COLUMN `storeId`,
    ADD COLUMN `network` VARCHAR(120) NULL;

-- AlterTable
ALTER TABLE `routes` ADD COLUMN `optimizedAt` DATETIME(3) NULL,
    ADD COLUMN `returnSteps` TEXT NULL;

-- AlterTable
ALTER TABLE `route_stops` ADD COLUMN `travelSteps` TEXT NULL;

-- AlterTable
ALTER TABLE `shared_accesses` ADD COLUMN `tokenEncrypted` TEXT NULL;
