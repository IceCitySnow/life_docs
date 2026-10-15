-- CreateEnum
CREATE TYPE "ContentModerationStatus" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ExplorationRecord" ADD COLUMN     "moderationStatus" "ContentModerationStatus" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN     "hiddenAt" TIMESTAMP(3);

-- DropIndex
DROP INDEX "ExplorationRecord_visibility_completedAt_idx";

-- CreateIndex
CREATE INDEX "ExplorationRecord_visibility_moderationStatus_completedAt_idx" ON "ExplorationRecord"("visibility", "moderationStatus", "completedAt");

-- CreateTable
CREATE TABLE "RecordLike" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordFavorite" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "reporterUserId" UUID NOT NULL,
    "recordId" UUID,
    "taskId" UUID,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),
    "handledByUserId" UUID,
    "resolutionNote" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordLike_recordId_idx" ON "RecordLike"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordLike_userId_recordId_key" ON "RecordLike"("userId", "recordId");

-- CreateIndex
CREATE INDEX "RecordFavorite_recordId_idx" ON "RecordFavorite"("recordId");

-- CreateIndex
CREATE INDEX "RecordFavorite_userId_createdAt_idx" ON "RecordFavorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecordFavorite_userId_recordId_key" ON "RecordFavorite"("userId", "recordId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_recordId_idx" ON "Report"("recordId");

-- CreateIndex
CREATE INDEX "Report_taskId_idx" ON "Report"("taskId");

-- CreateIndex
CREATE INDEX "Report_reporterUserId_createdAt_idx" ON "Report"("reporterUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "RecordLike" ADD CONSTRAINT "RecordLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordLike" ADD CONSTRAINT "RecordLike_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ExplorationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordFavorite" ADD CONSTRAINT "RecordFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordFavorite" ADD CONSTRAINT "RecordFavorite_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ExplorationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ExplorationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_handledByUserId_fkey" FOREIGN KEY ("handledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
