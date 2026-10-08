-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('EMPLOYEE', 'MANAGER', 'ADMIN') NOT NULL DEFAULT 'EMPLOYEE',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `tokenHash` VARCHAR(128) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `replacedById` VARCHAR(36) NULL,
    `userAgent` VARCHAR(255) NULL,
    `ipAddress` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_tokenHash_key`(`tokenHash`),
    INDEX `refresh_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `home_addresses` (
    `id` VARCHAR(36) NOT NULL,
    `employeeId` VARCHAR(36) NOT NULL,
    `label` VARCHAR(80) NULL,
    `address` VARCHAR(500) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `home_addresses_employeeId_active_idx`(`employeeId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stores` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `importKey` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `network` VARCHAR(120) NOT NULL,
    `address` VARCHAR(500) NOT NULL,
    `neighborhood` VARCHAR(120) NULL,
    `city` VARCHAR(120) NOT NULL DEFAULT 'Rio de Janeiro',
    `state` VARCHAR(2) NOT NULL DEFAULT 'RJ',
    `zipCode` VARCHAR(9) NULL,
    `region` VARCHAR(80) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `geocodeSource` VARCHAR(40) NULL,
    `geocodedAt` DATETIME(3) NULL,
    `observations` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stores_code_key`(`code`),
    UNIQUE INDEX `stores_importKey_key`(`importKey`),
    INDEX `stores_network_idx`(`network`),
    INDEX `stores_region_idx`(`region`),
    INDEX `stores_neighborhood_idx`(`neighborhood`),
    INDEX `stores_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authorization_letters` (
    `id` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `fileSize` INTEGER NOT NULL DEFAULT 0,
    `issueDate` DATE NULL,
    `validFrom` DATE NULL,
    `expirationDate` DATE NULL,
    `status` ENUM('ACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `uploadedById` VARCHAR(36) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `authorization_letters_storeId_idx`(`storeId`),
    INDEX `authorization_letters_expirationDate_idx`(`expirationDate`),
    INDEX `authorization_letters_status_deletedAt_idx`(`status`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authorization_letter_history` (
    `id` VARCHAR(36) NOT NULL,
    `letterId` VARCHAR(36) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `fileUrl` VARCHAR(500) NULL,
    `fileName` VARCHAR(255) NULL,
    `details` TEXT NULL,
    `userId` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `authorization_letter_history_letterId_createdAt_idx`(`letterId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `routes` (
    `id` VARCHAR(36) NOT NULL,
    `employeeId` VARCHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `status` ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `region` VARCHAR(80) NULL,
    `startAddress` VARCHAR(500) NOT NULL,
    `startLatitude` DOUBLE NULL,
    `startLongitude` DOUBLE NULL,
    `estimatedDistance` INTEGER NULL,
    `estimatedDuration` INTEGER NULL,
    `estimatedTransportCost` DECIMAL(10, 2) NULL,
    `actualTransportCost` DECIMAL(10, 2) NULL,
    `returnDistance` INTEGER NULL,
    `returnDuration` INTEGER NULL,
    `returnTransportMode` ENUM('WALKING', 'BUS', 'METRO', 'TRAIN', 'TRANSIT', 'DRIVING', 'TAXI', 'RIDE_APP', 'BICYCLE', 'OTHER') NULL,
    `returnTravelCost` DECIMAL(10, 2) NULL,
    `returnSummary` VARCHAR(500) NULL,
    `legsProvider` VARCHAR(40) NULL,
    `legsComputedAt` DATETIME(3) NULL,
    `templateId` VARCHAR(36) NULL,
    `notes` TEXT NULL,
    `importKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `routes_importKey_key`(`importKey`),
    INDEX `routes_date_idx`(`date`),
    UNIQUE INDEX `routes_employeeId_date_key`(`employeeId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_stops` (
    `id` VARCHAR(36) NOT NULL,
    `routeId` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NOT NULL,
    `visitId` VARCHAR(36) NULL,
    `order` INTEGER NOT NULL,
    `estimatedArrival` DATETIME(3) NULL,
    `actualArrival` DATETIME(3) NULL,
    `travelDistance` INTEGER NULL,
    `travelDuration` INTEGER NULL,
    `transportMode` ENUM('WALKING', 'BUS', 'METRO', 'TRAIN', 'TRANSIT', 'DRIVING', 'TAXI', 'RIDE_APP', 'BICYCLE', 'OTHER') NULL,
    `travelCost` DECIMAL(10, 2) NULL,
    `travelSummary` VARCHAR(500) NULL,

    UNIQUE INDEX `route_stops_visitId_key`(`visitId`),
    INDEX `route_stops_routeId_order_idx`(`routeId`, `order`),
    INDEX `route_stops_storeId_idx`(`storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_templates` (
    `id` VARCHAR(36) NOT NULL,
    `employeeId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `kind` ENUM('STANDARD', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'STANDARD',
    `cycleWeeks` INTEGER NOT NULL DEFAULT 1,
    `anchorDate` DATE NULL,
    `validFrom` DATE NULL,
    `validUntil` DATE NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `importKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `route_templates_importKey_key`(`importKey`),
    INDEX `route_templates_employeeId_active_idx`(`employeeId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_template_stops` (
    `id` VARCHAR(36) NOT NULL,
    `templateId` VARCHAR(36) NOT NULL,
    `storeId` VARCHAR(36) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `weekIndex` INTEGER NOT NULL DEFAULT 0,
    `order` INTEGER NOT NULL,

    INDEX `route_template_stops_templateId_weekIndex_weekday_order_idx`(`templateId`, `weekIndex`, `weekday`, `order`),
    INDEX `route_template_stops_storeId_idx`(`storeId`),
    UNIQUE INDEX `route_template_stops_templateId_weekIndex_weekday_storeId_key`(`templateId`, `weekIndex`, `weekday`, `storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visits` (
    `id` VARCHAR(36) NOT NULL,
    `routeId` VARCHAR(36) NULL,
    `storeId` VARCHAR(36) NOT NULL,
    `employeeId` VARCHAR(36) NOT NULL,
    `scheduledDate` DATE NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED', 'RESCHEDULED', 'CANCELLED', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `statusReason` VARCHAR(500) NULL,
    `latitudeAtStart` DOUBLE NULL,
    `longitudeAtStart` DOUBLE NULL,
    `accuracyAtStart` DOUBLE NULL,
    `latitudeAtFinish` DOUBLE NULL,
    `longitudeAtFinish` DOUBLE NULL,
    `accuracyAtFinish` DOUBLE NULL,
    `rescheduledFromId` VARCHAR(36) NULL,
    `importKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `visits_rescheduledFromId_key`(`rescheduledFromId`),
    UNIQUE INDEX `visits_importKey_key`(`importKey`),
    INDEX `visits_employeeId_scheduledDate_idx`(`employeeId`, `scheduledDate`),
    INDEX `visits_storeId_scheduledDate_idx`(`storeId`, `scheduledDate`),
    INDEX `visits_routeId_order_idx`(`routeId`, `order`),
    INDEX `visits_status_idx`(`status`),
    INDEX `visits_scheduledDate_idx`(`scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_photos` (
    `id` VARCHAR(36) NOT NULL,
    `visitId` VARCHAR(36) NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `thumbnailUrl` VARCHAR(500) NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `originalSize` INTEGER NOT NULL,
    `optimizedSize` INTEGER NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `category` ENUM('FACADE', 'DISPLAY', 'PRODUCT', 'MATERIAL', 'RECEIPT', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `caption` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `visit_photos_visitId_createdAt_idx`(`visitId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_activities` (
    `id` VARCHAR(36) NOT NULL,
    `visitId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NULL,
    `type` ENUM('NOTE', 'ACTIVITY', 'STATUS_CHANGE', 'PHOTO', 'SYSTEM') NOT NULL,
    `description` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `visit_activities_visitId_createdAt_idx`(`visitId`, `createdAt`),
    INDEX `visit_activities_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transport_expenses` (
    `id` VARCHAR(36) NOT NULL,
    `employeeId` VARCHAR(36) NOT NULL,
    `routeId` VARCHAR(36) NULL,
    `visitId` VARCHAR(36) NULL,
    `date` DATE NOT NULL,
    `type` ENUM('BUS', 'METRO', 'TRAIN', 'INTEGRATION', 'TAXI', 'RIDE_APP', 'OTHER') NOT NULL,
    `description` VARCHAR(500) NULL,
    `value` DECIMAL(10, 2) NOT NULL,
    `estimatedValue` DECIMAL(10, 2) NULL,
    `actualValue` DECIMAL(10, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transport_expenses_employeeId_date_idx`(`employeeId`, `date`),
    INDEX `transport_expenses_routeId_idx`(`routeId`),
    INDEX `transport_expenses_visitId_idx`(`visitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transport_fares` (
    `id` VARCHAR(36) NOT NULL,
    `type` ENUM('BUS', 'METRO', 'TRAIN', 'INTEGRATION', 'TAXI', 'RIDE_APP', 'OTHER') NOT NULL,
    `operator` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `value` DECIMAL(10, 2) NOT NULL,
    `effectiveFrom` DATE NOT NULL,
    `effectiveUntil` DATE NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transport_fares_type_active_idx`(`type`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `type` ENUM('AUTHORIZATION_EXPIRING', 'AUTHORIZATION_EXPIRED', 'VISIT_UPCOMING', 'VISIT_PENDING', 'ROUTE_CHANGED', 'SYSTEM') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `link` VARCHAR(500) NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `dedupeKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `notifications_dedupeKey_key`(`dedupeKey`),
    INDEX `notifications_userId_read_createdAt_idx`(`userId`, `read`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NULL,
    `entity` VARCHAR(60) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `action` VARCHAR(60) NOT NULL,
    `metadata` TEXT NULL,
    `ipAddress` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    INDEX `audit_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shared_accesses` (
    `id` VARCHAR(36) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `tokenHash` VARCHAR(128) NOT NULL,
    `tokenPreview` VARCHAR(12) NOT NULL,
    `scope` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `revokedAt` DATETIME(3) NULL,
    `lastAccessAt` DATETIME(3) NULL,
    `accessCount` INTEGER NOT NULL DEFAULT 0,
    `createdById` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shared_accesses_tokenHash_key`(`tokenHash`),
    INDEX `shared_accesses_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_settings` (
    `id` VARCHAR(36) NOT NULL,
    `key` VARCHAR(120) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_runs` (
    `id` VARCHAR(36) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `fileHash` VARCHAR(64) NOT NULL,
    `dryRun` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(40) NOT NULL,
    `summary` TEXT NOT NULL,
    `issues` TEXT NOT NULL,
    `userId` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `import_runs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `home_addresses` ADD CONSTRAINT `home_addresses_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorization_letters` ADD CONSTRAINT `authorization_letters_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorization_letters` ADD CONSTRAINT `authorization_letters_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorization_letter_history` ADD CONSTRAINT `authorization_letter_history_letterId_fkey` FOREIGN KEY (`letterId`) REFERENCES `authorization_letters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorization_letter_history` ADD CONSTRAINT `authorization_letter_history_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `route_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_templates` ADD CONSTRAINT `route_templates_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_template_stops` ADD CONSTRAINT `route_template_stops_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `route_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_template_stops` ADD CONSTRAINT `route_template_stops_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visits` ADD CONSTRAINT `visits_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visits` ADD CONSTRAINT `visits_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visits` ADD CONSTRAINT `visits_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visits` ADD CONSTRAINT `visits_rescheduledFromId_fkey` FOREIGN KEY (`rescheduledFromId`) REFERENCES `visits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_photos` ADD CONSTRAINT `visit_photos_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_activities` ADD CONSTRAINT `visit_activities_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_activities` ADD CONSTRAINT `visit_activities_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_expenses` ADD CONSTRAINT `transport_expenses_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_expenses` ADD CONSTRAINT `transport_expenses_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_expenses` ADD CONSTRAINT `transport_expenses_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shared_accesses` ADD CONSTRAINT `shared_accesses_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_runs` ADD CONSTRAINT `import_runs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
