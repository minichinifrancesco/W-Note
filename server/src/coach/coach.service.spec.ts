import { BadRequestException } from '@nestjs/common';
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

    expect(result.periodStatus).toBe('CURRENT');

    const recommendedSession = result.recommendedSession;

    expect(recommendedSession).not.toBeNull();

    if (!recommendedSession) {
      throw new Error(
        'Una settimana corrente deve contenere una seduta consigliata',
      );
    }

    expect(repository.getCoachProfile.mock.calls).toEqual([[42]]);

    expect(recommendedSession).toEqual(
      expect.objectContaining({
        title: 'Prossima seduta consigliata',
        sessionType: 'Upper body ipertrofia compatta',
        priorities: [
          'Panca piana: progressione graduale',
          'Schiena',
          'Petto',
          'Spalle',
        ],
      }),
    );

    expect(recommendedSession.reasons[0]).toBe(
      'Hai completato 2 allenamenti su 4: ne restano 2.',
    );

    expect(recommendedSession.reasons[1]).toContain('sotto il ritmo previsto');

    expect(recommendedSession.reasons[2]).toContain(
      'I gruppi con meno lavoro questa settimana',
    );

    expect(recommendedSession.reasons[3]).toContain(
      '1RM stimato su Panca piana è in crescita',
    );

    expect(recommendedSession.weeklyProgress).toEqual({
      status: 'IN_PROGRESS',
      completedSessions: 2,
      targetSessions: 4,
      remainingSessions: 2,
      paceStatus: 'BEHIND_TARGET',
      expectedSessions: 3,
      daysRemaining: 1,
    });

    expect(recommendedSession.guidance).toContain('progressione controllata');

    expect(recommendedSession.focus).toContain(
      'Dorso come priorità principale',
    );

    expect(recommendedSession.focus).toContain('Dorso, Petto, Spalle');

    expect(recommendedSession.focus).toContain(
      'senza aggiungere volume non prioritario',
    );

    expect(recommendedSession.structure).toContain(
      '1-2 esercizi multiarticolari',
    );

    expect(recommendedSession.structure).toContain('un solo giorno utile');

    expect(recommendedSession.structure).toContain('riduci gli accessori');

    expect(recommendedSession.structure).toContain(
      'non tentare di recuperare tutto il volume mancante',
    );

    expect(recommendedSession.intensity).toContain('90 e 120 secondi');

    expect(recommendedSession.intensity).toContain(
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

    expect(recommendedSession.focus).toContain(
      'Per Panca piana, mantieni la progressione',
    );

    expect(recommendedSession.structure).toContain(
      'una sola variabile alla volta su Panca piana',
    );

    expect(recommendedSession.intensity).toContain(
      'non aumentare anche il volume',
    );

    expect(result.insights).toBeDefined();
  });

  it('forces recovery when weekly volume is saturated across major muscle groups', async () => {
    repository.getCoachProfile.mockResolvedValue({
      trainingGoal: 'MASSA',
      trainingLevel: 'INTERMEDIO',
      targetWorkoutDays: 5,
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
          sessions: 0,
          durationSeconds: 0,
        },
      ]);

    repository.getSetTotals
      .mockResolvedValueOnce([
        {
          completedSets: 54,
          volume: 12000,
        },
      ])
      .mockResolvedValueOnce([
        {
          completedSets: 0,
          volume: 0,
        },
      ]);

    repository.getMuscleGroups.mockResolvedValue([
      {
        name: 'Gambe e glutei',
        sets: 13,
        volume: 3500,
        exerciseCount: 2,
        lastTrainedAt: new Date('2026-09-18T10:00:00.000Z'),
      },
      {
        name: 'Petto',
        sets: 13,
        volume: 3000,
        exerciseCount: 2,
        lastTrainedAt: new Date('2026-09-19T10:00:00.000Z'),
      },
      {
        name: 'Schiena',
        sets: 13,
        volume: 3200,
        exerciseCount: 2,
        lastTrainedAt: new Date('2026-09-19T10:00:00.000Z'),
      },
      {
        name: 'Bicipiti',
        sets: 13,
        volume: 800,
        exerciseCount: 1,
        lastTrainedAt: new Date('2026-09-19T10:00:00.000Z'),
      },
      {
        name: 'Tricipiti',
        sets: 2,
        volume: 300,
        exerciseCount: 1,
        lastTrainedAt: new Date('2026-09-19T10:00:00.000Z'),
      },
    ]);

    repository.getLastTrainedMuscleGroups.mockResolvedValue([]);
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

    const recommendedSession = result.recommendedSession;

    expect(recommendedSession).not.toBeNull();

    if (!recommendedSession) {
      throw new Error(
        'Una settimana corrente deve contenere una seduta consigliata',
      );
    }

    expect(recommendedSession.sessionType).toBe('Recupero e mobilità');

    expect(recommendedSession.priorities).toEqual([
      'Mobilità',
      'Camminata leggera',
      'Tecnica senza carico o riposo',
    ]);

    expect(recommendedSession.reasons).toEqual([
      'Il volume settimanale è già elevato su gran parte dei distretti.',
      'Aggiungere un’altra seduta intensa ora ridurrebbe la qualità del recupero.',
    ]);

    expect(recommendedSession.focus).toBe(
      'Mobilità, camminata leggera, tecnica senza carico o riposo.',
    );

    expect(recommendedSession.structure).toBe(
      'Dedica la seduta a mobilità, respirazione e attività leggera, senza aggiungere volume allenante.',
    );

    expect(recommendedSession.intensity).toBe(
      'Sforzo leggero. Non aggiungere volume allenante.',
    );

    expect(recommendedSession.guidance).toBe(
      'Oggi la priorità è recuperare, non aggiungere nuovo volume.',
    );

    expect(recommendedSession.reasons).not.toContain(
      expect.stringContaining('sotto il ritmo previsto'),
    );

    expect(result.exerciseTrends).toEqual([
      expect.objectContaining({
        exerciseName: 'Panca piana',
        status: 'IMPROVING',
      }),
    ]);

    expect(recommendedSession.priorities).not.toContain(
      'Panca piana: progressione graduale',
    );
  });

  it('returns a retrospective summary without an operational recommendation for a historical week', async () => {
    repository.getCoachProfile.mockResolvedValue({
      trainingGoal: 'MASSA',
      trainingLevel: 'INTERMEDIO',
      targetWorkoutDays: 3,
    });

    repository.getWorkoutTotals
      .mockResolvedValueOnce([
        {
          sessions: 1,
          durationSeconds: 1800,
        },
      ])
      .mockResolvedValueOnce([
        {
          sessions: 2,
          durationSeconds: 3600,
        },
      ]);

    repository.getSetTotals
      .mockResolvedValueOnce([
        {
          completedSets: 6,
          volume: 1500,
        },
      ])
      .mockResolvedValueOnce([
        {
          completedSets: 12,
          volume: 3000,
        },
      ]);

    repository.getMuscleGroups.mockResolvedValue([
      {
        name: 'Petto',
        sets: 6,
        volume: 1500,
        exerciseCount: 1,
        lastTrainedAt: new Date('2026-09-08T10:00:00.000Z'),
      },
    ]);

    repository.getLastTrainedMuscleGroups.mockResolvedValue([]);

    repository.getWorkoutDays.mockResolvedValue([
      {
        date: '2026-09-08',
        sessions: 1,
        durationSeconds: 1800,
      },
    ]);

    repository.getSetDays.mockResolvedValue([
      {
        date: '2026-09-08',
        completedSets: 6,
        volume: 1500,
      },
    ]);

    repository.getBadges.mockResolvedValue([]);

    repository.getExercisePerformanceSets.mockResolvedValue([
      {
        workoutId: 100,
        performedAt: new Date('2026-08-31T10:00:00.000Z'),
        exerciseId: 10,
        exerciseName: 'Panca piana',
        muscleGroup: 'Petto',
        trackingType: 'WEIGHT_REPS',
        load: 80,
        reps: 5,
      },
      {
        workoutId: 101,
        performedAt: new Date('2026-09-08T10:00:00.000Z'),
        exerciseId: 10,
        exerciseName: 'Panca piana',
        muscleGroup: 'Petto',
        trackingType: 'WEIGHT_REPS',
        load: 85,
        reps: 5,
      },
    ]);

    const result = await service.getWeeklySummary(
      {
        userId: 42,
        email: 'utente@example.com',
      },
      '2026-09-07',
    );

    expect(result.periodStatus).toBe('HISTORICAL');

    expect(result.recommendedSession).toBeNull();

    expect(result.totals).toEqual({
      sessions: 1,
      durationSeconds: 1800,
      completedSets: 6,
      volume: 1500,
      averageDurationSeconds: 1800,
    });

    expect(result.comparison).toEqual({
      sessionsDelta: -1,
      durationSecondsDelta: -1800,
      completedSetsDelta: -6,
      volumeDelta: -1500,
      volumeDeltaPercent: -50,
    });

    expect(result.days).toEqual([
      {
        date: '2026-09-08',
        sessions: 1,
        durationSeconds: 1800,
        completedSets: 6,
        volume: 1500,
      },
    ]);

    expect(result.exerciseTrends).toEqual([
      expect.objectContaining({
        exerciseId: 10,
        exerciseName: 'Panca piana',
        muscleGroup: 'Petto',
        status: 'IMPROVING',
        comparedSessions: 2,
      }),
    ]);

    expect(result.muscleGroups).toContainEqual(
      expect.objectContaining({
        name: 'Petto',
        sets: 6,
        status: 'ok',
      }),
    );
  });

  it('rejects a future week before querying the repository', async () => {
    await expect(
      service.getWeeklySummary(
        {
          userId: 42,
          email: 'utente@example.com',
        },
        '2026-09-21',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(repository.getCoachProfile.mock.calls).toHaveLength(0);
    expect(repository.getWorkoutTotals.mock.calls).toHaveLength(0);
    expect(repository.getSetTotals.mock.calls).toHaveLength(0);
    expect(repository.getMuscleGroups.mock.calls).toHaveLength(0);
    expect(repository.getLastTrainedMuscleGroups.mock.calls).toHaveLength(0);
    expect(repository.getWorkoutDays.mock.calls).toHaveLength(0);
    expect(repository.getSetDays.mock.calls).toHaveLength(0);
    expect(repository.getBadges.mock.calls).toHaveLength(0);
    expect(repository.getExercisePerformanceSets.mock.calls).toHaveLength(0);
  });
});
