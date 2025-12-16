import {
  IsInt,
  IsEnum,
  IsString,
  MaxLength,
  IsOptional,
  IsObject,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsInt()
  userId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
