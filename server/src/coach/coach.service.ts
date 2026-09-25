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
import { buildCoachExerciseTrends } from './rules/coachExerciseTrend.rules';
import { adaptSessionRecommendationToExerciseTrends } from './rules/coachExerciseTrendRecommendation.rules';
import { CoachRepository } from './repositories/coach.repository';
import { buildCoachInsights } from './rules/coachInsights.rules';
import {
  getCoachPeriodStatus,
  getExerciseTrendPeriod,
  getPreviousPeriod,
  getWeekPeriod,
} from './utils/coachPeriod.util';
import {
  adaptSessionStructureToWeeklyPace,
  adaptSessionTypeAndFocusToWeeklyPace,
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
    const periodStatus = getCoachPeriodStatus(period);
    const previousPeriod = getPreviousPeriod(period);
    const exerciseTrendPeriod = getExerciseTrendPeriod(period);

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
      exercisePerformanceSetRows,
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
      this.coachRepository.getExercisePerformanceSets(
        authUser.userId,
        exerciseTrendPeriod.start,
        exerciseTrendPeriod.end,
      ),
    ]);

    const coachProfile = normalizeCoachProfile(coachProfileRow);

    const exerciseTrends = buildCoachExerciseTrends(
      exercisePerformanceSetRows,
      coachProfile,
    );

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

    const recommendedSession =
      periodStatus === 'CURRENT'
        ? this.buildCurrentRecommendedSession(
            coachProfile,
            totals,
            muscleGroups,
            exerciseTrends,
            period,
          )
        : null;

    return {
      period: toPeriodDto(period),
      periodStatus,
      previousPeriod: toPeriodDto(previousPeriod),
      totals,
      comparison: toComparisonDto(totals, previousTotals),
      muscleGroups,
      days,
      badges,
      insights: buildCoachInsights(totals, previousTotals, muscleGroups),
      nextFocus: buildCoachNextFocus(muscleGroups),
      exerciseTrends,
      recommendedSession,
    };
  }

  private buildCurrentRecommendedSession(
    coachProfile: ReturnType<typeof normalizeCoachProfile>,
    totals: WeeklyCoachSummaryDto['totals'],
    muscleGroups: WeeklyCoachSummaryDto['muscleGroups'],
    exerciseTrends: WeeklyCoachSummaryDto['exerciseTrends'],
    period: { start: Date; end: Date },
  ): CoachRecommendedSessionDto {
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

    const isRecoverySession =
      sessionRecommendation.sessionType === 'Recupero e mobilità';

    const weeklyPaceReason = isRecoverySession
      ? null
      : getWeeklyPaceReason(weeklyPace);

    const adjustedTypeAndFocus = adaptSessionTypeAndFocusToWeeklyPace(
      sessionRecommendation.sessionType,
      sessionRecommendation.focus,
      sessionRecommendation.priorities,
      sessionRecommendation.weeklyProgress,
      weeklyPace,
    );

    const adjustedStructure = adaptSessionStructureToWeeklyPace(
      sessionRecommendation.structure,
      weeklyPace,
      isRecoverySession,
    );

    const recommendationReasons = weeklyPaceReason
      ? [
          sessionRecommendation.reasons[0],
          weeklyPaceReason,
          ...sessionRecommendation.reasons.slice(1),
        ]
      : sessionRecommendation.reasons;

    const paceAdjustedRecommendedSession: CoachRecommendedSessionDto = {
      ...sessionRecommendation,
      sessionType: adjustedTypeAndFocus.sessionType,
      focus: adjustedTypeAndFocus.focus,
      reasons: recommendationReasons,
      structure: adjustedStructure,
      weeklyProgress: {
        ...sessionRecommendation.weeklyProgress,
        paceStatus: weeklyPace.status,
        expectedSessions: weeklyPace.expectedSessions,
        daysRemaining: weeklyPace.daysRemaining,
      },
    };

    return adaptSessionRecommendationToExerciseTrends(
      paceAdjustedRecommendedSession,
      exerciseTrends,
      coachProfile,
    );
  }
}
