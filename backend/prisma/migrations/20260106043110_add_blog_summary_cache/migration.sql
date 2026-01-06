-- CreateTable
CREATE TABLE "blog_summary_caches" (
    "id" SERIAL NOT NULL,
    "blog_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "post_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "date_str" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_summary_caches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_summary_caches_keyword_post_type_date_str_idx" ON "blog_summary_caches"("keyword", "post_type", "date_str");

-- CreateIndex
CREATE INDEX "blog_summary_caches_blog_id_idx" ON "blog_summary_caches"("blog_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_summary_caches_blog_id_keyword_post_type_date_str_key" ON "blog_summary_caches"("blog_id", "keyword", "post_type", "date_str");

-- AddForeignKey
ALTER TABLE "blog_summary_caches" ADD CONSTRAINT "blog_summary_caches_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
