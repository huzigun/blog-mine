import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * 아이디(이메일) 찾기 요청 DTO
 * 이름으로 조회하여 마스킹된 이메일 반환
 */
export class FindEmailDto {
  @IsString()
  @IsNotEmpty({ message: '이름을 입력해주세요.' })
  @MinLength(2, { message: '이름은 2자 이상이어야 합니다.' })
  name: string;
}

/**
 * 아이디(이메일) 찾기 응답 DTO
 */
export class FindEmailResponseDto {
  maskedEmail: string;
  createdAt: Date;
  hasKakao: boolean;
}
