export const COACH_TRACKED_MUSCLE_GROUPS = [
  'Gambe e glutei',
  'Petto',
  'Schiena',
  'Spalle',
  'Bicipiti',
  'Tricipiti',
  'Addome e core',
  'Polpacci',
  'Glutei specifici',
] as const;

export type CoachTrackedMuscleGroup =
  (typeof COACH_TRACKED_MUSCLE_GROUPS)[number];

export const COACH_MAJOR_MUSCLE_GROUPS = [
  'Gambe e glutei',
  'Petto',
  'Schiena',
  'Spalle',
] as const satisfies readonly CoachTrackedMuscleGroup[];
