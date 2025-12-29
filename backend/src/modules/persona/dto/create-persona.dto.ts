import { IsString, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreatePersonaDto {
  @IsString()
  gender: string;

  @IsInt()
  @Min(1)
  age: number;

  @IsBoolean()
  isMarried: boolean;

  @IsBoolean()
  hasChildren: boolean;

  @IsString()
  occupation: string;

  @IsString()
  @IsOptional()
  additionalInfo?: string;
}
