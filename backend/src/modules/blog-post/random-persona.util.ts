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

  return {
    gender,
    age,
    isMarried,
    hasChildren,
    occupation,
    additionalInfo: '',
    isRandom: true, // Mark as randomly generated
  };
}
