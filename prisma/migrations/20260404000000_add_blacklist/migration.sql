-- CreateEnum
CREATE TYPE "BlacklistType" AS ENUM ('IP', 'FINGERPRINT', 'USER_ID');

-- CreateEnum
CREATE TYPE "BlacklistLevel" AS ENUM ('GRAY', 'BLACK');

-- CreateTable
CREATE TABLE "blacklist_entries" (
    "id" TEXT NOT NULL,
    "type" "BlacklistType" NOT NULL,
    "value" TEXT NOT NULL,
    "level" "BlacklistLevel" NOT NULL DEFAULT 'BLACK',
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "blacklist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blacklist_entries_type_value_idx" ON "blacklist_entries"("type", "value");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "blacklist_entries_type_value_key" ON "blacklist_entries"("type", "value");
