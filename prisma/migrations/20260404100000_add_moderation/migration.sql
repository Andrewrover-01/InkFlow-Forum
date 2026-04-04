-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('POST', 'REPLY', 'COMMENT');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'SENSITIVE', 'ILLEGAL', 'PORN', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- AlterTable: add moderationStatus to posts
ALTER TABLE "posts" ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable: add moderationStatus to replies
ALTER TABLE "replies" ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable: add moderationStatus to comments
ALTER TABLE "comments" ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "moderation_records" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "autoFlags" TEXT[],
    "machineScore" INTEGER NOT NULL DEFAULT 0,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_records_contentType_contentId_idx" ON "moderation_records"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "moderation_records_status_createdAt_idx" ON "moderation_records"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "reports_contentType_contentId_idx" ON "reports"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "moderation_records" ADD CONSTRAINT "moderation_records_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
