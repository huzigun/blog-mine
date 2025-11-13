export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
}
