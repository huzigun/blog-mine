-- DropColumns: Remove unused columns from subscription_plans table
-- These columns are no longer needed as the features are not being used

ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "max_blog_posts_per_month";
ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "max_post_length";
ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "max_personas";
ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "allow_priority_queue";
ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "allow_advanced_analytics";
ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "allow_api_access";
ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "allow_custom_personas";
