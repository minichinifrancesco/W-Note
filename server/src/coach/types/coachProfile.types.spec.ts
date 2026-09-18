import { normalizeCoachProfile } from './coachProfile.types';

describe('normalizeCoachProfile', () => {
  it('keeps a valid coach profile', () => {
    expect(
      normalizeCoachProfile({
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      }),
    ).toEqual({
      trainingGoal: 'MASSA',
      trainingLevel: 'INTERMEDIO',
      targetWorkoutDays: 4,
    });
  });

  it('uses defaults for invalid goal and level', () => {
    expect(
      normalizeCoachProfile({
        trainingGoal: 'ALTRO',
        trainingLevel: 'ESPERTO',
        targetWorkoutDays: 3,
      }),
    ).toEqual({
      trainingGoal: 'GENERALE',
      trainingLevel: 'PRINCIPIANTE',
      targetWorkoutDays: 3,
    });
  });

  it('clamps target workout days between 1 and 7', () => {
    expect(
      normalizeCoachProfile({
        trainingGoal: 'FORZA',
        trainingLevel: 'AVANZATO',
        targetWorkoutDays: 12,
      }).targetWorkoutDays,
    ).toBe(7);

    expect(
      normalizeCoachProfile({
        trainingGoal: 'FORZA',
        trainingLevel: 'AVANZATO',
        targetWorkoutDays: 0,
      }).targetWorkoutDays,
    ).toBe(1);
  });
});
