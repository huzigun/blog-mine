import { Module } from '@nestjs/common';
import { PersonaService } from './persona.service';
import { PersonaController } from './persona.controller';
import { PrismaModule } from '../../lib/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PersonaController],
  providers: [PersonaService],
  exports: [PersonaService],
})
export class PersonaModule {}
