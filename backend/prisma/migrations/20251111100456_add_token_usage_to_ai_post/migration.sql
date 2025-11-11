-- AlterTable
ALTER TABLE "ai_posts" ADD COLUMN     "completion_tokens" INTEGER,
ADD COLUMN     "prompt_tokens" INTEGER,
ADD COLUMN     "total_tokens" INTEGER;
