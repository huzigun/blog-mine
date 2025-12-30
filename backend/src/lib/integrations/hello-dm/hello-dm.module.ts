import { PrismaModule } from '@lib/database';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HelloDmService } from './hello-dm.service';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [HelloDmService],
  exports: [HelloDmService],
})
export class HelloDmModule {}
