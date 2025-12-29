import { z } from 'zod';

/**
 * Persona Schema - 페르소나 생성 및 수정을 위한 Zod 스키마
 */

// 페르소나 생성 스키마
export const createPersonaSchema = z.object({
  gender: z.string().min(1, '성별을 선택해주세요'),
  blogTopic: z.string().min(1, '운영중인 블로그 주제를 입력해주세요'),
  characteristics: z.string().optional(),
});

// 페르소나 수정 스키마 (모든 필드 optional)
export const updatePersonaSchema = createPersonaSchema.partial();

// TypeScript 타입 추출
export type CreatePersonaSchema = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaSchema = z.infer<typeof updatePersonaSchema>;

// 선택 옵션들
export const genderOptions = ['남성', '여성', '기타'];

// 블로그 주제 옵션
export const blogTopicOptions = [
  '맛집/카페',
  '여행/나들이',
  '육아/교육',
  '뷰티/패션',
  '건강/운동',
  '요리/레시피',
  '인테리어/리빙',
  '반려동물',
  '자동차/바이크',
  '게임/IT',
  '독서/자기계발',
  '일상/라이프',
  '직접 입력',
];
