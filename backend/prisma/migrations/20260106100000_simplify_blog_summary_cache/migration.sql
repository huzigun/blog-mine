-- SimplifyBlogSummaryCache
-- 캐싱 키에서 keyword, dateStr 제거하여 blogId + postType 조합으로 영구 캐싱

-- 1. 기존 데이터 삭제 (중복 방지)
DELETE FROM "blog_summary_caches";

-- 2. 기존 인덱스 및 제약조건 삭제
DROP INDEX IF EXISTS "blog_summary_caches_keyword_post_type_date_str_idx";
DROP INDEX IF EXISTS "blog_summary_caches_blog_id_keyword_post_type_date_str_key";

-- 3. 불필요한 컬럼 삭제
ALTER TABLE "blog_summary_caches" DROP COLUMN IF EXISTS "keyword";
ALTER TABLE "blog_summary_caches" DROP COLUMN IF EXISTS "date_str";
ALTER TABLE "blog_summary_caches" DROP COLUMN IF EXISTS "fetched_at";

-- 4. 새로운 유니크 제약조건 추가 (blogId + postType)
ALTER TABLE "blog_summary_caches" ADD CONSTRAINT "blog_summary_caches_blog_id_post_type_key" UNIQUE ("blog_id", "post_type");

-- 5. 새로운 인덱스 추가
CREATE INDEX "blog_summary_caches_post_type_idx" ON "blog_summary_caches"("post_type");
