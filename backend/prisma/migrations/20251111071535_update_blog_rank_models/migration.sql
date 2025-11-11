-- CreateTable
CREATE TABLE "keyword_dates" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "date_str" TEXT NOT NULL,
    "total_results" INTEGER,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_ranks" (
    "id" SERIAL NOT NULL,
    "keyword_date_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blog_id" INTEGER NOT NULL,

    CONSTRAINT "blog_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blogs" (
    "id" SERIAL NOT NULL,
    "link" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "blogger_name" TEXT NOT NULL,
    "blogger_link" TEXT NOT NULL,
    "post_date" TEXT NOT NULL,
    "content" TEXT,
    "real_url" TEXT,
    "last_fetched_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "keyword_dates_date_str_idx" ON "keyword_dates"("date_str");

-- CreateIndex
CREATE UNIQUE INDEX "keyword_dates_keyword_date_str_key" ON "keyword_dates"("keyword", "date_str");

-- CreateIndex
CREATE INDEX "blog_ranks_keyword_date_id_blog_id_idx" ON "blog_ranks"("keyword_date_id", "blog_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_ranks_keyword_date_id_rank_key" ON "blog_ranks"("keyword_date_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "blogs_link_key" ON "blogs"("link");

-- CreateIndex
CREATE INDEX "blogs_blogger_name_idx" ON "blogs"("blogger_name");

-- AddForeignKey
ALTER TABLE "blog_ranks" ADD CONSTRAINT "blog_ranks_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_ranks" ADD CONSTRAINT "blog_ranks_keyword_date_id_fkey" FOREIGN KEY ("keyword_date_id") REFERENCES "keyword_dates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
