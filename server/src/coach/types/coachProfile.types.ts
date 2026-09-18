export const TRAINING_GOALS = [
  'GENERALE',
  'MASSA',
  'FORZA',
  'DIMAGRIMENTO',
  'MANTENIMENTO',
] as const;

export const TRAINING_LEVELS = [
  'PRINCIPIANTE',
  'INTERMEDIO',
  'AVANZATO',
] as const;

export type CoachTrainingGoal = (typeof TRAINING_GOALS)[number];
export type CoachTrainingLevel = (typeof TRAINING_LEVELS)[number];

export type CoachProfileRow = {
  trainingGoal: string;
  trainingLevel: string;
  targetWorkoutDays: number;
};

export type CoachProfile = {
  trainingGoal: CoachTrainingGoal;
  trainingLevel: CoachTrainingLevel;
  targetWorkoutDays: number;
};

export const DEFAULT_COACH_PROFILE: CoachProfile = {
  trainingGoal: 'GENERALE',
  trainingLevel: 'PRINCIPIANTE',
  targetWorkoutDays: 3,
};

export function normalizeCoachProfile(row: CoachProfileRow): CoachProfile {
  const trainingGoal = TRAINING_GOALS.includes(
    row.trainingGoal as CoachTrainingGoal,
  )
    ? (row.trainingGoal as CoachTrainingGoal)
    : DEFAULT_COACH_PROFILE.trainingGoal;

  const trainingLevel = TRAINING_LEVELS.includes(
    row.trainingLevel as CoachTrainingLevel,
  )
    ? (row.trainingLevel as CoachTrainingLevel)
    : DEFAULT_COACH_PROFILE.trainingLevel;

  const parsedTargetDays = Number(row.targetWorkoutDays);
  const targetWorkoutDays = Number.isFinite(parsedTargetDays)
    ? Math.min(Math.max(Math.trunc(parsedTargetDays), 1), 7)
    : DEFAULT_COACH_PROFILE.targetWorkoutDays;

  return {
    trainingGoal,
    trainingLevel,
    targetWorkoutDays,
  };
}
