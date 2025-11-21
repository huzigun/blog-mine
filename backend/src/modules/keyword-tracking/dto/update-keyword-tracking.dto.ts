import { PartialType } from '@nestjs/mapped-types';
import { CreateKeywordTrackingDto } from './create-keyword-tracking.dto';

export class UpdateKeywordTrackingDto extends PartialType(
  CreateKeywordTrackingDto,
) {}
