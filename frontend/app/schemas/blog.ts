import { z } from 'zod'

/**
 * 블로그 포스트 생성/수정 스키마
 */
export const postSchema = z.object({
  title: z
    .string({ required_error: '제목을 입력해주세요' })
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 최대 200자까지 입력 가능합니다'),
  content: z
    .string({ required_error: '내용을 입력해주세요' })
    .min(10, '내용은 최소 10자 이상이어야 합니다')
    .max(50000, '내용은 최대 50,000자까지 입력 가능합니다'),
  excerpt: z
    .string()
    .max(500, '요약은 최대 500자까지 입력 가능합니다')
    .optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'URL slug는 소문자, 숫자, 하이픈만 사용 가능합니다')
    .optional(),
  coverImage: z
    .string()
    .url('올바른 이미지 URL 형식이 아닙니다')
    .optional(),
  tags: z
    .array(z.string())
    .max(10, '태그는 최대 10개까지 추가 가능합니다')
    .optional(),
  published: z
    .boolean()
    .default(false),
  publishedAt: z
    .date()
    .optional(),
})

export type PostSchema = z.infer<typeof postSchema>

/**
 * 댓글 생성 스키마
 */
export const commentSchema = z.object({
  content: z
    .string({ required_error: '댓글 내용을 입력해주세요' })
    .min(1, '댓글 내용을 입력해주세요')
    .max(1000, '댓글은 최대 1,000자까지 입력 가능합니다'),
  parentId: z
    .number()
    .int()
    .positive()
    .optional(), // For reply comments
})

export type CommentSchema = z.infer<typeof commentSchema>

/**
 * 카테고리 생성/수정 스키마
 */
export const categorySchema = z.object({
  name: z
    .string({ required_error: '카테고리 이름을 입력해주세요' })
    .min(1, '카테고리 이름을 입력해주세요')
    .max(50, '카테고리 이름은 최대 50자까지 입력 가능합니다'),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'URL slug는 소문자, 숫자, 하이픈만 사용 가능합니다')
    .optional(),
  description: z
    .string()
    .max(200, '설명은 최대 200자까지 입력 가능합니다')
    .optional(),
})

export type CategorySchema = z.infer<typeof categorySchema>

/**
 * 태그 생성 스키마
 */
export const tagSchema = z.object({
  name: z
    .string({ required_error: '태그 이름을 입력해주세요' })
    .min(1, '태그 이름을 입력해주세요')
    .max(30, '태그 이름은 최대 30자까지 입력 가능합니다')
    .regex(/^[a-zA-Z0-9가-힣\s-]+$/, '태그는 문자, 숫자, 하이픈만 사용 가능합니다'),
})

export type TagSchema = z.infer<typeof tagSchema>

/**
 * 포스트 검색/필터 스키마
 */
export const postFilterSchema = z.object({
  search: z
    .string()
    .max(100, '검색어는 최대 100자까지 입력 가능합니다')
    .optional(),
  category: z
    .string()
    .optional(),
  tags: z
    .array(z.string())
    .optional(),
  published: z
    .boolean()
    .optional(),
  authorId: z
    .number()
    .int()
    .positive()
    .optional(),
  page: z
    .number()
    .int()
    .positive()
    .default(1),
  limit: z
    .number()
    .int()
    .positive()
    .max(100, '한 번에 최대 100개까지 조회 가능합니다')
    .default(10),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'publishedAt', 'title', 'views'])
    .default('createdAt'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),
})

export type PostFilterSchema = z.infer<typeof postFilterSchema>
