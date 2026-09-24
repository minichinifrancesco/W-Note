import { CoachMuscleGroupDto } from '../dto/weeklyCoachSummary.dto';
import { getCoachVolumeSaturation } from './coachVolumeSaturation.rules';

function muscle(
  name: string,
  status: CoachMuscleGroupDto['status'],
  sets = 0,
): CoachMuscleGroupDto {
  return {
    name,
    status,
    sets,
    volume: 0,
    exerciseCount: 1,
    lastTrainedAt: null,
  };
}

describe('getCoachVolumeSaturation', () => {
  it('detects saturation with three high major groups and at least 75% high trained groups', () => {
    const result = getCoachVolumeSaturation([
      muscle('Gambe e glutei', 'high', 13),
      muscle('Petto', 'high', 13),
      muscle('Schiena', 'high', 13),
      muscle('Bicipiti', 'high', 13),
      muscle('Tricipiti', 'low', 2),
      muscle('Spalle', 'none'),
    ]);

    expect(result).toEqual({
      isSaturated: true,
      trainedGroupCount: 5,
      highTrainedGroupCount: 4,
      highMajorGroups: ['Gambe e glutei', 'Petto', 'Schiena'],
    });
  });

  it('detects saturation when exactly 75% of trained groups are high', () => {
    const result = getCoachVolumeSaturation([
      muscle('Gambe e glutei', 'high', 13),
      muscle('Petto', 'high', 13),
      muscle('Schiena', 'high', 13),
      muscle('Tricipiti', 'low', 2),
    ]);

    expect(result.isSaturated).toBe(true);
    expect(result.trainedGroupCount).toBe(4);
    expect(result.highTrainedGroupCount).toBe(3);
  });

  it('does not detect saturation with fewer than three high major groups', () => {
    const result = getCoachVolumeSaturation([
      muscle('Petto', 'high', 13),
      muscle('Schiena', 'high', 13),
      muscle('Bicipiti', 'high', 13),
    ]);

    expect(result.isSaturated).toBe(false);
    expect(result.highMajorGroups).toEqual(['Petto', 'Schiena']);
  });

  it('does not detect saturation when the high trained group ratio is below 75%', () => {
    const result = getCoachVolumeSaturation([
      muscle('Gambe e glutei', 'high', 13),
      muscle('Petto', 'high', 13),
      muscle('Schiena', 'high', 13),
      muscle('Bicipiti', 'low', 2),
      muscle('Tricipiti', 'low', 2),
    ]);

    expect(result.isSaturated).toBe(false);
    expect(result.trainedGroupCount).toBe(5);
    expect(result.highTrainedGroupCount).toBe(3);
  });

  it('does not count untrained groups in the saturation ratio', () => {
    const result = getCoachVolumeSaturation([
      muscle('Gambe e glutei', 'high', 13),
      muscle('Petto', 'high', 13),
      muscle('Schiena', 'high', 13),
      muscle('Spalle', 'none'),
      muscle('Bicipiti', 'none'),
      muscle('Tricipiti', 'none'),
    ]);

    expect(result.isSaturated).toBe(true);
    expect(result.trainedGroupCount).toBe(3);
    expect(result.highTrainedGroupCount).toBe(3);
  });
});
