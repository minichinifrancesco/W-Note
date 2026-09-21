import {
  calculateEstimatedOneRm,
  calculateExerciseSessionMetrics,
} from './coachExerciseMetrics.util';

describe('calculateEstimatedOneRm', () => {
  it('calculates the estimated one rep max with the Epley formula', () => {
    expect(calculateEstimatedOneRm(100, 5)).toBeCloseTo(116.6667, 4);
  });

  it('returns zero for invalid load or repetitions', () => {
    expect(calculateEstimatedOneRm(0, 5)).toBe(0);
    expect(calculateEstimatedOneRm(100, 0)).toBe(0);
    expect(calculateEstimatedOneRm(-10, 5)).toBe(0);
    expect(calculateEstimatedOneRm(100, null)).toBe(0);
  });
});

describe('calculateExerciseSessionMetrics', () => {
  it('calculates objective metrics from valid sets', () => {
    const result = calculateExerciseSessionMetrics([
      { load: 100, reps: 5 },
      { load: 90, reps: 10 },
    ]);

    expect(result.maxLoad).toBe(100);
    expect(result.maxReps).toBe(10);
    expect(result.volume).toBe(1400);
    expect(result.estimatedOneRm).toBeCloseTo(120, 4);
    expect(result.completedSets).toBe(2);
  });

  it('preserves load-only and reps-only sets while ignoring empty sets', () => {
    const result = calculateExerciseSessionMetrics([
      { load: 100, reps: 5 },
      { load: 0, reps: 10 },
      { load: 80, reps: null },
      { load: 0, reps: 0 },
      { load: null, reps: null },
    ]);

    expect(result.maxLoad).toBe(100);
    expect(result.maxReps).toBe(10);
    expect(result.volume).toBe(500);
    expect(result.estimatedOneRm).toBeCloseTo(100 * (1 + 5 / 30), 4);
    expect(result.completedSets).toBe(3);
  });

  it('returns zero metrics when no sets are available', () => {
    expect(calculateExerciseSessionMetrics([])).toEqual({
      maxLoad: 0,
      maxReps: 0,
      volume: 0,
      estimatedOneRm: 0,
      completedSets: 0,
    });
  });
});
