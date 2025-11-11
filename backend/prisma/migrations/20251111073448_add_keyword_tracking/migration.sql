-- CreateTable
CREATE TABLE "keyword_trackings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "my_blog_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_count" INTEGER NOT NULL DEFAULT 40,
    "last_collected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keyword_trackings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "keyword_trackings_user_id_is_active_idx" ON "keyword_trackings"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "keyword_trackings_is_active_idx" ON "keyword_trackings"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "keyword_trackings_user_id_keyword_my_blog_url_key" ON "keyword_trackings"("user_id", "keyword", "my_blog_url");

-- AddForeignKey
ALTER TABLE "keyword_trackings" ADD CONSTRAINT "keyword_trackings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
