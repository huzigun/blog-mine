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
        name: 'placeUrl',
        label: '플레이스 정보 링크',
        type: 'text',
        placeholder: '방문업체의 PLACE 링크를 입력해주세요.',
      },
      {
        name: 'visitDate',
        label: '방문한 시간',
        type: 'text',
        placeholder:
          '아침, 점심, 저녁 등 언제 방문했는지 적어주세요 분위기 표현에 사용돼요 (예시: 저녁 7시, 주말 오후)',
      },
      {
        name: 'menus',
        label: '대표 메뉴',
        type: 'text',
        placeholder:
          '대표 메뉴를 최대 3개까지 알려주세요. 간단한 설명까지 적어주시면 원고에 그대로 반영됩니다',
      },
      {
        name: 'extra',
        label: '강조할 내용',
        type: 'textarea',
        placeholder:
          '글에 포함되면 좋은 구체적인 요청사항을 알려주시면 더 정확하고 현실적인 원고 생성에 도움이 됩니다 (예시: 가격, 위치, 영업시간, 후기 스타일, 실제 방문 경험 등)',
        rows: 4,
      },
    ],
  },
  '방문 후기': {
    description:
      '방문 후기: 실제로 방문한 장소에 대한 경험과 느낌을 공유하는 글입니다',
    fields: [
      {
        name: 'companyName',
        label: '방문 장소 이름',
        type: 'text',
        placeholder: '방문한 장소의 이름을 입력해주세요',
        required: true,
      },
      {
        name: 'placeUrl',
        label: '플레이스 정보 링크',
        type: 'text',
        placeholder: '방문업체의 PLACE 링크를 입력해주세요.',
      },
      {
        name: 'visitDate',
        label: '방문 날짜',
        type: 'text',
        placeholder: '예: 2024년 1월 15일',
      },
      {
        name: 'mainAttraction',
        label: '대표 메뉴/상품/체험 명',
        type: 'text',
        placeholder: '그곳에서 경험한 대표적인 메뉴나 프로그램 등을 알려주세요',
      },
      {
        name: 'location',
        label: '위치 및 접근성',
        type: 'text',
        placeholder: '주소 및 교통편 정보',
      },
      {
        name: 'extra',
        label: '강조할 내용',
        type: 'textarea',
        placeholder:
          '글에 포함되면 좋은 구체적인 요청사항을 알려주시면 더 정확하고 현실적인 원고 생성에 도움이 됩니다 (예시: 가격, 위치, 영업시간, 후기 스타일, 실제 방문 경험 등)',
        rows: 4,
      },
    ],
  },
  '여행 후기': {
    description:
      '여행 후기: 실제로 방문한 장소에 대한 경험과 느낌을 공유하는 글입니다',
    fields: [
      {
        name: 'travelLocation',
        label: '여행 지역 이름',
        type: 'text',
        placeholder:
          '여행을 다녀온 지역의 이름을 적어주세요 (예시: 광주광역시 남구 양림동)',
        required: true,
      },
      {
        name: 'travelDates',
        label: '여행 일자 및 일정:',
        type: 'text',
        placeholder:
          '여행 기간을 알려주세요 (예시: 5/5-5/6,1박 2일, 3박 4일 등)',
      },
      {
        name: 'mainAttractions',
        label: '주요 방문지',
        type: 'text',
        placeholder: '여행 중 들렀던 관광지 또는 장소에 대해 적어주세요',
      },
      {
        name: 'extra',
        label: '강조할 내용',
        type: 'textarea',
        placeholder:
          '글에 포함되면 좋은 구체적인 요청사항을 알려주시면 더 정확하고 현실적인 원고 생성에 도움이 됩니다 (예시: 가격, 위치, 영업시간, 후기 스타일, 실제 방문 경험 등)',
        rows: 4,
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
        label: '강조할 내용',
        type: 'textarea',
        placeholder:
          '글에 포함되면 좋은 구체적인 요청사항을 알려주시면 더 정확하고 현실적인 원고 생성에 도움이 됩니다 (예시: 가격, 위치, 영업시간, 후기 스타일, 실제 방문 경험 등)',
        rows: 4,
      },
    ],
  },
  '맛집 정보성': {
    description: '맛집 정보성: 음식점에 대한 정보와 특징을 소개하는 글입니다',
    fields: [
      {
        name: 'companyName',
        label: '업체 이름',
        type: 'text',
        placeholder: '소개하고자 하는 음식점의 상호 명을 알려주세요',
        required: true,
      },
      {
        name: 'placeUrl',
        label: '플레이스 정보 링크',
        type: 'text',
        placeholder: '방문업체의 PLACE 링크를 입력해주세요.',
      },
      {
        name: 'menus',
        label: '대표 메뉴',
        type: 'text',
        placeholder:
          '대표 메뉴를 최대 3개까지 알려주세요. 간단한 설명까지 적어주시면 원고에 그대로 반영됩니다',
      },
      {
        name: 'extra',
        label: '강조할 내용',
        type: 'textarea',
        placeholder:
          '글에 포함되면 좋은 구체적인 요청사항을 알려주시면 더 정확하고 현실적인 원고 생성에 도움이 됩니다 (예시: 가격, 위치, 영업시간, 후기 스타일, 실제 방문 경험 등)',
        rows: 4,
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
          '설명하려는 키워드 또는 주제를 적어주세요 글의 방향성과 구성 흐름을 잡는 기준이 됩니다(예시: 반려견 미용법)',
        required: true,
      },
      {
        name: 'purpose',
        label: '글의 목적',
        type: 'text',
        placeholder:
          '이 글을 쓰는 이유를 알려주세요. 교육, 브랜드 홍보, 정보 제공, 브랜드 신뢰 확보, 기타가 될 수 있어요',
      },
      {
        name: 'extra',
        label: '강조할 내용',
        type: 'textarea',
        placeholder:
          '글에 포함되면 좋은 구체적인 요청사항을 알려주시면 더 정확하고 현실적인 원고 생성에 도움이 됩니다 (예시: 가격, 위치, 영업시간, 후기 스타일, 실제 방문 경험 등)',
        rows: 4,
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
          '설명하려는 키워드 또는 주제를 적어주세요 글의 방향성과 구성 흐름을 잡는 기준이 됩니다(예시: 반려견 미용법)',
        required: true,
      },
      {
        name: 'companyName',
        label: '병원 이름',
        type: 'text',
        placeholder:
          '참고하거나 소개할 병원 또는 의료 기관의 이름을 알려주세요',
      },
      {
        name: 'placeUrl',
        label: '플레이스 정보 링크',
        type: 'text',
        placeholder: '방문업체의 PLACE 링크를 입력해주세요.',
      },
      {
        name: 'extra',
        label: '강조할 내용',
        type: 'textarea',
        placeholder:
          '글에 포함되면 좋은 구체적인 요청사항을 알려주시면 더 정확하고 현실적인 원고 생성에 도움이 됩니다 (예시: 가격, 위치, 영업시간, 후기 스타일, 실제 방문 경험 등)',
        rows: 4,
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
          '설명하려는 키워드 또는 주제를 적어주세요 글의 방향성과 구성 흐름을 잡는 기준이 됩니다(예시: 반려견 미용법)',
        required: true,
      },
      {
        name: 'companyName',
        label: '기업 이름',
        type: 'text',
        placeholder: '참고할 법률 사무소, 기관, 변호사명을 적어주세요',
      },
      {
        name: 'extra',
        label: '강조할 내용',
        type: 'textarea',
        placeholder:
          '글에 포함되면 좋은 구체적인 요청사항을 알려주시면 더 정확하고 현실적인 원고 생성에 도움이 됩니다 (예시: 가격, 위치, 영업시간, 후기 스타일, 실제 방문 경험 등)',
        rows: 4,
      },
    ],
  },
};

