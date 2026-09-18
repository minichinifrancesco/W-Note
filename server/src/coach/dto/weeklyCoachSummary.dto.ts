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

export class CoachRecommendedSessionDto {
  title!: string;
  sessionType!: string;
  reasons!: string[];
  priorities!: string[];
  guidance!: string;
}

export class WeeklyCoachSummaryDto {
  period!: { start: string; end: string; label: string };
  previousPeriod!: { start: string; end: string; label: string };
  totals!: CoachTotalsDto;
  comparison!: CoachComparisonDto;
  muscleGroups!: CoachMuscleGroupDto[];
  days!: CoachDayDto[];
  badges!: CoachBadgeSummaryDto;
  insights!: CoachInsightDto[];
  nextFocus!: CoachNextFocusDto;
  recommendedSession!: CoachRecommendedSessionDto;
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
