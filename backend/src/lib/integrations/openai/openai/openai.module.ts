import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { PromptLogModule } from '../prompt-log';
import { NaverApiModule } from '@lib/integrations/naver/naver-api/naver-api.module';

@Module({
  imports: [PromptLogModule, NaverApiModule],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule {}
