/*
  Warnings:

  - A unique constraint covering the columns `[keyword_date_id,blog_id]` on the table `blog_ranks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "keyword_trackings" ADD COLUMN     "blog_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "blog_ranks_keyword_date_id_blog_id_key" ON "blog_ranks"("keyword_date_id", "blog_id");

-- AddForeignKey
ALTER TABLE "keyword_trackings" ADD CONSTRAINT "keyword_trackings_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
