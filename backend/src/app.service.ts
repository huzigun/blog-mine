import { Injectable } from '@nestjs/common';
import { ConfigService } from './config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello(): string {
    const appName = this.configService.appName;
    const appVersion = this.configService.appVersion;
    const env = this.configService.appEnv;
    const port = this.configService.port;

    return `${appName} v${appVersion} - Running on port ${port} (${env} mode)`;
  }
}
