import { z } from 'zod';

/**
 * 상품별 배포 수량 스키마
 */
export const productDistributionSchema = z.object({
  productId: z.number().int(),
  quantity: z.number().int().min(0),
});

export type ProductDistribution = z.infer<typeof productDistributionSchema>;

export interface PostProduct {
  id: number;
  tag: string;
  name: string;
  credit: number;
  description: string;
  features: string[];
}

export const postProducts: PostProduct[] = [
  {
    id: 1,
    tag: '입문용 • 가벼운 체험용',
    name: '일반노출형',
    credit: 24,
    description: '가볍게 시작하는 기본 배포 상품',
    features: [
      '⭐️ 일반 계정으로 게시되는 기본 홍보형 배포',
      '⭐️ 체험단 느낌의 자연스러운 후기·일상 스타일 콘텐츠에 적합',
      '⭐️ 부담 없이 가볍게 홍보를 시작하려는 사장님께 추천',
    ],
  },
  {
    id: 3,
    tag: '밸런스 • 안정형',
    name: '상위 노출형',
    credit: 160,
    description: '사장님들이 가장 많이 선택하는 스탠다드 상품',
    features: [
      '⭐️ 준최 계정에 게시되는 기본 상위노출형',
      '⭐ ️브랜드 정보·가이드·정보성 콘텐츠에 최적',
      '⭐️ 신뢰도 있는 상위 노출을 원하시는 사장님께 추천',
    ],
  },
  {
    id: 10,
    tag: '전문 분야 전용',
    name: '가이드 노출형',
    credit: 33,
    description:
      '까다로운 콘텐츠도 안전하게 제작·배포하는 의료•법률 전용 배포 상품',
    features: [
      '⭐️ 의료·법률 분야용 전문 알고리즘 적용 및 최적화',
      '⭐️ 의학·법률 정보 검수 로직 기반 안전 콘텐츠 생성',
      '⭐️ 고위험 민감정보 가이드라인을 준수하는 문장 구조',
    ],
  },
  {
    id: 12,
    tag: '프리미엄 • 상위 집중',
    name: '프리미엄 상위 노출형',
    credit: 240,
    description: '경쟁 키워드 집중 공략 상품',
    features: [
      '⭐️ 최적화 계정, 일부 저인망까지 포함된 상위노출 특화 세트',
      '⭐ 경쟁 키워드에서도 노출력을 강화하는 고성능 배포 방식',
      '⭐️ 프리미엄 노출 효과가 필요한 사장님께 추천',
    ],
  },
];

/**
 * 원고 배포 신청 폼 스키마
 */
export const orderSchema = z.object({
  // 업체명
  companyName: z
    .string({ required_error: '업체명을 입력해주세요' })
    .min(1, '업체명을 입력해주세요')
    .max(100, '업체명은 최대 100자까지 입력 가능합니다'),

  // 네이버 지도 URL
  naverMapUrl: z
    .string()
    .url('올바른 URL 형식으로 입력해주세요')
    .regex(
      /^https?:\/\/(map\.naver\.com|naver\.me|m\.place\.naver\.com|place\.naver\.com)/,
      '네이버 지도 URL만 입력 가능합니다',
    )
    .optional()
    .or(z.literal('')),

  // 필수 내용 (textarea)
  requiredContent: z
    .string({ required_error: '필수 내용을 입력해주세요' })
    .min(1, '필수 내용을 입력해주세요')
    .max(2000, '필수 내용은 최대 2000자까지 입력 가능합니다'),

  // 신청인 이름
  applicantName: z
    .string({ required_error: '신청인 이름을 입력해주세요' })
    .min(1, '신청인 이름을 입력해주세요')
    .max(50, '이름은 최대 50자까지 입력 가능합니다'),

  // 신청인 연락처
  applicantPhone: z
    .string({ required_error: '연락처를 입력해주세요' })
    .min(1, '연락처를 입력해주세요')
    .regex(
      /^01[016789]-?\d{3,4}-?\d{4}$/,
      '올바른 휴대폰 번호 형식으로 입력해주세요',
    ),

  // 신청인 이메일 주소
  applicantEmail: z
    .string({ required_error: '이메일 주소를 입력해주세요' })
    .min(1, '이메일 주소를 입력해주세요')
    .email('올바른 이메일 형식으로 입력해주세요'),

  // 일 업로드 건수 (직접 입력)
  dailyUploadCount: z
    .number({ required_error: '일 업로드 건수를 입력해주세요' })
    .int('일 업로드 건수는 정수여야 합니다')
    .min(1, '일 업로드 건수는 최소 1건 이상이어야 합니다')
    .max(100, '일 업로드 건수는 최대 100건까지 가능합니다'),

  // 상품별 배포 수량
  productDistributions: z.array(productDistributionSchema).optional(),

  // 추천·보증 등에 관한 표시·광고 심사지침 동의 (선택)
  adGuidelineAgreement: z.boolean().optional().default(false),
});

export type OrderSchema = z.infer<typeof orderSchema>;

/**
 * 원고 배포 요청 모달 스키마 (DeployModal)
 * - 동적 maxPostCount를 인자로 받아 스키마 생성
 */
export const createDeployOrderSchema = (maxPostCount: number) =>
  z.object({
    // 배포 제목
    deployTitle: z
      .string({ required_error: '배포 제목을 입력해주세요' })
      .min(3, '배포 제목은 최소 3글자 이상이어야 합니다')
      .max(100, '배포 제목은 최대 100자까지 입력 가능합니다'),

    // 업체명
    companyName: z
      .string({ required_error: '업체명을 입력해주세요' })
      .min(1, '업체명을 입력해주세요')
      .max(100, '업체명은 최대 100자까지 입력 가능합니다'),

    // 연락처
    applicantPhone: z
      .string({ required_error: '연락처를 입력해주세요' })
      .min(1, '연락처를 입력해주세요')
      .regex(
        /^01[016789]-?\d{3,4}-?\d{4}$/,
        '올바른 휴대폰 번호 형식으로 입력해주세요 (예: 010-1234-5678)',
      ),

    // 이메일
    applicantEmail: z
      .string({ required_error: '이메일 주소를 입력해주세요' })
      .min(1, '이메일 주소를 입력해주세요')
      .email('올바른 이메일 형식으로 입력해주세요'),

    // 하루 배포 건수
    dailyUploadCount: z
      .number({ required_error: '일 업로드 건수를 입력해주세요' })
      .int('일 업로드 건수는 정수여야 합니다')
      .min(1, '일 업로드 건수는 최소 1건 이상이어야 합니다')
      .max(maxPostCount, `일 업로드 건수는 최대 ${maxPostCount}건까지 가능합니다`),
  });

export type DeployOrderSchema = z.infer<ReturnType<typeof createDeployOrderSchema>>;
