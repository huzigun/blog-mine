import { z } from 'zod';

/**
 * Persona Schema - 페르소나 생성 및 수정을 위한 Zod 스키마
 */

// 페르소나 생성 스키마
export const createPersonaSchema = z.object({
  gender: z.string().min(1, '성별을 선택해주세요'),
  age: z
    .number()
    .min(1, '나이를 입력해주세요')
    .max(120, '올바른 나이를 입력해주세요'),
  isMarried: z.boolean(),
  hasChildren: z.boolean(),
  occupation: z.string().min(1, '직업을 입력해주세요'),
  additionalInfo: z.string().optional(),
});

// 페르소나 수정 스키마 (모든 필드 optional)
export const updatePersonaSchema = createPersonaSchema.partial();

// TypeScript 타입 추출
export type CreatePersonaSchema = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaSchema = z.infer<typeof updatePersonaSchema>;

// 선택 옵션들
export const genderOptions = ['남성', '여성', '기타'];

export const occupationOptions = [
  '학생',
  '직장인',
  '음식점 사장님',
  '카페 사장님',
  '온라인 쇼핑몰 사장님',
  '여행가',
  '요리사',
  '패션 전문가',
  '콘텐츠 크리에이터',
  '교사',
  '강사',
  '마케팅 담당자',
];
