-- CreateEnum
CREATE TYPE "RecordVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "WishStatus" AS ENUM ('PENDING', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "UserTask" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isWished" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomWish" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" UUID,
    "status" "WishStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomWish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplorationRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taskId" UUID,
    "customWishId" UUID,
    "titleSnapshot" TEXT NOT NULL,
    "reflectionText" TEXT,
    "photoRefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" "RecordVisibility" NOT NULL DEFAULT 'PRIVATE',
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExplorationRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExplorationRecord_link_check" CHECK (NOT ("taskId" IS NOT NULL AND "customWishId" IS NOT NULL))
);

-- CreateIndex
CREATE INDEX "UserTask_userId_isFavorite_idx" ON "UserTask"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "UserTask_userId_isWished_idx" ON "UserTask"("userId", "isWished");

-- CreateIndex
CREATE INDEX "UserTask_userId_completedAt_idx" ON "UserTask"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserTask_userId_taskId_key" ON "UserTask"("userId", "taskId");

-- CreateIndex
CREATE INDEX "CustomWish_userId_status_idx" ON "CustomWish"("userId", "status");

-- CreateIndex
CREATE INDEX "CustomWish_userId_createdAt_idx" ON "CustomWish"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExplorationRecord_userId_createdAt_idx" ON "ExplorationRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExplorationRecord_visibility_completedAt_idx" ON "ExplorationRecord"("visibility", "completedAt");

-- CreateIndex
CREATE INDEX "ExplorationRecord_taskId_idx" ON "ExplorationRecord"("taskId");

-- CreateIndex
CREATE INDEX "ExplorationRecord_customWishId_idx" ON "ExplorationRecord"("customWishId");

-- AddForeignKey
ALTER TABLE "UserTask" ADD CONSTRAINT "UserTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTask" ADD CONSTRAINT "UserTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomWish" ADD CONSTRAINT "CustomWish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomWish" ADD CONSTRAINT "CustomWish_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationRecord" ADD CONSTRAINT "ExplorationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationRecord" ADD CONSTRAINT "ExplorationRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExplorationRecord" ADD CONSTRAINT "ExplorationRecord_customWishId_fkey" FOREIGN KEY ("customWishId") REFERENCES "CustomWish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
