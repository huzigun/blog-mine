import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsObject,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
  ValidateIf,
} from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  postType: string;

  // personaId와 useRandomPersona 중 하나만 필수
  @ValidateIf((o) => !o.useRandomPersona)
  @IsNumber()
  @IsInt()
  @Min(1)
  personaId?: number;

  // personaId가 없을 때 랜덤 페르소나 사용 플래그
  @ValidateIf((o) => !o.personaId)
  @IsBoolean()
  useRandomPersona?: boolean;

  @IsString()
  keyword: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  subKeywords?: string[] | null;

  @IsNumber()
  @IsInt()
  @Min(300)
  @Max(3000)
  length: number;

  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(100)
  count: number;

  @IsOptional()
  @IsObject()
  additionalFields?: Record<string, any>;
}
