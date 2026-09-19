import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { CoachRepository } from './repositories/coach.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CoachController],
  providers: [CoachService, CoachRepository],
})
export class CoachModule {}
