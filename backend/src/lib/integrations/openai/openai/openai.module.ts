import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { PromptLogModule } from '../prompt-log';

@Module({
  imports: [PromptLogModule],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule {}
