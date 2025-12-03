export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
  isAccountLinked?: boolean; // 카카오 로그인 시 기존 계정 연동 여부
}
