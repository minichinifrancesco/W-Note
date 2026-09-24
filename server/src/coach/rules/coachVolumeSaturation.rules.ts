import { COACH_MAJOR_MUSCLE_GROUPS } from '../constants/coachMuscleGroups.constants';
import { CoachMuscleGroupDto } from '../dto/weeklyCoachSummary.dto';

export const MINIMUM_HIGH_MAJOR_GROUPS = 3;
export const MINIMUM_HIGH_TRAINED_GROUP_RATIO = 0.75;

export type CoachVolumeSaturation = {
  isSaturated: boolean;
  trainedGroupCount: number;
  highTrainedGroupCount: number;
  highMajorGroups: string[];
};

const MAJOR_MUSCLE_GROUPS = new Set<string>(COACH_MAJOR_MUSCLE_GROUPS);

export function getCoachVolumeSaturation(
  muscleGroups: CoachMuscleGroupDto[],
): CoachVolumeSaturation {
  const trainedGroups = muscleGroups.filter((group) => group.sets > 0);
  const highTrainedGroups = trainedGroups.filter(
    (group) => group.status === 'high',
  );
  const highMajorGroups = highTrainedGroups
    .filter((group) => MAJOR_MUSCLE_GROUPS.has(group.name))
    .map((group) => group.name);

  const highTrainedGroupRatio =
    trainedGroups.length > 0
      ? highTrainedGroups.length / trainedGroups.length
      : 0;

  return {
    isSaturated:
      highMajorGroups.length >= MINIMUM_HIGH_MAJOR_GROUPS &&
      highTrainedGroupRatio >= MINIMUM_HIGH_TRAINED_GROUP_RATIO,
    trainedGroupCount: trainedGroups.length,
    highTrainedGroupCount: highTrainedGroups.length,
    highMajorGroups,
  };
}
