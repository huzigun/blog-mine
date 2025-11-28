import { Controller, Get } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

@Controller('/sc')
export class SchedulerController {
  constructor(private schedulerService: SchedulerService) {}

  @Get()
  async testMode() {
    await this.schedulerService.handleDailyTask();
  }
}
