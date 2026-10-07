-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED', 'RESCHEDULED', 'CANCELLED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('WALKING', 'BUS', 'METRO', 'TRAIN', 'TRANSIT', 'DRIVING', 'TAXI', 'RIDE_APP', 'BICYCLE', 'OTHER');

-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('BUS', 'METRO', 'TRAIN', 'INTEGRATION', 'TAXI', 'RIDE_APP', 'OTHER');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('FACADE', 'DISPLAY', 'PRODUCT', 'MATERIAL', 'RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('AUTHORIZATION_EXPIRING', 'AUTHORIZATION_EXPIRED', 'VISIT_UPCOMING', 'VISIT_PENDING', 'ROUTE_CHANGED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RouteTemplateKind" AS ENUM ('STANDARD', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "VisitActivityType" AS ENUM ('NOTE', 'ACTIVITY', 'STATUS_CHANGE', 'PHOTO', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(191) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" VARCHAR(36),
    "userAgent" VARCHAR(255),
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_addresses" (
    "id" VARCHAR(36) NOT NULL,
    "employeeId" VARCHAR(36) NOT NULL,
    "label" VARCHAR(80),
    "address" VARCHAR(500) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" VARCHAR(36) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "importKey" VARCHAR(191),
    "name" VARCHAR(191) NOT NULL,
    "network" VARCHAR(120) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "neighborhood" VARCHAR(120),
    "city" VARCHAR(120) NOT NULL DEFAULT 'Rio de Janeiro',
    "state" VARCHAR(2) NOT NULL DEFAULT 'RJ',
    "zipCode" VARCHAR(9),
    "region" VARCHAR(80),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geocodeSource" VARCHAR(40),
    "geocodedAt" TIMESTAMP(3),
    "observations" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorization_letters" (
    "id" VARCHAR(36) NOT NULL,
    "storeId" VARCHAR(36) NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "fileUrl" VARCHAR(500) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "issueDate" DATE,
    "validFrom" DATE,
    "expirationDate" DATE,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "uploadedById" VARCHAR(36),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authorization_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorization_letter_history" (
    "id" VARCHAR(36) NOT NULL,
    "letterId" VARCHAR(36) NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "fileUrl" VARCHAR(500),
    "fileName" VARCHAR(255),
    "details" TEXT,
    "userId" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorization_letter_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" VARCHAR(36) NOT NULL,
    "employeeId" VARCHAR(36) NOT NULL,
    "date" DATE NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "region" VARCHAR(80),
    "startAddress" VARCHAR(500) NOT NULL,
    "startLatitude" DOUBLE PRECISION,
    "startLongitude" DOUBLE PRECISION,
    "estimatedDistance" INTEGER,
    "estimatedDuration" INTEGER,
    "estimatedTransportCost" DECIMAL(10,2),
    "actualTransportCost" DECIMAL(10,2),
    "returnDistance" INTEGER,
    "returnDuration" INTEGER,
    "returnTransportMode" "TransportMode",
    "returnTravelCost" DECIMAL(10,2),
    "returnSummary" VARCHAR(500),
    "legsProvider" VARCHAR(40),
    "legsComputedAt" TIMESTAMP(3),
    "templateId" VARCHAR(36),
    "notes" TEXT,
    "importKey" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" VARCHAR(36) NOT NULL,
    "routeId" VARCHAR(36) NOT NULL,
    "storeId" VARCHAR(36) NOT NULL,
    "visitId" VARCHAR(36),
    "order" INTEGER NOT NULL,
    "estimatedArrival" TIMESTAMP(3),
    "actualArrival" TIMESTAMP(3),
    "travelDistance" INTEGER,
    "travelDuration" INTEGER,
    "transportMode" "TransportMode",
    "travelCost" DECIMAL(10,2),
    "travelSummary" VARCHAR(500),

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_templates" (
    "id" VARCHAR(36) NOT NULL,
    "employeeId" VARCHAR(36) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "kind" "RouteTemplateKind" NOT NULL DEFAULT 'STANDARD',
    "cycleWeeks" INTEGER NOT NULL DEFAULT 1,
    "anchorDate" DATE,
    "validFrom" DATE,
    "validUntil" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "importKey" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_template_stops" (
    "id" VARCHAR(36) NOT NULL,
    "templateId" VARCHAR(36) NOT NULL,
    "storeId" VARCHAR(36) NOT NULL,
    "weekday" INTEGER NOT NULL,
    "weekIndex" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL,

    CONSTRAINT "route_template_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" VARCHAR(36) NOT NULL,
    "routeId" VARCHAR(36),
    "storeId" VARCHAR(36) NOT NULL,
    "employeeId" VARCHAR(36) NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "VisitStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "statusReason" VARCHAR(500),
    "latitudeAtStart" DOUBLE PRECISION,
    "longitudeAtStart" DOUBLE PRECISION,
    "accuracyAtStart" DOUBLE PRECISION,
    "latitudeAtFinish" DOUBLE PRECISION,
    "longitudeAtFinish" DOUBLE PRECISION,
    "accuracyAtFinish" DOUBLE PRECISION,
    "rescheduledFromId" VARCHAR(36),
    "importKey" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_photos" (
    "id" VARCHAR(36) NOT NULL,
    "visitId" VARCHAR(36) NOT NULL,
    "fileUrl" VARCHAR(500) NOT NULL,
    "thumbnailUrl" VARCHAR(500),
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "optimizedSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "category" "PhotoCategory" NOT NULL DEFAULT 'OTHER',
    "caption" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_activities" (
    "id" VARCHAR(36) NOT NULL,
    "visitId" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36),
    "type" "VisitActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_expenses" (
    "id" VARCHAR(36) NOT NULL,
    "employeeId" VARCHAR(36) NOT NULL,
    "routeId" VARCHAR(36),
    "visitId" VARCHAR(36),
    "date" DATE NOT NULL,
    "type" "TransportType" NOT NULL,
    "description" VARCHAR(500),
    "value" DECIMAL(10,2) NOT NULL,
    "estimatedValue" DECIMAL(10,2),
    "actualValue" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_fares" (
    "id" VARCHAR(36) NOT NULL,
    "type" "TransportType" NOT NULL,
    "operator" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "value" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_fares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(191) NOT NULL,
    "message" TEXT NOT NULL,
    "link" VARCHAR(500),
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36),
    "entity" VARCHAR(60) NOT NULL,
    "entityId" VARCHAR(191),
    "action" VARCHAR(60) NOT NULL,
    "metadata" TEXT,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_accesses" (
    "id" VARCHAR(36) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "tokenPreview" VARCHAR(12) NOT NULL,
    "scope" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" VARCHAR(36) NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_runs" (
    "id" VARCHAR(36) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileHash" VARCHAR(64) NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(40) NOT NULL,
    "summary" TEXT NOT NULL,
    "issues" TEXT NOT NULL,
    "userId" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "home_addresses_employeeId_active_idx" ON "home_addresses"("employeeId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "stores_code_key" ON "stores"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stores_importKey_key" ON "stores"("importKey");

-- CreateIndex
CREATE INDEX "stores_network_idx" ON "stores"("network");

-- CreateIndex
CREATE INDEX "stores_region_idx" ON "stores"("region");

-- CreateIndex
CREATE INDEX "stores_neighborhood_idx" ON "stores"("neighborhood");

-- CreateIndex
CREATE INDEX "stores_active_idx" ON "stores"("active");

-- CreateIndex
CREATE INDEX "authorization_letters_storeId_idx" ON "authorization_letters"("storeId");

-- CreateIndex
CREATE INDEX "authorization_letters_expirationDate_idx" ON "authorization_letters"("expirationDate");

-- CreateIndex
CREATE INDEX "authorization_letters_status_deletedAt_idx" ON "authorization_letters"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "authorization_letter_history_letterId_createdAt_idx" ON "authorization_letter_history"("letterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "routes_importKey_key" ON "routes"("importKey");

-- CreateIndex
CREATE INDEX "routes_date_idx" ON "routes"("date");

-- CreateIndex
CREATE UNIQUE INDEX "routes_employeeId_date_key" ON "routes"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_visitId_key" ON "route_stops"("visitId");

-- CreateIndex
CREATE INDEX "route_stops_routeId_order_idx" ON "route_stops"("routeId", "order");

-- CreateIndex
CREATE INDEX "route_stops_storeId_idx" ON "route_stops"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "route_templates_importKey_key" ON "route_templates"("importKey");

-- CreateIndex
CREATE INDEX "route_templates_employeeId_active_idx" ON "route_templates"("employeeId", "active");

-- CreateIndex
CREATE INDEX "route_template_stops_templateId_weekIndex_weekday_order_idx" ON "route_template_stops"("templateId", "weekIndex", "weekday", "order");

-- CreateIndex
CREATE INDEX "route_template_stops_storeId_idx" ON "route_template_stops"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "route_template_stops_templateId_weekIndex_weekday_storeId_key" ON "route_template_stops"("templateId", "weekIndex", "weekday", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "visits_rescheduledFromId_key" ON "visits"("rescheduledFromId");

-- CreateIndex
CREATE UNIQUE INDEX "visits_importKey_key" ON "visits"("importKey");

-- CreateIndex
CREATE INDEX "visits_employeeId_scheduledDate_idx" ON "visits"("employeeId", "scheduledDate");

-- CreateIndex
CREATE INDEX "visits_storeId_scheduledDate_idx" ON "visits"("storeId", "scheduledDate");

-- CreateIndex
CREATE INDEX "visits_routeId_order_idx" ON "visits"("routeId", "order");

-- CreateIndex
CREATE INDEX "visits_status_idx" ON "visits"("status");

-- CreateIndex
CREATE INDEX "visits_scheduledDate_idx" ON "visits"("scheduledDate");

-- CreateIndex
CREATE INDEX "visit_photos_visitId_createdAt_idx" ON "visit_photos"("visitId", "createdAt");

-- CreateIndex
CREATE INDEX "visit_activities_visitId_createdAt_idx" ON "visit_activities"("visitId", "createdAt");

-- CreateIndex
CREATE INDEX "visit_activities_createdAt_idx" ON "visit_activities"("createdAt");

-- CreateIndex
CREATE INDEX "transport_expenses_employeeId_date_idx" ON "transport_expenses"("employeeId", "date");

-- CreateIndex
CREATE INDEX "transport_expenses_routeId_idx" ON "transport_expenses"("routeId");

-- CreateIndex
CREATE INDEX "transport_expenses_visitId_idx" ON "transport_expenses"("visitId");

-- CreateIndex
CREATE INDEX "transport_fares_type_active_idx" ON "transport_fares"("type", "active");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupeKey_key" ON "notifications"("dedupeKey");

-- CreateIndex
CREATE INDEX "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "shared_accesses_tokenHash_key" ON "shared_accesses"("tokenHash");

-- CreateIndex
CREATE INDEX "shared_accesses_active_idx" ON "shared_accesses"("active");

-- CreateIndex
CREATE UNIQUE INDEX "company_settings_key_key" ON "company_settings"("key");

-- CreateIndex
CREATE INDEX "import_runs_createdAt_idx" ON "import_runs"("createdAt");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_addresses" ADD CONSTRAINT "home_addresses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_letters" ADD CONSTRAINT "authorization_letters_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_letters" ADD CONSTRAINT "authorization_letters_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_letter_history" ADD CONSTRAINT "authorization_letter_history_letterId_fkey" FOREIGN KEY ("letterId") REFERENCES "authorization_letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_letter_history" ADD CONSTRAINT "authorization_letter_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "route_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_templates" ADD CONSTRAINT "route_templates_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_template_stops" ADD CONSTRAINT "route_template_stops_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "route_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_template_stops" ADD CONSTRAINT "route_template_stops_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_photos" ADD CONSTRAINT "visit_photos_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_activities" ADD CONSTRAINT "visit_activities_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_activities" ADD CONSTRAINT "visit_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_expenses" ADD CONSTRAINT "transport_expenses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_expenses" ADD CONSTRAINT "transport_expenses_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_expenses" ADD CONSTRAINT "transport_expenses_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_accesses" ADD CONSTRAINT "shared_accesses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_runs" ADD CONSTRAINT "import_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
