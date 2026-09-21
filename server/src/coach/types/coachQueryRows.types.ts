export type CoachPeriod = {
  start: Date;
  end: Date;
};

export type WorkoutTotalsRow = {
  sessions: number;
  durationSeconds: number;
};

export type SetTotalsRow = {
  completedSets: number;
  volume: number;
};

export type MuscleGroupRow = {
  name: string;
  sets: number;
  volume: number | null;
  exerciseCount: number;
  lastTrainedAt: Date | string | null;
};

export type WorkoutDayRow = {
  date: string;
  sessions: number;
  durationSeconds: number;
};

export type SetDayRow = {
  date: string;
  completedSets: number;
  volume: number | null;
};

export type BadgeRow = {
  id: number;
  code: string;
  name: string;
  exerciseName: string | null;
  value: number | null;
  earnedAt: Date | string;
};

export type MuscleGroupLastTrainedRow = {
  name: string;
  lastTrainedAt: Date | string | null;
};

export type ExercisePerformanceSetRow = {
  workoutId: number;
  performedAt: Date | string;
  exerciseId: number | null;
  exerciseName: string;
  muscleGroup: string;
  trackingType: string;
  load: number | null;
  reps: number | null;
};
