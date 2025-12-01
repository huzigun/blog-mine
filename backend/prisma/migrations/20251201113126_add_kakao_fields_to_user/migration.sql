-- AlterTable
ALTER TABLE "users" ADD COLUMN     "kakao_id" TEXT,
ADD COLUMN     "kakao_nickname" TEXT,
ADD COLUMN     "kakao_profile_image" TEXT,
ADD COLUMN     "kakao_connected_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_kakao_id_key" ON "users"("kakao_id");
