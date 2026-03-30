-- CreateTable
CREATE TABLE "hot_novels" (
    "id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hotScore" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hot_novels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hot_novels_rank_key" ON "hot_novels"("rank");

-- CreateIndex
CREATE INDEX "hot_novels_rank_idx" ON "hot_novels"("rank");
