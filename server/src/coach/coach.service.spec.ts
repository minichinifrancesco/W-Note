import { CoachRepository } from './repositories/coach.repository';
import { CoachService } from './coach.service';

describe('CoachService', () => {
  let service: CoachService;
  let repository: jest.Mocked<CoachRepository>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-20T12:00:00'));

    repository = {
      getCoachProfile: jest.fn(),
      getWorkoutTotals: jest.fn(),
      getSetTotals: jest.fn(),
      getMuscleGroups: jest.fn(),
      getLastTrainedMuscleGroups: jest.fn(),
      getWorkoutDays: jest.fn(),
      getSetDays: jest.fn(),
      getBadges: jest.fn(),
      getExercisePerformanceSets: jest.fn(),
    } as unknown as jest.Mocked<CoachRepository>;

    service = new CoachService(repository);
  });

  afterEach(() => {
    jest.useRealTimers();
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

    repository.getExercisePerformanceSets.mockResolvedValue([
      {
        workoutId: 100,
        performedAt: new Date('2026-08-24T10:00:00.000Z'),
        exerciseId: 10,
        exerciseName: 'Panca piana',
        muscleGroup: 'Petto',
        trackingType: 'WEIGHT_REPS',
        load: 100,
        reps: 5,
      },
      {
        workoutId: 101,
        performedAt: new Date('2026-09-14T10:00:00.000Z'),
        exerciseId: 10,
        exerciseName: 'Panca piana',
        muscleGroup: 'Petto',
        trackingType: 'WEIGHT_REPS',
        load: 105,
        reps: 5,
      },
    ]);

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
        sessionType: 'Upper body ipertrofia compatta',
        priorities: ['Schiena', 'Petto', 'Spalle'],
      }),
    );

    expect(result.recommendedSession.reasons[0]).toBe(
      'Hai completato 2 allenamenti su 4: ne restano 2.',
    );

    expect(result.recommendedSession.reasons[1]).toContain(
      'sotto il ritmo previsto',
    );

    expect(result.recommendedSession.reasons[2]).toContain(
      'I gruppi con meno lavoro questa settimana',
    );

    expect(result.recommendedSession.weeklyProgress).toEqual({
      status: 'IN_PROGRESS',
      completedSessions: 2,
      targetSessions: 4,
      remainingSessions: 2,
      paceStatus: 'BEHIND_TARGET',
      expectedSessions: 3,
      daysRemaining: 1,
    });

    expect(result.recommendedSession.guidance).toContain(
      'progressione controllata',
    );

    expect(result.recommendedSession.focus).toContain(
      'Dorso come priorità principale',
    );

    expect(result.recommendedSession.focus).toContain('Dorso, Petto, Spalle');

    expect(result.recommendedSession.focus).toContain(
      'senza aggiungere volume non prioritario',
    );

    expect(result.recommendedSession.structure).toContain(
      '1-2 esercizi multiarticolari',
    );

    expect(result.recommendedSession.structure).toContain(
      'un solo giorno utile',
    );

    expect(result.recommendedSession.structure).toContain(
      'riduci gli accessori',
    );

    expect(result.recommendedSession.structure).toContain(
      'non tentare di recuperare tutto il volume mancante',
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

    const [trendUserId, trendStart, trendEnd] =
      repository.getExercisePerformanceSets.mock.calls[0];

    expect(trendUserId).toBe(42);
    expect(trendStart).toBeInstanceOf(Date);
    expect(trendEnd).toBeInstanceOf(Date);

    expect(trendStart.getFullYear()).toBe(2026);
    expect(trendStart.getMonth()).toBe(5);
    expect(trendStart.getDate()).toBe(29);

    expect(trendEnd.getFullYear()).toBe(2026);
    expect(trendEnd.getMonth()).toBe(8);
    expect(trendEnd.getDate()).toBe(21);

    expect(result.exerciseTrends).toEqual([
      expect.objectContaining({
        exerciseId: 10,
        exerciseName: 'Panca piana',
        muscleGroup: 'Petto',
        status: 'IMPROVING',
        comparedSessions: 2,
      }),
    ]);

    expect(result.insights).toBeDefined();
  });
});
