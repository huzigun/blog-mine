import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBusinessInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessName?: string; // 상호명

  @IsOptional()
  @IsString()
  @MaxLength(50)
  businessNumber?: string; // 사업자등록번호

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessOwner?: string; // 대표자명

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessAddress?: string; // 사업장 주소

  @IsOptional()
  @IsString()
  @MaxLength(50)
  businessType?: string; // 업태

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessCategory?: string; // 종목
}
