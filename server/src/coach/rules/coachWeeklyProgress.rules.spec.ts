import { getWeeklyProgress } from './coachWeeklyProgress.rules';

describe('getWeeklyProgress', () => {
  it.each([
    [0, 4, 'NOT_STARTED', 4],
    [2, 4, 'IN_PROGRESS', 2],
    [4, 4, 'TARGET_REACHED', 0],
    [5, 4, 'ABOVE_TARGET', 0],
  ] as const)(
    'maps %i completed sessions out of %i to %s',
    (completed, target, status, remaining) => {
      expect(getWeeklyProgress(completed, target)).toEqual({
        status,
        completedSessions: completed,
        targetSessions: target,
        remainingSessions: remaining,
      });
    },
  );

  it('normalizes invalid negative values', () => {
    expect(getWeeklyProgress(-2, 0)).toEqual({
      status: 'NOT_STARTED',
      completedSessions: 0,
      targetSessions: 1,
      remainingSessions: 1,
    });
  });

  it('normalizes non-finite values', () => {
    expect(getWeeklyProgress(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({
      status: 'NOT_STARTED',
      completedSessions: 0,
      targetSessions: 1,
      remainingSessions: 1,
    });
  });
});
