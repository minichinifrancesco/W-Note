export type ExerciseSetMetricsInput = {
  load: number | null | undefined;
  reps: number | null | undefined;
};

export type ExerciseSessionMetrics = {
  maxLoad: number;
  maxReps: number;
  volume: number;
  estimatedOneRm: number;
  completedSets: number;
};

function toPositiveNumber(value: number | null | undefined): number {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}

export function calculateEstimatedOneRm(
  load: number | null | undefined,
  reps: number | null | undefined,
): number {
  const normalizedLoad = toPositiveNumber(load);
  const normalizedReps = toPositiveNumber(reps);

  if (normalizedLoad === 0 || normalizedReps === 0) {
    return 0;
  }

  return normalizedLoad * (1 + normalizedReps / 30);
}

export function calculateExerciseSessionMetrics(
  sets: ExerciseSetMetricsInput[],
): ExerciseSessionMetrics {
  const validSets = sets
    .map((set) => ({
      load: toPositiveNumber(set.load),
      reps: toPositiveNumber(set.reps),
    }))
    .filter((set) => set.load > 0 || set.reps > 0);

  return validSets.reduce<ExerciseSessionMetrics>(
    (metrics, set) => {
      const volume = set.load * set.reps;
      const estimatedOneRm = calculateEstimatedOneRm(set.load, set.reps);

      return {
        maxLoad: Math.max(metrics.maxLoad, set.load),
        maxReps: Math.max(metrics.maxReps, set.reps),
        volume: metrics.volume + volume,
        estimatedOneRm: Math.max(metrics.estimatedOneRm, estimatedOneRm),
        completedSets: metrics.completedSets + 1,
      };
    },
    {
      maxLoad: 0,
      maxReps: 0,
      volume: 0,
      estimatedOneRm: 0,
      completedSets: 0,
    },
  );
}
