import type { CoachPeriod } from '../types/coachQueryRows.types';

export type WeeklyProgressStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'TARGET_REACHED'
  | 'ABOVE_TARGET';

export type WeeklyProgress = {
  status: WeeklyProgressStatus;
  completedSessions: number;
  targetSessions: number;
  remainingSessions: number;
};

export type WeeklyPaceStatus = 'NOT_APPLICABLE' | 'ON_TRACK' | 'BEHIND_TARGET';

export type WeeklyPace = {
  status: WeeklyPaceStatus;
  expectedSessions: number;
  daysRemaining: number;
};

const DAYS_PER_WEEK = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function getCalendarDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
      MILLISECONDS_PER_DAY,
  );
}

export function getWeeklyProgress(
  completedSessions: number,
  targetSessions: number,
): WeeklyProgress {
  const completed = Number.isFinite(completedSessions)
    ? Math.max(0, Math.trunc(completedSessions))
    : 0;

  const target = Number.isFinite(targetSessions)
    ? Math.max(1, Math.trunc(targetSessions))
    : 1;

  let status: WeeklyProgressStatus;

  if (completed === 0) {
    status = 'NOT_STARTED';
  } else if (completed < target) {
    status = 'IN_PROGRESS';
  } else if (completed === target) {
    status = 'TARGET_REACHED';
  } else {
    status = 'ABOVE_TARGET';
  }

  return {
    status,
    completedSessions: completed,
    targetSessions: target,
    remainingSessions: Math.max(target - completed, 0),
  };
}

export function getWeeklyPace(
  progress: WeeklyProgress,
  period: CoachPeriod,
  referenceDate: Date,
): WeeklyPace {
  const startTimestamp = period.start.getTime();
  const endTimestamp = period.end.getTime();
  const referenceTimestamp = referenceDate.getTime();

  if (
    !Number.isFinite(startTimestamp) ||
    !Number.isFinite(endTimestamp) ||
    !Number.isFinite(referenceTimestamp) ||
    endTimestamp <= startTimestamp
  ) {
    throw new RangeError('Periodo settimanale non valido');
  }

  const isBeforePeriod = referenceTimestamp < startTimestamp;

  const clampedReferenceTimestamp = Math.min(
    Math.max(referenceTimestamp, startTimestamp),
    endTimestamp,
  );

  const clampedReferenceDate = new Date(clampedReferenceTimestamp);

  const elapsedDays = Math.min(
    Math.max(
      getCalendarDayNumber(clampedReferenceDate) -
        getCalendarDayNumber(period.start),
      0,
    ),
    DAYS_PER_WEEK,
  );

  const expectedSessions = Math.min(
    progress.targetSessions,
    Math.floor((progress.targetSessions * elapsedDays) / DAYS_PER_WEEK),
  );

  const daysRemaining = Math.max(DAYS_PER_WEEK - elapsedDays, 0);

  if (
    isBeforePeriod ||
    progress.status === 'TARGET_REACHED' ||
    progress.status === 'ABOVE_TARGET'
  ) {
    return {
      status: 'NOT_APPLICABLE',
      expectedSessions,
      daysRemaining,
    };
  }

  return {
    status:
      progress.completedSessions < expectedSessions
        ? 'BEHIND_TARGET'
        : 'ON_TRACK',
    expectedSessions,
    daysRemaining,
  };
}

export function getWeeklyPaceReason(pace: WeeklyPace): string | null {
  if (pace.status === 'NOT_APPLICABLE') {
    return null;
  }
  const expectedLabel =
    pace.expectedSessions === 1 ? 'allenamento' : 'allenamenti';

  const daysLabel = pace.daysRemaining === 1 ? 'giorno' : 'giorni';

  if (pace.status === 'ON_TRACK') {
    if (pace.expectedSessions === 0) {
      return `Il ritmo è in linea: la settimana è appena iniziata e restano ${pace.daysRemaining} ${daysLabel}.`;
    }

    return `Sei in linea con il ritmo settimanale: a questo punto erano attesi ${pace.expectedSessions} ${expectedLabel} e restano ${pace.daysRemaining} ${daysLabel}.`;
  }

  if (pace.daysRemaining === 0) {
    return `La settimana si è conclusa sotto il target previsto di ${pace.expectedSessions} ${expectedLabel}. Usa questo dato per distribuire meglio le sedute nella prossima settimana.`;
  }

  return `Sei sotto il ritmo previsto: a questo punto erano attesi ${pace.expectedSessions} ${expectedLabel}. Restano ${pace.daysRemaining} ${daysLabel}: evita di recuperare tutto con volume eccessivo.`;
}
