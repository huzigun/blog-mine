import { Module } from '@nestjs/common';
import { PromptLogService } from './prompt-log.service';

@Module({
  providers: [PromptLogService],
  exports: [PromptLogService],
})
export class PromptLogModule {}
