-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "persona" JSONB NOT NULL,
    "post_type" TEXT NOT NULL,
    "sub_keywords" TEXT[],
    "length" INTEGER NOT NULL DEFAULT 300,
    "count" INTEGER NOT NULL DEFAULT 1,
    "additional_fields" JSONB,
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING',
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "target_count" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_posts" (
    "id" SERIAL NOT NULL,
    "blog_post_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_posts_user_id_created_at_idx" ON "blog_posts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "blog_posts_status_idx" ON "blog_posts"("status");

-- CreateIndex
CREATE INDEX "ai_posts_blog_post_id_created_at_idx" ON "ai_posts"("blog_post_id", "created_at");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_posts" ADD CONSTRAINT "ai_posts_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
