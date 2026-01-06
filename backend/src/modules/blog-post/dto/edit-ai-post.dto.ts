import { IsString, MinLength, MaxLength } from 'class-validator';

export class EditAIPostDto {
  @IsString()
  @MinLength(1, { message: '수정 요청을 입력해주세요.' })
  @MaxLength(500, { message: '수정 요청은 500자 이내로 입력해주세요.' })
  request: string;
}

// 수정 응답 인터페이스
export interface EditAIPostResponse {
  success: boolean;
  isValidRequest: boolean;
  message: string;
  data?: {
    version: number;
    title: string;
    content: string;
    remainingEdits: number;
  };
}

// 버전 목록 응답 인터페이스
export interface AIPostVersionListResponse {
  currentVersion: number;
  editCount: number;
  maxEdits: number;
  versions: {
    version: number;
    title: string | null;
    content: string;
    editRequest: string | null;
    createdAt: Date;
  }[];
}

// 버전 상세 응답 인터페이스
export interface AIPostVersionResponse {
  version: number;
  title: string | null;
  content: string;
  editRequest: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  createdAt: Date;
}
