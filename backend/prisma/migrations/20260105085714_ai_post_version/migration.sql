-- AlterTable
ALTER TABLE "ai_posts" ADD COLUMN     "current_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "edit_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ai_post_versions" (
    "id" SERIAL NOT NULL,
    "ai_post_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "edit_request" TEXT,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_post_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_post_versions_ai_post_id_version_idx" ON "ai_post_versions"("ai_post_id", "version");

-- AddForeignKey
ALTER TABLE "ai_post_versions" ADD CONSTRAINT "ai_post_versions_ai_post_id_fkey" FOREIGN KEY ("ai_post_id") REFERENCES "ai_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
