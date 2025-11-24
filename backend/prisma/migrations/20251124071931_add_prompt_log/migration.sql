-- CreateTable
CREATE TABLE "prompt_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "blog_post_id" INTEGER,
    "ai_post_id" INTEGER,
    "system_prompt" TEXT NOT NULL,
    "user_prompt" TEXT NOT NULL,
    "full_prompt" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "temperature" DOUBLE PRECISION,
    "max_tokens" INTEGER,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "response" TEXT,
    "response_time" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "purpose" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompt_logs_user_id_created_at_idx" ON "prompt_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "prompt_logs_blog_post_id_idx" ON "prompt_logs"("blog_post_id");

-- CreateIndex
CREATE INDEX "prompt_logs_ai_post_id_idx" ON "prompt_logs"("ai_post_id");

-- CreateIndex
CREATE INDEX "prompt_logs_created_at_idx" ON "prompt_logs"("created_at");
