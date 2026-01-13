import { z } from 'zod';

// postType별 동적 필드 설정

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number';
  placeholder: string;
  required?: boolean;
  rows?: number;
}

export const fieldConfigsByType: Record<
  string,
  {
    description: string;
    fields: FieldConfig[];
  }
> = {
  '맛집 후기': {
    description:
      '맛집 후기: 실제로 방문한 음식점에 대한 경험과 느낌을 공유하는 글입니다',
    fields: [
      {
        name: 'companyName',
        label: '업체 이름',
        type: 'text',
        placeholder:
          '방문한 음식점의 상호 명을 적어주세요 (예시: 3대째 내려오는 순천 꼬리 곰탕 중앙점)',
        required: true,
      },
      {
        name: 'extra',
        label: '추가 정보',
        type: 'textarea',
        placeholder:
          '원고에 반영할 정보를 자유롭게 작성해주세요.\n\n예시:\n- 플레이스 링크: https://naver.me/xxx\n- 대표 메뉴: 꼬리곰탕 12,000원, 수육 25,000원\n- 방문 시간: 주말 점심\n- 분위기: 깔끔하고 넓은 홀, 주차 가능\n- 강조 포인트: 3대째 내려오는 전통, 푸짐한 양',
        rows: 6,
      },
    ],
  },
  '일반 후기': {
    description:
      '일반 후기: 다양한 서비스나 장소에 대한 경험과 느낌을 공유하는 글입니다',
    fields: [
      {
        name: 'extra',
        label: '추가 정보',
        type: 'textarea',
        placeholder:
          '원고에 반영할 정보를 자유롭게 작성해주세요.\n\n예시:\n- 장소/서비스 이름: OO피부과\n- 방문 일정: 12/20\n- 이용 서비스/메뉴: 피부 관리, 레이저 시술\n- 분위기: 깔끔하고 친절한 서비스\n- 강조 포인트: 전문적인 상담, 합리적인 가격',
        rows: 6,
      },
    ],
  },
  '제품 후기': {
    description:
      '제품 후기: 실제로 사용한 제품에 대한 경험과 느낌을 공유하는 글입니다',
    fields: [
      {
        name: 'productName',
        label: '제품 이름',
        type: 'text',
        placeholder: '리뷰할 제품의 이름을 입력해주세요',
        required: true,
      },
      {
        name: 'extra',
        label: '추가 정보',
        type: 'textarea',
        placeholder:
          '원고에 반영할 정보를 자유롭게 작성해주세요.\n\n예시:\n- 구매처: 쿠팡, 공식 홈페이지\n- 가격: 39,000원 (할인가 29,000원)\n- 사용 기간: 2주\n- 장점: 가성비 좋음, 디자인 예쁨\n- 단점: 배송이 조금 늦음\n- 강조 포인트: 민감성 피부에도 자극 없음',
        rows: 6,
      },
    ],
  },
  '일반 키워드 정보성': {
    description:
      '일반 키워드 정보성: 키워드에 대한 정보와 설명을 제공하는 글입니다',
    fields: [
      {
        name: 'coreContent',
        label: '핵심 내용',
        type: 'text',
        placeholder:
          '설명하려는 키워드 또는 주제를 적어주세요 (예시: 반려견 미용법)',
        required: true,
      },
      {
        name: 'extra',
        label: '추가 정보',
        type: 'textarea',
        placeholder:
          '원고에 반영할 정보를 자유롭게 작성해주세요.\n\n예시:\n- 글의 목적: 정보 제공, 브랜드 홍보\n- 타겟 독자: 반려견 초보 양육자\n- 포함할 내용: 미용 주기, 비용, 셀프 미용 팁\n- 광고주: OO 펫샵 (강남점)\n- 강조 포인트: 전문가가 알려주는 실용 정보',
        rows: 6,
      },
    ],
  },
  '병/의원 의료상식 정보성': {
    description:
      '병/의원 의료상식 정보성: 병원 및 의료 관련 상식을 제공하는 글입니다',
    fields: [
      {
        name: 'coreContent',
        label: '핵심 내용',
        type: 'text',
        placeholder:
          '설명하려는 의료 주제를 적어주세요 (예시: 임플란트 수술 과정)',
        required: true,
      },
      {
        name: 'extra',
        label: '추가 정보',
        type: 'textarea',
        placeholder:
          '원고에 반영할 정보를 자유롭게 작성해주세요.\n\n예시:\n- 병원명: OO치과의원\n- 플레이스 링크: https://naver.me/xxx\n- 진료 과목: 임플란트, 교정\n- 위치: 강남역 2번 출구\n- 강조 포인트: 20년 경력 전문의, 무통 마취',
        rows: 6,
      },
    ],
  },
  '법률상식 정보성': {
    description: '법률상식 정보성: 법률 관련 상식을 제공하는 글입니다',
    fields: [
      {
        name: 'coreContent',
        label: '핵심 내용',
        type: 'text',
        placeholder:
          '설명하려는 법률 주제를 적어주세요 (예시: 이혼 소송 절차)',
        required: true,
      },
      {
        name: 'extra',
        label: '추가 정보',
        type: 'textarea',
        placeholder:
          '원고에 반영할 정보를 자유롭게 작성해주세요.\n\n예시:\n- 법률사무소: OO법률사무소\n- 전문 분야: 이혼, 재산분할\n- 변호사: 홍길동 변호사 (10년 경력)\n- 위치: 서초동 법원 인근\n- 강조 포인트: 무료 상담, 높은 승소율',
        rows: 6,
      },
    ],
  },
  '뉴스 기반 원고': {
    description:
      '뉴스 기반 원고: 뉴스 기사를 참고하여 SEO에 최적화된 블로그 원고를 생성합니다',
    fields: [
      {
        name: 'extra',
        label: '추가 정보',
        type: 'textarea',
        placeholder:
          '원고에 반영할 정보를 자유롭게 작성해주세요.\n\n예시:\n- 글의 관점: 긍정적/비판적/중립적\n- 타겟 독자: 일반인, 전문가, 투자자 등\n- 강조 포인트: 특정 내용 강조, 추가 설명\n- 광고주: OO기업 (협찬/홍보 목적인 경우)',
        rows: 6,
      },
    ],
  },
};

