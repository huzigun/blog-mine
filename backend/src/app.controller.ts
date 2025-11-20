import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello() {
    const result = await this.appService.getSearchNaver();
    return result;
    // return this.appService.getHello();
  }

  @Get('blog-content')
  async getBlogContent() {
    const url = 'https://blog.naver.com/lune051/224012100781'; // 예시 URL, 실제로는 클라이언트에서 받아야 함
    const content = await this.appService.getBlogContent(url);
    return { content };
  }

  @Get('/health')
  healthCheck() {
    return { status: 'ok' };
  }
}
