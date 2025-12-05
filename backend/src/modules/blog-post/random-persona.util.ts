/**
 * Random Persona Generator Utility
 *
 * Generates random persona configurations for blog post generation.
 * Matches the frontend useRandomPersona composable logic.
 */

interface PersonaSnapshot {
  gender: string;
  age: number;
  isMarried: boolean;
  hasChildren: boolean;
  occupation: string;
  blogStyle: string;
  blogTone: string;
  additionalInfo: string;
  isRandom?: boolean; // Indicator for random generation
}

// Persona options (matching frontend schemas)
const GENDER_OPTIONS = ['남성', '여성'];

const OCCUPATION_OPTIONS = [
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

const BLOG_STYLE_OPTIONS = [
  '따뜻한 공감형',
  '객관 정보형',
  '유머∙위트형',
  '전문가 신뢰형',
  '브랜드 큐레이션형',
];

const BLOG_TONE_OPTIONS = [
  '편안한',
  '공손한',
  '열정적인',
  '차분한',
  '긍정적인',
  '중립적인',
  '신뢰감 있는',
  '친밀한',
];

/**
 * Get random item from array
 */
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random integer between min (inclusive) and max (exclusive)
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Get random boolean value
 */
function getRandomBoolean(): boolean {
  return Math.random() >= 0.5;
}

/**
 * Generate random persona configuration
 *
 * @returns Random persona snapshot with isRandom flag
 */
export function generateRandomPersona(): PersonaSnapshot {
  // 성별: 남성, 여성만 사용 (기타 제외)
  const gender = getRandomItem(GENDER_OPTIONS);

  // 나이: 20세 이상 50세 미만
  const age = getRandomInt(20, 50);

  // 결혼 유무
  const isMarried = getRandomBoolean();

  // 자녀 유무 (기혼인 경우 자녀 있을 확률 높임)
  const hasChildren = isMarried ? getRandomBoolean() : false;

  // 직업: 직업 옵션 중 랜덤 선택
  const occupation = getRandomItem(OCCUPATION_OPTIONS);

  // 블로그 문체: 5가지 중 랜덤 선택
  const blogStyle = getRandomItem(BLOG_STYLE_OPTIONS);

  // 블로그 분위기: 8가지 중 랜덤 선택
  const blogTone = getRandomItem(BLOG_TONE_OPTIONS);

  return {
    gender,
    age,
    isMarried,
    hasChildren,
    occupation,
    blogStyle,
    blogTone,
    additionalInfo: '',
    isRandom: true, // Mark as randomly generated
  };
}
