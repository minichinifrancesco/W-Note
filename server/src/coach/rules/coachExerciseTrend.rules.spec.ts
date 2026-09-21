import { ExercisePerformanceSetRow } from '../types/coachQueryRows.types';
import { buildCoachExerciseTrends } from './coachExerciseTrend.rules';

function createRow(
  overrides: Partial<ExercisePerformanceSetRow> = {},
): ExercisePerformanceSetRow {
  return {
    workoutId: 1,
    performedAt: new Date('2026-09-01T10:00:00.000Z'),
    exerciseId: 10,
    exerciseName: 'Panca piana',
    muscleGroup: 'Petto',
    trackingType: 'WEIGHT_REPS',
    load: 100,
    reps: 5,
    ...overrides,
  };
}

const strengthProfile = {
  trainingGoal: 'FORZA' as const,
  trainingLevel: 'AVANZATO' as const,
  targetWorkoutDays: 4,
};

describe('buildCoachExerciseTrends', () => {
  it('detects an improving estimated 1RM', () => {
    const result = buildCoachExerciseTrends(
      [
        createRow({
          workoutId: 1,
          performedAt: new Date('2026-09-01T10:00:00.000Z'),
          load: 100,
          reps: 5,
        }),
        createRow({
          workoutId: 2,
          performedAt: new Date('2026-09-08T10:00:00.000Z'),
          load: 105,
          reps: 5,
        }),
      ],
      strengthProfile,
    );

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('IMPROVING');
    expect(result[0].currentEstimatedOneRm).toBeGreaterThan(
      result[0].previousEstimatedOneRm,
    );
  });

  it('detects a stable strength exercise and uses a force-specific message', () => {
    const result = buildCoachExerciseTrends(
      [
        createRow({ workoutId: 1 }),
        createRow({
          workoutId: 2,
          performedAt: new Date('2026-09-08T10:00:00.000Z'),
        }),
      ],
      strengthProfile,
    );

    expect(result[0].status).toBe('STABLE');
    expect(result[0].message).toContain('obiettivo Forza');
    expect(result[0].message).toContain('recuperi più lunghi');
  });

  it('uses a generic stable message for a non-strength profile', () => {
    const result = buildCoachExerciseTrends(
      [
        createRow({ workoutId: 1 }),
        createRow({
          workoutId: 2,
          performedAt: new Date('2026-09-08T10:00:00.000Z'),
        }),
      ],
      {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
    );

    expect(result[0].status).toBe('STABLE');
    expect(result[0].message).toContain('consolida tecnica');
  });

  it.each([
    {
      trainingLevel: 'PRINCIPIANTE' as const,
      expectedMessage: 'Concentrati sulla tecnica',
    },
    {
      trainingLevel: 'INTERMEDIO' as const,
      expectedMessage: 'progressione graduale',
    },
    {
      trainingLevel: 'AVANZATO' as const,
      expectedMessage: 'recupero, qualità tecnica e volume complessivo',
    },
  ])(
    'adapts the stable message to the $trainingLevel level',
    ({ trainingLevel, expectedMessage }) => {
      const result = buildCoachExerciseTrends(
        [
          createRow({ workoutId: 1 }),
          createRow({
            workoutId: 2,
            performedAt: new Date('2026-09-08T10:00:00.000Z'),
          }),
        ],
        {
          trainingGoal: 'MASSA',
          trainingLevel,
          targetWorkoutDays: 4,
        },
      );

      expect(result[0].status).toBe('STABLE');
      expect(result[0].message).toContain(expectedMessage);
    },
  );

  it('detects a declining estimated 1RM', () => {
    const result = buildCoachExerciseTrends(
      [
        createRow({
          workoutId: 1,
          load: 100,
          reps: 5,
        }),
        createRow({
          workoutId: 2,
          performedAt: new Date('2026-09-08T10:00:00.000Z'),
          load: 90,
          reps: 5,
        }),
      ],
      strengthProfile,
    );

    expect(result[0].status).toBe('DECLINING');
    expect(result[0].message).toContain('in calo');
  });

  it('sorts trends by the largest absolute change first', () => {
    const result = buildCoachExerciseTrends(
      [
        createRow({
          workoutId: 1,
          exerciseId: 10,
          exerciseName: 'Panca piana',
          load: 100,
          reps: 5,
        }),
        createRow({
          workoutId: 2,
          performedAt: new Date('2026-09-08T10:00:00.000Z'),
          exerciseId: 10,
          exerciseName: 'Panca piana',
          load: 102,
          reps: 5,
        }),
        createRow({
          workoutId: 3,
          exerciseId: 20,
          exerciseName: 'Squat',
          muscleGroup: 'Gambe e glutei',
          load: 100,
          reps: 5,
        }),
        createRow({
          workoutId: 4,
          performedAt: new Date('2026-09-08T10:00:00.000Z'),
          exerciseId: 20,
          exerciseName: 'Squat',
          muscleGroup: 'Gambe e glutei',
          load: 90,
          reps: 5,
        }),
      ],
      strengthProfile,
    );

    expect(result.map((trend) => trend.exerciseName)).toEqual([
      'Squat',
      'Panca piana',
    ]);
  });

  it('uses all sets of a workout and retains the best estimated 1RM', () => {
    const result = buildCoachExerciseTrends(
      [
        createRow({
          workoutId: 1,
          load: 100,
          reps: 5,
        }),
        createRow({
          workoutId: 1,
          load: 90,
          reps: 8,
        }),
        createRow({
          workoutId: 2,
          performedAt: new Date('2026-09-08T10:00:00.000Z'),
          load: 105,
          reps: 5,
        }),
      ],
      strengthProfile,
    );

    expect(result[0].previousEstimatedOneRm).toBeCloseTo(100 * (1 + 5 / 30), 4);
    expect(result[0].comparedSessions).toBe(2);
  });

  it('ignores timed, repetitions-only and single-session exercises', () => {
    const result = buildCoachExerciseTrends(
      [
        createRow({ workoutId: 1 }),
        createRow({
          workoutId: 2,
          performedAt: new Date('2026-09-08T10:00:00.000Z'),
          trackingType: 'REPS',
        }),
        createRow({
          workoutId: 3,
          performedAt: new Date('2026-09-15T10:00:00.000Z'),
          trackingType: 'TIMED',
        }),
      ],
      strengthProfile,
    );

    expect(result).toEqual([]);
  });

  it('groups deleted exercises by normalized snapshot identity', () => {
    const result = buildCoachExerciseTrends(
      [
        createRow({
          workoutId: 1,
          exerciseId: null,
          exerciseName: 'Trazioni',
          load: 70,
          reps: 5,
        }),
        createRow({
          workoutId: 2,
          performedAt: new Date('2026-09-08T10:00:00.000Z'),
          exerciseId: null,
          exerciseName: ' trazioni ',
          load: 75,
          reps: 5,
        }),
      ],
      strengthProfile,
    );

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('IMPROVING');
  });
});
