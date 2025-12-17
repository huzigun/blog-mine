-- CreateEnum
CREATE TYPE "NotificationImportance" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "importance" "NotificationImportance" NOT NULL DEFAULT 'NORMAL';

-- CreateIndex
CREATE INDEX "notifications_user_id_importance_idx" ON "notifications"("user_id", "importance");
