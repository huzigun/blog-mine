-- CreateTable
CREATE TABLE "keyword_stat_caches" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "date_str" TEXT NOT NULL,
    "keyword_list" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_stat_caches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "keyword_stat_caches_date_str_idx" ON "keyword_stat_caches"("date_str");

-- CreateIndex
CREATE UNIQUE INDEX "keyword_stat_caches_keyword_date_str_key" ON "keyword_stat_caches"("keyword", "date_str");
