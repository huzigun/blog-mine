-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('SUBSCRIPTION_GRANT', 'PURCHASE', 'BONUS', 'PROMO', 'USAGE', 'REFUND', 'EXPIRE', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('SUBSCRIPTION', 'PURCHASED', 'BONUS');

-- CreateEnum
CREATE TYPE "SubscriptionAction" AS ENUM ('CREATED', 'RENEWED', 'UPGRADED', 'DOWNGRADED', 'CANCELLED', 'EXPIRED', 'REACTIVATED', 'PAYMENT_FAILED');

-- CreateTable
CREATE TABLE "business_info" (
    "id" SERIAL NOT NULL,
    "business_name" TEXT,
    "business_number" TEXT,
    "business_owner" TEXT,
    "business_address" TEXT,
    "business_type" TEXT,
    "business_category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "business_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "yearly_price" INTEGER,
    "monthly_credits" INTEGER NOT NULL DEFAULT 0,
    "max_blog_posts_per_month" INTEGER NOT NULL,
    "max_post_length" INTEGER NOT NULL,
    "max_keyword_trackings" INTEGER NOT NULL,
    "max_personas" INTEGER NOT NULL,
    "allow_priority_queue" BOOLEAN NOT NULL DEFAULT false,
    "allow_advanced_analytics" BOOLEAN NOT NULL DEFAULT false,
    "allow_api_access" BOOLEAN NOT NULL DEFAULT false,
    "allow_custom_personas" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "canceled_at" TIMESTAMP(3),
    "auto_renewal" BOOLEAN NOT NULL DEFAULT true,
    "next_billing_date" TIMESTAMP(3),
    "last_payment_date" TIMESTAMP(3),
    "last_payment_amount" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_usage_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "resource" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" TEXT,
    "transaction_id" TEXT,
    "receipt_url" TEXT,
    "refunded_at" TIMESTAMP(3),
    "refund_amount" INTEGER,
    "refund_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "customer_key" TEXT NOT NULL,
    "authenticated_at" TIMESTAMP(3),
    "method" TEXT,
    "billing_key" TEXT,
    "card_company" TEXT,
    "issuer_code" TEXT,
    "acquirer_code" TEXT,
    "number" TEXT,
    "card_type" TEXT,
    "owner_type" TEXT,
    "is_authenticated" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nicepay_results" (
    "id" SERIAL NOT NULL,
    "moid" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "result_code" TEXT,
    "result_msg" TEXT,
    "msg_source" TEXT,
    "amt" TEXT,
    "mid" TEXT,
    "buyer_email" TEXT,
    "buyer_tel" TEXT,
    "buyer_name" TEXT,
    "goods_name" TEXT,
    "tid" TEXT,
    "auth_code" TEXT,
    "auth_date" TEXT,
    "pay_method" TEXT,
    "cart_data" TEXT,
    "mall_reserved" TEXT,
    "card_code" TEXT,
    "card_name" TEXT,
    "card_no" TEXT,
    "card_quota" TEXT,
    "card_interest" TEXT,
    "acqu_card_code" TEXT,
    "acqu_card_name" TEXT,
    "card_cl" TEXT,
    "cc_part_cl" TEXT,
    "coupon_amt" TEXT,
    "coupon_min_amt" TEXT,
    "point_app_amt" TEXT,
    "clickpay_cl" TEXT,
    "multi_cl" TEXT,
    "multi_card_acqu_amt" TEXT,
    "multi_point_amt" TEXT,
    "multi_coupon_amt" TEXT,
    "multi_discount_amt" TEXT,
    "rcpt_type" TEXT,
    "rcpt_tid" TEXT,
    "rcpt_auth_code" TEXT,
    "card_type" TEXT,
    "approve_card_quota" TEXT,
    "point_cl" TEXT,
    "vbank_bank_code" TEXT,
    "vbank_bank_name" TEXT,
    "vbank_num" TEXT,
    "vbank_exp_date" TEXT,
    "vbank_exp_time" TEXT,
    "bank_code" TEXT,
    "bank_name" TEXT,
    "cancel_amt" TEXT,
    "cancel_date" TEXT,
    "cancel_time" TEXT,
    "cancel_num" TEXT,
    "remain_amt" TEXT,
    "error_cd" TEXT,
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "nicepay_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subscription_credits" INTEGER NOT NULL DEFAULT 0,
    "purchased_credits" INTEGER NOT NULL DEFAULT 0,
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "total_credits" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" SERIAL NOT NULL,
    "account_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "credit_type" "CreditType" NOT NULL,
    "description" TEXT,
    "reference_type" TEXT,
    "reference_id" INTEGER,
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_histories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subscription_id" INTEGER,
    "plan_id" INTEGER NOT NULL,
    "plan_name" TEXT NOT NULL,
    "plan_price" INTEGER NOT NULL,
    "action" "SubscriptionAction" NOT NULL,
    "old_status" "SubscriptionStatus",
    "new_status" "SubscriptionStatus",
    "started_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "credits_granted" INTEGER,
    "payment_id" INTEGER,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_info_user_id_key" ON "business_info"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE INDEX "subscription_plans_is_active_sort_order_idx" ON "subscription_plans"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "user_subscriptions_user_id_status_idx" ON "user_subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "user_subscriptions_status_expires_at_idx" ON "user_subscriptions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "subscription_usage_logs_user_id_created_at_idx" ON "subscription_usage_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "subscription_usage_logs_resource_created_at_idx" ON "subscription_usage_logs"("resource", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cards_customer_key_key" ON "cards"("customer_key");

-- CreateIndex
CREATE INDEX "cards_user_id_idx" ON "cards"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "nicepay_results_moid_key" ON "nicepay_results"("moid");

-- CreateIndex
CREATE UNIQUE INDEX "credit_accounts_user_id_key" ON "credit_accounts"("user_id");

-- CreateIndex
CREATE INDEX "credit_accounts_user_id_idx" ON "credit_accounts"("user_id");

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_created_at_idx" ON "credit_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "credit_transactions_account_id_created_at_idx" ON "credit_transactions"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "credit_transactions_type_created_at_idx" ON "credit_transactions"("type", "created_at");

-- CreateIndex
CREATE INDEX "subscription_histories_user_id_created_at_idx" ON "subscription_histories"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "subscription_histories_subscription_id_idx" ON "subscription_histories"("subscription_id");

-- AddForeignKey
ALTER TABLE "business_info" ADD CONSTRAINT "business_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usage_logs" ADD CONSTRAINT "subscription_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "credit_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_histories" ADD CONSTRAINT "subscription_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
