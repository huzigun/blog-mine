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
} from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  postType: string;

  @IsNumber()
  @IsInt()
  @Min(1)
  personaId: number;

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
