-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "error_at" TIMESTAMP(3),
ADD COLUMN     "last_error" TEXT,
ADD COLUMN     "started_at" TIMESTAMP(3);