export const postTypes = [
  '맛집 후기',
  '방문 후기',
  '여행 후기',
  '제품 후기',
  '맛집 정보성',
  '일반 키워드 정보성',
  '병/의원 의료상식 정보성',
  '법률상식 정보성',
];

/**
 * AI 포스트 생성 메인 폼 스키마 (동적 필드 제외)
 */
// 베이스 객체 스키마 (refine 전)
const baseObjectSchema = z.object({
  postType: z
    .string({ required_error: '포스트 유형을 선택해주세요' })
    .min(1, '포스트 유형을 선택해주세요'),
  // personaId와 useRandomPersona 중 하나는 필수
  // -1은 "임의 생성" 선택을 나타내는 특수 값으로 허용
  personaId: z
    .number()
    .refine((val) => val === undefined || val === -1 || val > 0, {
      message: '올바른 페르소나를 선택해주세요',
    })
    .optional(),
  useRandomPersona: z.boolean().optional(),
  keyword: z
    .string({ required_error: '검색 키워드를 입력해주세요' })
    .min(1, '검색 키워드를 입력해주세요')
    .max(100, '검색 키워드는 최대 100자까지 입력 가능합니다'),
  subKeywords: z
    .union([
      z
        .array(z.string())
        .min(1, '최소 1개 이상의 서브 키워드를 입력해주세요')
        .max(5, '서브 키워드는 최대 5개까지 입력 가능합니다'),
      z.null(),
      z.array(z.string()).length(0),
    ])
    .nullable()
    .transform((val) => {
      // 빈 배열을 null로 변환
      if (Array.isArray(val) && val.length === 0) return null;
      return val;
    }),
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
});

// AI 추천 모드용 스키마 (기본)
export const aiPostSchema = baseObjectSchema.refine(
  (data) => data.personaId || data.useRandomPersona,
  {
    message: '페르소나를 선택하거나 임의 생성을 선택해주세요',
    path: ['personaId'],
  },
);

// 직접 입력 모드용 스키마 (서브 키워드 필수)
export const manualInputPostSchema = baseObjectSchema
  .extend({
    subKeywords: z
      .array(z.string())
      .min(1, '최소 1개 이상의 서브 키워드를 입력해주세요')
      .max(5, '서브 키워드는 최대 5개까지 입력 가능합니다'),
  })
  .refine((data) => data.personaId || data.useRandomPersona, {
    message: '페르소나를 선택하거나 임의 생성을 선택해주세요',
    path: ['personaId'],
  });

export type AiPostSchema = z.infer<typeof aiPostSchema>;
