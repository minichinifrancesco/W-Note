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
