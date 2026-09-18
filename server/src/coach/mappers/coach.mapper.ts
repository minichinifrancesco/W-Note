import {
  CoachBadgeSummaryDto,
  CoachComparisonDto,
  CoachDayDto,
  CoachMuscleGroupDto,
  CoachMuscleGroupStatus,
  CoachTotalsDto,
} from '../dto/weeklyCoachSummary.dto';
import {
  BadgeRow,
  CoachPeriod,
  MuscleGroupLastTrainedRow,
  MuscleGroupRow,
  SetDayRow,
  SetTotalsRow,
  WorkoutDayRow,
  WorkoutTotalsRow,
} from '../types/coachQueryRows.types';
import { COACH_TRACKED_MUSCLE_GROUPS } from '../constants/coachMuscleGroups.constants';

export function toPeriodDto(period: CoachPeriod) {
  return {
    start: period.start.toISOString(),
    end: period.end.toISOString(),
    label: `${period.start.toLocaleDateString('it-IT')} - ${new Date(period.end.getTime() - 1).toLocaleDateString('it-IT')}`,
  };
}

export function toTotalsDto(
  workoutRow?: WorkoutTotalsRow,
  setRow?: SetTotalsRow,
): CoachTotalsDto {
  const sessions = Number(workoutRow?.sessions) || 0;
  const durationSeconds = Number(workoutRow?.durationSeconds) || 0;
  const completedSets = Number(setRow?.completedSets) || 0;
  const volume = Number(setRow?.volume) || 0;

  return {
    sessions,
    durationSeconds,
    completedSets,
    volume,
    averageDurationSeconds:
      sessions > 0 ? Math.round(durationSeconds / sessions) : 0,
  };
}

export function toMuscleGroupDtos(
  rows: MuscleGroupRow[],
  lastTrainedRows: MuscleGroupLastTrainedRow[],
): CoachMuscleGroupDto[] {
  const rowsByName = new Map(rows.map((row) => [row.name, row]));
  const lastTrainedByName = new Map(
    lastTrainedRows.map((row) => [row.name, row.lastTrainedAt]),
  );

  return COACH_TRACKED_MUSCLE_GROUPS.map((groupName) => {
    const row = rowsByName.get(groupName);
    const sets = Number(row?.sets) || 0;
    const lastTrainedAt =
      row?.lastTrainedAt ?? lastTrainedByName.get(groupName) ?? null;

    return {
      name: groupName,
      sets,
      volume: Number(row?.volume) || 0,
      exerciseCount: Number(row?.exerciseCount) || 0,
      lastTrainedAt: lastTrainedAt
        ? new Date(lastTrainedAt).toISOString()
        : null,
      status: getMuscleGroupStatus(sets),
    };
  });
}

export function toDayDtos(
  workoutRows: WorkoutDayRow[],
  setRows: SetDayRow[],
): CoachDayDto[] {
  const daysByDate = new Map<string, CoachDayDto>();

  for (const row of workoutRows) {
    daysByDate.set(row.date, {
      date: row.date,
      sessions: Number(row.sessions) || 0,
      durationSeconds: Number(row.durationSeconds) || 0,
      completedSets: 0,
      volume: 0,
    });
  }

  for (const row of setRows) {
    const existing = daysByDate.get(row.date);
    if (!existing) continue;

    existing.completedSets = Number(row.completedSets) || 0;
    existing.volume = Number(row.volume) || 0;
  }

  return Array.from(daysByDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function toBadgeSummaryDto(rows: BadgeRow[]): CoachBadgeSummaryDto {
  const items = rows.map((row) => ({
    id: Number(row.id),
    code: row.code,
    name: row.name,
    exerciseName: row.exerciseName,
    value: row.value === null ? null : Number(row.value),
    earnedAt: new Date(row.earnedAt).toISOString(),
  }));

  return {
    earned: items.length,
    items,
  };
}

export function toComparisonDto(
  totals: CoachTotalsDto,
  previousTotals: CoachTotalsDto,
): CoachComparisonDto {
  const volumeDelta = totals.volume - previousTotals.volume;

  return {
    sessionsDelta: totals.sessions - previousTotals.sessions,
    durationSecondsDelta:
      totals.durationSeconds - previousTotals.durationSeconds,
    completedSetsDelta: totals.completedSets - previousTotals.completedSets,
    volumeDelta,
    volumeDeltaPercent:
      previousTotals.volume > 0
        ? Math.round((volumeDelta / previousTotals.volume) * 1000) / 10
        : totals.volume > 0
          ? 100
          : 0,
  };
}

function getMuscleGroupStatus(sets: number): CoachMuscleGroupStatus {
  if (sets <= 0) return 'none';
  if (sets < 4) return 'low';
  if (sets <= 12) return 'ok';
  return 'high';
}
