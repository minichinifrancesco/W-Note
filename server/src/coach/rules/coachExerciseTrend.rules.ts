import { ExercisePerformanceSetRow } from '../types/coachQueryRows.types';
import { CoachProfile } from '../types/coachProfile.types';
import { calculateExerciseSessionMetrics } from '../utils/coachExerciseMetrics.util';

export type CoachExerciseTrendStatus = 'IMPROVING' | 'STABLE' | 'DECLINING';

export type CoachExerciseTrend = {
  exerciseId: number | null;
  exerciseName: string;
  muscleGroup: string;
  status: CoachExerciseTrendStatus;
  currentEstimatedOneRm: number;
  previousEstimatedOneRm: number;
  deltaPercent: number;
  comparedSessions: number;
  message: string;
};

type ExerciseSession = {
  workoutId: number;
  exerciseKey: string;
  performedAt: Date;
  exerciseId: number | null;
  exerciseName: string;
  muscleGroup: string;
  estimatedOneRm: number;
};

const TREND_THRESHOLD_PERCENT = 2.5;

function getExerciseKey(row: ExercisePerformanceSetRow): string {
  if (row.exerciseId !== null) {
    return `id:${row.exerciseId}`;
  }

  return [
    row.exerciseName.trim().toLocaleLowerCase('it-IT'),
    row.muscleGroup,
    row.trackingType,
  ].join('|');
}

function getTrendStatus(deltaPercent: number): CoachExerciseTrendStatus {
  if (deltaPercent >= TREND_THRESHOLD_PERCENT) {
    return 'IMPROVING';
  }

  if (deltaPercent <= -TREND_THRESHOLD_PERCENT) {
    return 'DECLINING';
  }

  return 'STABLE';
}

function getTrendMessage(
  exerciseName: string,
  status: CoachExerciseTrendStatus,
  profile: CoachProfile,
): string {
  if (status === 'IMPROVING') {
    return `${exerciseName} in miglioramento: il tuo 1RM stimato è in crescita. Mantieni la progressione senza sacrificare la tecnica.`;
  }

  if (status === 'DECLINING') {
    return `${exerciseName} in calo: riduci le pretese sul carico e verifica recupero, tecnica e distribuzione del volume.`;
  }

  if (profile.trainingGoal === 'FORZA') {
    return `${exerciseName} stabile: per il tuo obiettivo Forza è un segnale da monitorare. Prima di aumentare volume, prova recuperi più lunghi o una seduta tecnica.`;
  }

  return `${exerciseName} stabile: consolida tecnica e qualità delle serie prima di aumentare il carico o il volume.`;
}

function toExerciseSessions(
  rows: ExercisePerformanceSetRow[],
): ExerciseSession[] {
  const sessionsByExerciseAndWorkout = new Map<
    string,
    ExercisePerformanceSetRow[]
  >();

  for (const row of rows) {
    if (row.trackingType !== 'WEIGHT_REPS') {
      continue;
    }

    const key = `${getExerciseKey(row)}:${row.workoutId}`;
    const sessionRows = sessionsByExerciseAndWorkout.get(key) ?? [];

    sessionRows.push(row);
    sessionsByExerciseAndWorkout.set(key, sessionRows);
  }

  return [...sessionsByExerciseAndWorkout.values()]
    .map((sessionRows) => {
      const firstRow = sessionRows[0];
      const metrics = calculateExerciseSessionMetrics(sessionRows);

      return {
        workoutId: firstRow.workoutId,
        exerciseKey: getExerciseKey(firstRow),
        performedAt: new Date(firstRow.performedAt),
        exerciseId: firstRow.exerciseId,
        exerciseName: firstRow.exerciseName,
        muscleGroup: firstRow.muscleGroup,
        estimatedOneRm: metrics.estimatedOneRm,
      };
    })
    .filter(
      (session) =>
        !Number.isNaN(session.performedAt.getTime()) &&
        session.estimatedOneRm > 0,
    );
}

export function buildCoachExerciseTrends(
  rows: ExercisePerformanceSetRow[],
  profile: CoachProfile,
): CoachExerciseTrend[] {
  const sessionsByExercise = new Map<string, ExerciseSession[]>();

  for (const session of toExerciseSessions(rows)) {
    const sessions = sessionsByExercise.get(session.exerciseKey) ?? [];
    sessions.push(session);
    sessionsByExercise.set(session.exerciseKey, sessions);
  }

  return [...sessionsByExercise.values()]
    .map((sessions) => {
      const orderedSessions = [...sessions].sort(
        (left, right) =>
          left.performedAt.getTime() - right.performedAt.getTime(),
      );

      if (orderedSessions.length < 2) {
        return null;
      }

      const previousSession = orderedSessions.at(-2);
      const currentSession = orderedSessions.at(-1);

      if (!previousSession || !currentSession) {
        return null;
      }

      const deltaPercent =
        ((currentSession.estimatedOneRm - previousSession.estimatedOneRm) /
          previousSession.estimatedOneRm) *
        100;

      const status = getTrendStatus(deltaPercent);

      return {
        exerciseId: currentSession.exerciseId,
        exerciseName: currentSession.exerciseName,
        muscleGroup: currentSession.muscleGroup,
        status,
        currentEstimatedOneRm: currentSession.estimatedOneRm,
        previousEstimatedOneRm: previousSession.estimatedOneRm,
        deltaPercent,
        comparedSessions: orderedSessions.length,
        message: getTrendMessage(currentSession.exerciseName, status, profile),
      };
    })
    .filter((trend): trend is CoachExerciseTrend => trend !== null)
    .sort(
      (left, right) =>
        Math.abs(right.deltaPercent) - Math.abs(left.deltaPercent),
    );
}
