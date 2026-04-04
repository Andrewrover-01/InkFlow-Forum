-- CreateEnum
CREATE TYPE "SensitiveWordCategory" AS ENUM ('BASIC', 'NOVEL', 'CUSTOM');

-- CreateTable
CREATE TABLE "sensitive_words" (
    "id"        TEXT NOT NULL,
    "word"      TEXT NOT NULL,
    "category"  "SensitiveWordCategory" NOT NULL DEFAULT 'CUSTOM',
    "severity"  INTEGER NOT NULL DEFAULT 50,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "sensitive_words_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sensitive_words_word_key" ON "sensitive_words"("word");

-- CreateIndex
CREATE INDEX "sensitive_words_category_isActive_idx" ON "sensitive_words"("category", "isActive");

-- CreateIndex
CREATE INDEX "sensitive_words_word_idx" ON "sensitive_words"("word");
