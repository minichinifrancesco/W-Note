export const TRAINING_GOAL_OPTIONS = [
  { value: 'GENERALE', label: 'Generale' },
  { value: 'MASSA', label: 'Massa' },
  { value: 'FORZA', label: 'Forza' },
  { value: 'DIMAGRIMENTO', label: 'Dimagrimento' },
  { value: 'MANTENIMENTO', label: 'Mantenimento' },
];

export const TRAINING_LEVEL_OPTIONS = [
  { value: 'PRINCIPIANTE', label: 'Principiante' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZATO', label: 'Avanzato' },
];

export const getOptionLabel = (options, value, fallback) =>
  options.find((option) => option.value === value)?.label || fallback;

export const getTrainingGoalLabel = (value) =>
  getOptionLabel(TRAINING_GOAL_OPTIONS, value, 'Generale');

export const getTrainingLevelLabel = (value) =>
  getOptionLabel(TRAINING_LEVEL_OPTIONS, value, 'Principiante');
