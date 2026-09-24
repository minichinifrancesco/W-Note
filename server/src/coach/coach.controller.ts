import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { CoachService } from './coach.service';

@UseGuards(AuthGuard)
@Controller('me/coach')
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Get('weekly')
  getWeeklySummary(
    @Req() request: AuthenticatedRequest,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.coachService.getWeeklySummary(request.user, weekStart);
  }
}