export const postTypes = [
  '맛집 후기',
  '일반 후기',
  '제품 후기',
  '일반 키워드 정보성',
  '병/의원 의료상식 정보성',
  '법률상식 정보성',
  '뉴스 기반 원고',
];

// 원고 말투(톤) 옵션
export const writingToneOptions = [
  {
    value: 'casual',
    label: '~해요체',
    description: '구어체 / 친근형',
  },
  {
    value: 'formal',
    label: '~습니다체',
    description: '격식형 / 정보 전달형',
  },
  {
    value: 'narrative',
    label: '~한다체',
    description: '서술형 / 분석·인사이트형',
  },
] as const;

export type WritingTone = (typeof writingToneOptions)[number]['value'];

/**
 * AI 포스트 생성 메인 폼 스키마 (동적 필드 제외)
 */
// 베이스 객체 스키마 (refine 전)
// 참고: subKeywords는 recommendedKeyword로 대체되어 스키마에서 제거됨
const baseObjectSchema = z.object({
  postType: z
    .string({ required_error: '포스트 유형을 선택해주세요' })
    .min(1, '포스트 유형을 선택해주세요'),
  // personaId와 useRandomPersona 중 하나는 필수
  // 0은 "기본 페르소나", -1은 "임의 생성" 선택을 나타내는 특수 값으로 허용
  personaId: z
    .number()
    .refine((val) => val === undefined || val === -1 || val >= 0, {
      message: '올바른 페르소나를 선택해주세요',
    })
    .optional(),
  useRandomPersona: z.boolean().optional(),
  keyword: z
    .string({ required_error: '검색 키워드를 입력해주세요' })
    .min(1, '검색 키워드를 입력해주세요')
    .max(100, '검색 키워드는 최대 100자까지 입력 가능합니다'),
  length: z
    .number({ required_error: '글자 수를 선택해주세요' })
    .positive('글자 수를 선택해주세요')
    .refine(
      (val) => [300, 500, 1000, 1500, 2000, 3000].includes(val),
      '유효한 글자 수를 선택해주세요',
    ),
  count: z
    .number({ required_error: '원고 수를 입력해주세요' })
    .int('원고 수는 정수여야 합니다')
    .min(1, '원고 수는 최소 1개 이상이어야 합니다')
    .max(100, '원고 수는 최대 100개까지 입력 가능합니다'),
  writingTone: z.enum(['casual', 'formal', 'narrative'], {
    required_error: '원고 말투를 선택해주세요',
  }),
});

// AI 추천 모드용 스키마 (기본)
// personaId: 0 = 기본 페르소나, -1 = 임의 생성, 1+ = 사용자 페르소나
export const aiPostSchema = baseObjectSchema.refine(
  (data) =>
    data.personaId !== undefined && data.personaId !== null
      ? true
      : data.useRandomPersona,
  {
    message: '페르소나를 선택하거나 임의 생성을 선택해주세요',
    path: ['personaId'],
  },
);

export type AiPostSchema = z.infer<typeof aiPostSchema>;
