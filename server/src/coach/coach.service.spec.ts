import { CoachRepository } from './repositories/coach.repository';
import { CoachService } from './coach.service';

describe('CoachService', () => {
  let service: CoachService;
  let repository: jest.Mocked<CoachRepository>;

  beforeEach(() => {
    repository = {
      getCoachProfile: jest.fn(),
      getWorkoutTotals: jest.fn(),
      getSetTotals: jest.fn(),
      getMuscleGroups: jest.fn(),
      getLastTrainedMuscleGroups: jest.fn(),
      getWorkoutDays: jest.fn(),
      getSetDays: jest.fn(),
      getBadges: jest.fn(),
    } as unknown as jest.Mocked<CoachRepository>;

    service = new CoachService(repository);
  });

  it('builds the recommended session from the user coach profile', async () => {
    repository.getCoachProfile.mockResolvedValue({
      trainingGoal: 'MASSA',
      trainingLevel: 'INTERMEDIO',
      targetWorkoutDays: 4,
    });

    repository.getWorkoutTotals
      .mockResolvedValueOnce([
        {
          sessions: 2,
          durationSeconds: 3600,
        },
      ])
      .mockResolvedValueOnce([
        {
          sessions: 1,
          durationSeconds: 1800,
        },
      ]);

    repository.getSetTotals
      .mockResolvedValueOnce([
        {
          completedSets: 12,
          volume: 4000,
        },
      ])
      .mockResolvedValueOnce([
        {
          completedSets: 8,
          volume: 2500,
        },
      ]);

    repository.getMuscleGroups.mockResolvedValue([
      {
        name: 'Gambe e glutei',
        sets: 8,
        volume: 2000,
        exerciseCount: 2,
        lastTrainedAt: new Date('2026-09-15T10:00:00.000Z'),
      },
      {
        name: 'Petto',
        sets: 2,
        volume: 500,
        exerciseCount: 1,
        lastTrainedAt: new Date('2026-09-14T10:00:00.000Z'),
      },
      {
        name: 'Spalle',
        sets: 3,
        volume: 400,
        exerciseCount: 1,
        lastTrainedAt: new Date('2026-09-16T10:00:00.000Z'),
      },
      {
        name: 'Bicipiti',
        sets: 6,
        volume: 300,
        exerciseCount: 1,
        lastTrainedAt: new Date('2026-09-16T10:00:00.000Z'),
      },
      {
        name: 'Tricipiti',
        sets: 6,
        volume: 300,
        exerciseCount: 1,
        lastTrainedAt: new Date('2026-09-16T10:00:00.000Z'),
      },
      {
        name: 'Addome e core',
        sets: 6,
        volume: 0,
        exerciseCount: 1,
        lastTrainedAt: new Date('2026-09-15T10:00:00.000Z'),
      },
      {
        name: 'Polpacci',
        sets: 6,
        volume: 500,
        exerciseCount: 1,
        lastTrainedAt: new Date('2026-09-15T10:00:00.000Z'),
      },
      {
        name: 'Glutei specifici',
        sets: 6,
        volume: 700,
        exerciseCount: 1,
        lastTrainedAt: new Date('2026-09-15T10:00:00.000Z'),
      },
    ]);

    repository.getLastTrainedMuscleGroups.mockResolvedValue([
      {
        name: 'Schiena',
        lastTrainedAt: new Date('2026-09-08T10:00:00.000Z'),
      },
    ]);

    repository.getWorkoutDays.mockResolvedValue([]);

    repository.getSetDays.mockResolvedValue([]);

    repository.getBadges.mockResolvedValue([]);

    const result = await service.getWeeklySummary(
      {
        userId: 42,
        email: 'utente@example.com',
      },
      '2026-09-14',
    );

    expect(repository.getCoachProfile.mock.calls).toEqual([[42]]);

    expect(result.recommendedSession).toEqual(
      expect.objectContaining({
        title: 'Prossima seduta consigliata',
        sessionType: 'Upper body ipertrofia',
        priorities: ['Schiena', 'Petto', 'Spalle'],
      }),
    );

    expect(result.recommendedSession.reasons[0]).toBe(
      'Hai completato 2 allenamenti su 4.',
    );

    expect(result.recommendedSession.guidance).toContain(
      'progressione controllata',
    );

    expect(result.recommendedSession.focus).toBe(
      'Dorso come priorità principale, con richiamo su Petto e Spalle.',
    );

    expect(result.recommendedSession.structure).toContain(
      '1-2 esercizi multiarticolari',
    );

    expect(result.recommendedSession.intensity).toContain('90 e 120 secondi');

    expect(result.recommendedSession.intensity).toContain(
      '1-3 ripetizioni di margine',
    );

    expect(result.totals).toEqual({
      sessions: 2,
      durationSeconds: 3600,
      completedSets: 12,
      volume: 4000,
      averageDurationSeconds: 1800,
    });

    expect(result.nextFocus).toBeDefined();

    expect(result.insights).toBeDefined();
  });
});
