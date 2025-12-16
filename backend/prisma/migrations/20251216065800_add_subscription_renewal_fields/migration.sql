-- AlterTable
ALTER TABLE "user_subscriptions" ADD COLUMN     "grace_period_ends_at" TIMESTAMP(3),
ADD COLUMN     "last_renewal_attempt" TIMESTAMP(3),
ADD COLUMN     "renewal_attempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "user_subscriptions_status_auto_renewal_expires_at_idx" ON "user_subscriptions"("status", "auto_renewal", "expires_at");
