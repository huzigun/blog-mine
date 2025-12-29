/**
 * Random Persona Generator Utility
 *
 * Generates random persona configurations for blog post generation.
 * Matches the frontend useRandomPersona composable logic.
 */

interface PersonaSnapshot {
  gender: string;
  blogTopic: string;
  characteristics: string;
  isRandom?: boolean; // Indicator for random generation
}

// Persona options (matching frontend schemas)
const GENDER_OPTIONS = ['남성', '여성'];

const BLOG_TOPIC_OPTIONS = [
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
];

/**
 * Get random item from array
 */
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate random persona configuration
 *
 * @returns Random persona snapshot with isRandom flag
 */
export function generateRandomPersona(): PersonaSnapshot {
  // 성별: 남성, 여성만 사용 (기타 제외)
  const gender = getRandomItem(GENDER_OPTIONS);

  // 블로그 주제: 옵션 중 랜덤 선택
  const blogTopic = getRandomItem(BLOG_TOPIC_OPTIONS);

  return {
    gender,
    blogTopic,
    characteristics: '',
    isRandom: true, // Mark as randomly generated
  };
}
