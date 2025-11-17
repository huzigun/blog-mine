-- AlterTable: Make subscription plan limit fields nullable
-- null = unlimited

ALTER TABLE "subscription_plans"
  ALTER COLUMN "max_blog_posts_per_month" DROP NOT NULL,
  ALTER COLUMN "max_post_length" DROP NOT NULL,
  ALTER COLUMN "max_keyword_trackings" DROP NOT NULL,
  ALTER COLUMN "max_personas" DROP NOT NULL;
