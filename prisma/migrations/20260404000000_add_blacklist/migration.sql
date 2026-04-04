-- CreateEnum
CREATE TYPE "BlacklistType" AS ENUM ('IP', 'USER_ID', 'FINGERPRINT');

-- CreateEnum
CREATE TYPE "BlacklistLevel" AS ENUM ('BLACK', 'GRAY');

-- CreateTable
CREATE TABLE "blacklist_entries" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "BlacklistType" NOT NULL,
    "level" "BlacklistLevel" NOT NULL DEFAULT 'BLACK',
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blacklist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blacklist_entries_key_type_key" ON "blacklist_entries"("key", "type");

-- CreateIndex
CREATE INDEX "blacklist_entries_key_type_idx" ON "blacklist_entries"("key", "type");
