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
  blogStyle: z.string().min(1, '블로그 문체를 선택해주세요'),
  blogTone: z.string().min(1, '블로그 분위기를 선택해주세요'),
  additionalInfo: z.string().optional(),
});

// 페르소나 수정 스키마 (모든 필드 optional)
export const updatePersonaSchema = createPersonaSchema.partial();

// TypeScript 타입 추출
export type CreatePersonaSchema = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaSchema = z.infer<typeof updatePersonaSchema>;

// 선택 옵션들
export const genderOptions = ['남성', '여성', '기타'];

export const blogStyleOptions = [
  '따뜻한 공감형',
  '객관 정보형',
  '유머∙위트형',
  '전문가 신뢰형',
  '브랜드 큐레이션형',
];

export const blogToneOptions = [
  '편안한',
  '공손한',
  '열정적인',
  '차분한',
  '긍정적인',
  '중립적인',
  '신뢰감 있는',
  '친밀한',
];
