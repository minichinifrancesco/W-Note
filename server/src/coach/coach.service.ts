import { Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import {
  CoachRecommendedSessionDto,
  WeeklyCoachSummaryDto,
} from './dto/weeklyCoachSummary.dto';
import {
  toBadgeSummaryDto,
  toComparisonDto,
  toDayDtos,
  toMuscleGroupDtos,
  toPeriodDto,
  toTotalsDto,
} from './mappers/coach.mapper';
import { buildCoachNextFocus } from './rules/coachNextFocus.rules';
import { CoachRepository } from './repositories/coach.repository';
import { buildCoachInsights } from './rules/coachInsights.rules';
import { getPreviousPeriod, getWeekPeriod } from './utils/coachPeriod.util';
import {
  adaptSessionStructureToWeeklyPace,
  buildCoachSessionRecommendation,
} from './rules/coachSessionRecommendation.rules';
import {
  getWeeklyPace,
  getWeeklyPaceReason,
} from './rules/coachWeeklyProgress.rules';
import { normalizeCoachProfile } from './types/coachProfile.types';

@Injectable()
export class CoachService {
  constructor(private readonly coachRepository: CoachRepository) {}

  async getWeeklySummary(
    authUser: AuthUser,
    weekStart?: string,
  ): Promise<WeeklyCoachSummaryDto> {
    const period = getWeekPeriod(weekStart);
    const previousPeriod = getPreviousPeriod(period);

    const [
      coachProfileRow,
      currentWorkoutTotals,
      currentSetTotals,
      previousWorkoutTotals,
      previousSetTotals,
      muscleGroupRows,
      lastTrainedMuscleGroupRows,
      workoutDayRows,
      setDayRows,
      badgeRows,
    ] = await Promise.all([
      this.coachRepository.getCoachProfile(authUser.userId),
      this.coachRepository.getWorkoutTotals(
        authUser.userId,
        period.start,
        period.end,
      ),
      this.coachRepository.getSetTotals(
        authUser.userId,
        period.start,
        period.end,
      ),
      this.coachRepository.getWorkoutTotals(
        authUser.userId,
        previousPeriod.start,
        previousPeriod.end,
      ),
      this.coachRepository.getSetTotals(
        authUser.userId,
        previousPeriod.start,
        previousPeriod.end,
      ),
      this.coachRepository.getMuscleGroups(
        authUser.userId,
        period.start,
        period.end,
      ),
      this.coachRepository.getLastTrainedMuscleGroups(authUser.userId),
      this.coachRepository.getWorkoutDays(
        authUser.userId,
        period.start,
        period.end,
      ),
      this.coachRepository.getSetDays(
        authUser.userId,
        period.start,
        period.end,
      ),
      this.coachRepository.getBadges(authUser.userId, period.start, period.end),
    ]);

    const coachProfile = normalizeCoachProfile(coachProfileRow);

    const totals = toTotalsDto(currentWorkoutTotals[0], currentSetTotals[0]);
    const previousTotals = toTotalsDto(
      previousWorkoutTotals[0],
      previousSetTotals[0],
    );
    const muscleGroups = toMuscleGroupDtos(
      muscleGroupRows,
      lastTrainedMuscleGroupRows,
    );
    const days = toDayDtos(workoutDayRows, setDayRows);
    const badges = toBadgeSummaryDto(badgeRows);
    const sessionRecommendation = buildCoachSessionRecommendation({
      profile: coachProfile,
      totals,
      muscleGroups,
    });

    const weeklyPace = getWeeklyPace(
      sessionRecommendation.weeklyProgress,
      period,
      new Date(),
    );

    const weeklyPaceReason = getWeeklyPaceReason(weeklyPace);

    const adjustedStructure = adaptSessionStructureToWeeklyPace(
      sessionRecommendation.structure,
      weeklyPace,
    );

    const recommendationReasons = weeklyPaceReason
      ? [
          sessionRecommendation.reasons[0],
          weeklyPaceReason,
          ...sessionRecommendation.reasons.slice(1),
        ]
      : sessionRecommendation.reasons;

    const recommendedSession: CoachRecommendedSessionDto = {
      ...sessionRecommendation,
      reasons: recommendationReasons,
      structure: adjustedStructure,
      weeklyProgress: {
        ...sessionRecommendation.weeklyProgress,
        paceStatus: weeklyPace.status,
        expectedSessions: weeklyPace.expectedSessions,
        daysRemaining: weeklyPace.daysRemaining,
      },
    };

    return {
      period: toPeriodDto(period),
      previousPeriod: toPeriodDto(previousPeriod),
      totals,
      comparison: toComparisonDto(totals, previousTotals),
      muscleGroups,
      days,
      badges,
      insights: buildCoachInsights(totals, previousTotals, muscleGroups),
      nextFocus: buildCoachNextFocus(muscleGroups),
      recommendedSession,
    };
  }
}
