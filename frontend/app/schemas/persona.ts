import { z } from 'zod';

/**
 * Persona Schema - 페르소나 생성 및 수정을 위한 Zod 스키마
 */

// 페르소나 생성 스키마
export const createPersonaSchema = z.object({
  gender: z.string().min(1, '성별을 선택해주세요'),
  age: z.number().min(1, '나이를 입력해주세요').max(120, '올바른 나이를 입력해주세요'),
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

// API Response 타입
export interface Persona {
  id: number;
  gender: string;
  age: number;
  isMarried: boolean;
  hasChildren: boolean;
  occupation: string;
  blogStyle: string;
  blogTone: string;
  additionalInfo?: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
}

// 선택 옵션들
export const genderOptions = ['남성', '여성', '기타'];

export const blogStyleOptions = [
  '친근한',
  '전문적인',
  '유머러스',
  '감성적인',
  '간결한',
  '상세한',
  '캐주얼',
  '공식적인',
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
