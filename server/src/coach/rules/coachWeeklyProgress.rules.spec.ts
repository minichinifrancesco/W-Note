import {
  getWeeklyPace,
  getWeeklyPaceReason,
  getWeeklyProgress,
} from './coachWeeklyProgress.rules';

const period = {
  start: new Date('2026-09-14T00:00:00'),
  end: new Date('2026-09-21T00:00:00'),
};

const progress = getWeeklyProgress(2, 4);

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

describe('getWeeklyPace', () => {
  it('marks the user as on track when completed sessions meet the expected pace', () => {
    const result = getWeeklyPace(
      progress,
      period,
      new Date('2026-09-17T12:00:00'),
    );

    expect(result).toEqual({
      status: 'ON_TRACK',
      expectedSessions: 1,
      daysRemaining: 4,
    });
  });

  it('marks the user as behind when completed sessions are below the expected pace', () => {
    const result = getWeeklyPace(
      getWeeklyProgress(1, 4),
      period,
      new Date('2026-09-19T12:00:00'),
    );

    expect(result).toEqual({
      status: 'BEHIND_TARGET',
      expectedSessions: 2,
      daysRemaining: 2,
    });
  });

  it('evaluates a completed historical week against the full target', () => {
    const result = getWeeklyPace(
      progress,
      period,
      new Date('2026-09-25T12:00:00'),
    );

    expect(result).toEqual({
      status: 'BEHIND_TARGET',
      expectedSessions: 4,
      daysRemaining: 0,
    });
  });

  it('does not evaluate pace before the selected week starts', () => {
    const result = getWeeklyPace(
      getWeeklyProgress(0, 4),
      period,
      new Date('2026-09-10T12:00:00'),
    );

    expect(result).toEqual({
      status: 'NOT_APPLICABLE',
      expectedSessions: 0,
      daysRemaining: 7,
    });
  });

  it('does not evaluate pace after the target has been reached', () => {
    const result = getWeeklyPace(
      getWeeklyProgress(4, 4),
      period,
      new Date('2026-09-18T12:00:00'),
    );

    expect(result).toEqual({
      status: 'NOT_APPLICABLE',
      expectedSessions: 2,
      daysRemaining: 3,
    });
  });

  it('rejects an invalid weekly period', () => {
    expect(() =>
      getWeeklyPace(
        progress,
        {
          start: new Date('2026-09-21T00:00:00'),
          end: new Date('2026-09-14T00:00:00'),
        },
        new Date('2026-09-18T12:00:00'),
      ),
    ).toThrow('Periodo settimanale non valido');
  });
});

describe('getWeeklyPaceReason', () => {
  it('explains when the user is on track', () => {
    expect(
      getWeeklyPaceReason({
        status: 'ON_TRACK',
        expectedSessions: 1,
        daysRemaining: 4,
      }),
    ).toBe(
      'Sei in linea con il ritmo settimanale: a questo punto erano attesi 1 allenamento e restano 4 giorni.',
    );
  });

  it('warns without encouraging excessive volume when the user is behind', () => {
    const reason = getWeeklyPaceReason({
      status: 'BEHIND_TARGET',
      expectedSessions: 2,
      daysRemaining: 2,
    });

    expect(reason).toContain('sotto il ritmo previsto');
    expect(reason).toContain('2 allenamenti');
    expect(reason).toContain('evita di recuperare tutto con volume eccessivo');
  });

  it('uses a retrospective message when the selected week has ended', () => {
    const reason = getWeeklyPaceReason({
      status: 'BEHIND_TARGET',
      expectedSessions: 4,
      daysRemaining: 0,
    });

    expect(reason).toContain('settimana si è conclusa');
    expect(reason).toContain('target previsto di 4 allenamenti');
    expect(reason).not.toContain('Restano 0 giorni');
  });

  it('does not add a reason when pace is not applicable', () => {
    expect(
      getWeeklyPaceReason({
        status: 'NOT_APPLICABLE',
        expectedSessions: 4,
        daysRemaining: 0,
      }),
    ).toBeNull();
  });
});
