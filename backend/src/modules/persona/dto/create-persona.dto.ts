import { IsString, IsOptional } from 'class-validator';

export class CreatePersonaDto {
  @IsString()
  gender: string;

  @IsString()
  blogTopic: string;

  @IsString()
  @IsOptional()
  characteristics?: string;
}
