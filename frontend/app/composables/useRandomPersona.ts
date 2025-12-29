import type { CreatePersonaSchema } from '~/schemas/persona';
import { blogTopicOptions } from '~/schemas/persona';

/**
 * Random persona generator composable
 * Provides functionality to generate random persona configurations
 */
export const useRandomPersona = () => {
  /**
   * Get random item from array
   */
  const getRandomItem = <T>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)]!;
  };

  /**
   * Generate random persona configuration
   * @returns Random persona data matching CreatePersonaSchema
   */
  const generateRandomPersona = (): CreatePersonaSchema => {
    // 성별: 남성, 여성만 사용 (기타 제외)
    const gender = getRandomItem(['남성', '여성']);

    // 블로그 주제: 직접 입력 제외한 옵션 중 랜덤 선택
    const topicOptionsWithoutCustom = blogTopicOptions.filter(
      (topic) => topic !== '직접 입력',
    );
    const blogTopic = getRandomItem(topicOptionsWithoutCustom);

    return {
      gender,
      blogTopic,
      characteristics: '',
    };
  };

  return {
    generateRandomPersona,
  };
};
