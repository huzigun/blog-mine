import { z } from 'zod';

export const contactCategoryEnum = z.enum([
  'GENERAL',
  'TECHNICAL',
  'BILLING',
  'FEATURE',
  'BUG',
  'PARTNERSHIP',
  'OTHER',
]);

export const contactSchema = z.object({
  name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(100, '이름은 100자 이내로 입력해주세요'),
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  phone: z.string().max(20, '전화번호는 20자 이내로 입력해주세요').optional(),
  subject: z
    .string()
    .min(1, '제목을 입력해주세요')
    .max(200, '제목은 200자 이내로 입력해주세요'),
  message: z
    .string()
    .min(10, '문의 내용은 최소 10자 이상 입력해주세요')
    .max(5000, '문의 내용은 5000자 이내로 입력해주세요'),
  category: contactCategoryEnum.default('GENERAL'),
});

export type ContactSchema = z.infer<typeof contactSchema>;

export const contactCategoryLabels: Record<
  z.infer<typeof contactCategoryEnum>,
  string
> = {
  GENERAL: '일반 문의',
  TECHNICAL: '기술 지원',
  BILLING: '결제/구독 문의',
  FEATURE: '기능 제안',
  BUG: '버그 신고',
  PARTNERSHIP: '제휴 문의',
  OTHER: '기타',
};
