import type { CreatePersonaSchema } from '~/schemas/persona';
import { occupationOptions } from '~/schemas/persona';

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
   * Get random integer between min (inclusive) and max (exclusive)
   */
  const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min)) + min;
  };

  /**
   * Get random boolean value
   */
  const getRandomBoolean = (): boolean => {
    return Math.random() >= 0.5;
  };

  /**
   * Generate random persona configuration
   * @returns Random persona data matching CreatePersonaSchema
   */
  const generateRandomPersona = (): CreatePersonaSchema => {
    // 성별: 남성, 여성만 사용 (기타 제외)
    const gender = getRandomItem(['남성', '여성']);

    // 나이: 20세 이상 50세 미만
    const age = getRandomInt(20, 50);

    // 결혼 유무
    const isMarried = getRandomBoolean();

    // 자녀 유무 (기혼인 경우 자녀 있을 확률 높임)
    const hasChildren = isMarried ? getRandomBoolean() : false;

    // 직업: 직업 옵션 중 랜덤 선택
    const occupation = getRandomItem(occupationOptions);

    return {
      gender,
      age,
      isMarried,
      hasChildren,
      occupation,
      additionalInfo: '',
    };
  };

  return {
    generateRandomPersona,
  };
};
