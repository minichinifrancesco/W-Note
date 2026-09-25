import type {
  WeeklyPaceStatus,
  WeeklyProgressStatus,
} from '../rules/coachWeeklyProgress.rules';
import type { CoachExerciseTrendStatus } from '../rules/coachExerciseTrend.rules';
import type { CoachPeriodStatus } from '../utils/coachPeriod.util';

export type CoachMuscleGroupStatus = 'none' | 'low' | 'ok' | 'high';
export type CoachInsightSeverity = 'info' | 'success' | 'warning' | 'danger';

export class CoachTotalsDto {
  sessions!: number;
  durationSeconds!: number;
  completedSets!: number;
  volume!: number;
  averageDurationSeconds!: number;
}

export class CoachMuscleGroupDto {
  name!: string;
  sets!: number;
  volume!: number;
  exerciseCount!: number;
  lastTrainedAt!: string | null;
  status!: CoachMuscleGroupStatus;
}

export class CoachInsightDto {
  type!: string;
  severity!: CoachInsightSeverity;
  title!: string;
  message!: string;
}

export class CoachNextFocusGroupDto {
  name!: string;
  status!: CoachMuscleGroupStatus;
  sets!: number;
  lastTrainedAt!: string | null;
  reason!: string;
}

export class CoachNextFocusDto {
  title!: string;
  message!: string;
  groups!: CoachNextFocusGroupDto[];
}

export class CoachWeeklyProgressDto {
  status!: WeeklyProgressStatus;
  completedSessions!: number;
  targetSessions!: number;
  remainingSessions!: number;
  paceStatus!: WeeklyPaceStatus;
  expectedSessions!: number;
  daysRemaining!: number;
}

export class CoachExerciseTrendDto {
  exerciseId!: number | null;
  exerciseName!: string;
  muscleGroup!: string;
  status!: CoachExerciseTrendStatus;
  currentEstimatedOneRm!: number;
  previousEstimatedOneRm!: number;
  deltaPercent!: number;
  comparedSessions!: number;
  message!: string;
}

export class CoachRecommendedSessionDto {
  title!: string;
  sessionType!: string;
  reasons!: string[];
  priorities!: string[];
  guidance!: string;
  focus!: string;
  structure!: string;
  intensity!: string;
  weeklyProgress!: CoachWeeklyProgressDto;
}

export class WeeklyCoachSummaryDto {
  period!: { start: string; end: string; label: string };
  periodStatus!: CoachPeriodStatus;
  previousPeriod!: { start: string; end: string; label: string };
  totals!: CoachTotalsDto;
  comparison!: CoachComparisonDto;
  muscleGroups!: CoachMuscleGroupDto[];
  days!: CoachDayDto[];
  badges!: CoachBadgeSummaryDto;
  insights!: CoachInsightDto[];
  nextFocus!: CoachNextFocusDto;
  exerciseTrends!: CoachExerciseTrendDto[];
  recommendedSession!: CoachRecommendedSessionDto | null;
}

export class CoachDayDto {
  date!: string;
  sessions!: number;
  durationSeconds!: number;
  completedSets!: number;
  volume!: number;
}

export class CoachBadgeDto {
  id!: number;
  code!: string;
  name!: string;
  exerciseName!: string | null;
  value!: number | null;
  earnedAt!: string;
}

export class CoachBadgeSummaryDto {
  earned!: number;
  items!: CoachBadgeDto[];
}

export class CoachComparisonDto {
  sessionsDelta!: number;
  durationSecondsDelta!: number;
  completedSetsDelta!: number;
  volumeDelta!: number;
  volumeDeltaPercent!: number;
}
