-- AlterTable: Add display_id column to blog_posts (3-step approach)

-- Step 1: Add column as nullable
ALTER TABLE "blog_posts" ADD COLUMN "display_id" TEXT;

-- Step 2: Generate displayId for existing rows
-- Format: YYYYMMDD + Base36 sequence (000-ZZZ)
WITH numbered_posts AS (
  SELECT
    id,
    created_at,
    TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD') as date_prefix,
    (ROW_NUMBER() OVER (
      PARTITION BY TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD')
      ORDER BY id
    ) - 1)::INTEGER as seq
  FROM "blog_posts"
),
display_ids AS (
  SELECT
    id,
    date_prefix ||
    CASE
      WHEN seq <= 46655 THEN
        -- Base36 encoding: 3 digits (000-ZZZ)
        SUBSTRING('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (seq / 1296)::INTEGER + 1, 1) ||
        SUBSTRING('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', ((seq % 1296) / 36)::INTEGER + 1, 1) ||
        SUBSTRING('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', (seq % 36)::INTEGER + 1, 1)
      ELSE
        seq::TEXT
    END as display_id
  FROM numbered_posts
)
UPDATE "blog_posts" bp
SET display_id = d.display_id
FROM display_ids d
WHERE bp.id = d.id;

-- Step 3: Make column NOT NULL and add unique constraint
ALTER TABLE "blog_posts" ALTER COLUMN "display_id" SET NOT NULL;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_display_id_key" UNIQUE ("display_id");
