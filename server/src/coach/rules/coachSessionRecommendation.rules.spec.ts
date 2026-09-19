import { CoachMuscleGroupDto } from '../dto/weeklyCoachSummary.dto';
import {
  adaptSessionStructureToWeeklyPace,
  adaptSessionTypeAndFocusToWeeklyPace,
  buildCoachSessionRecommendation,
} from './coachSessionRecommendation.rules';

function muscle(
  name: string,
  status: CoachMuscleGroupDto['status'],
  sets = 0,
  lastTrainedAt: string | null = null,
): CoachMuscleGroupDto {
  return {
    name,
    status,
    sets,
    volume: 0,
    exerciseCount: 0,
    lastTrainedAt,
  };
}

const totals = {
  sessions: 2,
  durationSeconds: 3600,
  completedSets: 12,
  volume: 4000,
  averageDurationSeconds: 1800,
};

describe('buildCoachSessionRecommendation', () => {
  it('recommends upper body hypertrophy for a mass profile', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
      totals,
      muscleGroups: [
        muscle('Petto', 'low', 2),
        muscle('Schiena', 'none'),
        muscle('Spalle', 'low', 3),
        muscle('Gambe e glutei', 'ok', 8),
      ],
    });

    expect(result.sessionType).toBe('Upper body ipertrofia');
    expect(result.priorities).toEqual(['Schiena', 'Petto', 'Spalle']);
    expect(result.reasons[0]).toBe(
      'Hai completato 2 allenamenti su 4: ne restano 2.',
    );
    expect(result.focus).toBe(
      'Dorso come priorità principale, con richiamo su Petto e Spalle.',
    );
    expect(result.structure).toContain('1-2 esercizi multiarticolari');
    expect(result.intensity).toContain('90 e 120 secondi');
    expect(result.intensity).toContain('1-3 ripetizioni di margine');
  });

  it('recommends a guided full body session for a beginner', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'DIMAGRIMENTO',
        trainingLevel: 'PRINCIPIANTE',
        targetWorkoutDays: 2,
      },
      totals: {
        ...totals,
        sessions: 0,
        completedSets: 0,
        volume: 0,
        durationSeconds: 0,
        averageDurationSeconds: 0,
      },
      muscleGroups: [muscle('Gambe e glutei', 'none')],
    });

    expect(result.sessionType).toBe('Full body guidata');
    expect(result.guidance).toContain('movimenti semplici');
    expect(result.focus).toContain('gambe, spinta e tirata');
    expect(result.structure).toContain('3-4 esercizi principali');
    expect(result.structure).toContain('apprendimento tecnico');
    expect(result.intensity).toContain('45 e 90 secondi');
  });

  it('uses technical language for an advanced strength profile', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'FORZA',
        trainingLevel: 'AVANZATO',
        targetWorkoutDays: 5,
      },
      totals,
      muscleGroups: [muscle('Petto', 'low', 2)],
    });

    expect(result.sessionType).toBe('Seduta di forza');
    expect(result.guidance).toContain('volume, intensità e recuperi');
    expect(result.structure).toContain('1 o 2 sollevamenti fondamentali');
    expect(result.structure).toContain('lavoro accessorio leggero');
    expect(result.intensity).toContain('3 e 5 minuti');
    expect(result.intensity).toContain('evita il cedimento');
  });

  it('uses a full body recommendation when no training data exists', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
      totals: {
        ...totals,
        sessions: 0,
        completedSets: 0,
        volume: 0,
        durationSeconds: 0,
        averageDurationSeconds: 0,
      },
      muscleGroups: [
        muscle('Gambe e glutei', 'none'),
        muscle('Petto', 'none'),
        muscle('Schiena', 'none'),
        muscle('Spalle', 'none'),
      ],
    });

    expect(result.sessionType).toBe('Full body ipertrofia');
    expect(result.priorities).toEqual([]);
    expect(result.reasons[1]).toContain('assenza di dati recenti');
    expect(result.reasons[1]).toContain('Full body ipertrofia');
  });

  it('uses the singular form for one completed workout', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'GENERALE',
        trainingLevel: 'PRINCIPIANTE',
        targetWorkoutDays: 3,
      },
      totals: { ...totals, sessions: 1 },
      muscleGroups: [muscle('Petto', 'ok', 6)],
    });

    expect(result.reasons[0]).toBe(
      'Hai completato 1 allenamento su 3: ne restano 2.',
    );
  });

  it('recommends a balanced session for a general balanced profile', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'GENERALE',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 3,
      },
      totals,
      muscleGroups: [
        muscle('Petto', 'ok', 6),
        muscle('Schiena', 'ok', 6),
        muscle('Gambe e glutei', 'ok', 8),
      ],
    });

    expect(result.sessionType).toBe('Seduta bilanciata');
    expect(result.priorities).toEqual([]);
  });

  it('does not infer muscle priorities from a session without completed sets', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
      totals: {
        ...totals,
        sessions: 1,
        completedSets: 0,
      },
      muscleGroups: [muscle('Petto', 'none'), muscle('Schiena', 'none')],
    });

    expect(result.sessionType).toBe('Full body ipertrofia');
    expect(result.priorities).toEqual([]);
    expect(result.reasons[1]).toContain('serie completate');
  });

  it('prioritizes the muscle group trained less recently', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
      totals,
      muscleGroups: [
        muscle('Petto', 'low', 3, '2026-09-15T10:00:00.000Z'),
        muscle('Schiena', 'low', 3, '2026-09-10T10:00:00.000Z'),
        muscle('Spalle', 'low', 3, '2026-09-17T10:00:00.000Z'),
      ],
    });

    expect(result.priorities).toEqual(['Schiena', 'Petto', 'Spalle']);
  });

  it('recommends lower body hypertrophy when lower body needs priority', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
      totals,
      muscleGroups: [
        muscle('Gambe e glutei', 'none'),
        muscle('Polpacci', 'low', 1),
        muscle('Petto', 'ok', 8),
        muscle('Schiena', 'ok', 8),
      ],
    });

    expect(result.sessionType).toBe('Lower body ipertrofia');
    expect(result.priorities).toEqual(['Gambe e glutei', 'Polpacci']);
  });

  it('uses an antagonist focus for balanced chest and back priorities', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
      totals,
      muscleGroups: [
        muscle('Petto', 'low', 2, '2026-09-10T10:00:00.000Z'),
        muscle('Schiena', 'low', 2, '2026-09-10T10:00:00.000Z'),
        muscle('Spalle', 'low', 3, '2026-09-10T10:00:00.000Z'),
        muscle('Gambe e glutei', 'ok', 8),
      ],
    });

    expect(result.focus).toBe(
      'Alterna movimenti di spinta e tirata per Petto e Dorso, con richiamo su Spalle.',
    );
  });

  it('uses controlled strength intensity for a beginner', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'FORZA',
        trainingLevel: 'PRINCIPIANTE',
        targetWorkoutDays: 2,
      },
      totals: {
        ...totals,
        sessions: 0,
        completedSets: 0,
        volume: 0,
        durationSeconds: 0,
        averageDurationSeconds: 0,
      },
      muscleGroups: [],
    });

    expect(result.sessionType).toBe('Full body forza');
    expect(result.structure).toContain('carichi gestibili');
    expect(result.intensity).toContain('3-4 ripetizioni di margine');
    expect(result.intensity).toContain('2-3 minuti');
    expect(result.intensity).toContain('evita il cedimento');
    expect(result.intensity).not.toContain('carichi impegnativi');
  });

  it('recommends recovery when target is reached with balanced work', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
      totals: { ...totals, sessions: 4 },
      muscleGroups: [
        muscle('Petto', 'ok', 6),
        muscle('Schiena', 'ok', 6),
        muscle('Gambe e glutei', 'ok', 8),
      ],
    });

    expect(result.weeklyProgress.status).toBe('TARGET_REACHED');
    expect(result.sessionType).toBe('Recupero e mobilità');
    expect(result.focus).toContain('Recupero generale');
  });

  it('keeps a targeted recommendation when target is reached but work is unbalanced', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
      totals: { ...totals, sessions: 4 },
      muscleGroups: [
        muscle('Schiena', 'none'),
        muscle('Gambe e glutei', 'ok', 8),
      ],
    });

    expect(result.weeklyProgress.status).toBe('TARGET_REACHED');
    expect(result.sessionType).not.toBe('Recupero e mobilità');
    expect(result.priorities).toContain('Schiena');
  });

  it('recommends recovery above the weekly target', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
      totals: { ...totals, sessions: 5 },
      muscleGroups: [muscle('Petto', 'low', 2)],
    });

    expect(result.weeklyProgress.status).toBe('ABOVE_TARGET');
    expect(result.sessionType).toBe('Recupero e mobilità');
    expect(result.intensity).toContain('sforzo leggero');
  });

  it('does not infer balanced work when target is reached without completed sets', () => {
    const result = buildCoachSessionRecommendation({
      profile: {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
      totals: {
        ...totals,
        sessions: 4,
        completedSets: 0,
        volume: 0,
      },
      muscleGroups: [],
    });

    expect(result.weeklyProgress.status).toBe('TARGET_REACHED');
    expect(result.sessionType).not.toBe('Recupero e mobilità');
    expect(result.reasons[1]).toContain('serie completate');
  });
});

describe('adaptSessionTypeAndFocusToWeeklyPace', () => {
  const progress = {
    status: 'IN_PROGRESS' as const,
    completedSessions: 2,
    targetSessions: 4,
    remainingSessions: 2,
  };

  it('keeps type and focus when multiple days remain', () => {
    const result = adaptSessionTypeAndFocusToWeeklyPace(
      'Upper body ipertrofia',
      'Dorso come priorità principale.',
      ['Schiena', 'Petto'],
      progress,
      {
        status: 'BEHIND_TARGET',
        expectedSessions: 3,
        daysRemaining: 2,
      },
    );

    expect(result).toEqual({
      sessionType: 'Upper body ipertrofia',
      focus: 'Dorso come priorità principale.',
    });
  });

  it('uses a compact session when one day remains', () => {
    const result = adaptSessionTypeAndFocusToWeeklyPace(
      'Upper body ipertrofia',
      'Dorso come priorità principale, con richiamo su Petto e Spalle.',
      ['Schiena', 'Petto', 'Spalle'],
      progress,
      {
        status: 'BEHIND_TARGET',
        expectedSessions: 3,
        daysRemaining: 1,
      },
    );

    expect(result.sessionType).toBe('Upper body ipertrofia compatta');
    expect(result.focus).toContain(
      'Dorso come priorità principale, con richiamo su Petto e Spalle.',
    );
    expect(result.focus).toContain('Dorso, Petto, Spalle');
    expect(result.focus).toContain('senza aggiungere volume non prioritario');
  });

  it('uses an essential full body focus when no priorities are available', () => {
    const result = adaptSessionTypeAndFocusToWeeklyPace(
      'Full body guidata',
      'Copri i tre movimenti principali: gambe, spinta e tirata.',
      [],
      {
        status: 'NOT_STARTED',
        completedSessions: 0,
        targetSessions: 2,
        remainingSessions: 2,
      },
      {
        status: 'BEHIND_TARGET',
        expectedSessions: 1,
        daysRemaining: 1,
      },
    );

    expect(result.sessionType).toBe('Full body guidata compatta');
    expect(result.focus).toContain('gambe, spinta e tirata');
    expect(result.focus).toContain(
      'limita il lavoro ai movimenti più importanti',
    );
  });

  it('does not adapt a completed historical week', () => {
    const result = adaptSessionTypeAndFocusToWeeklyPace(
      'Upper body ipertrofia',
      'Dorso come priorità principale.',
      ['Schiena'],
      progress,
      {
        status: 'BEHIND_TARGET',
        expectedSessions: 4,
        daysRemaining: 0,
      },
    );

    expect(result).toEqual({
      sessionType: 'Upper body ipertrofia',
      focus: 'Dorso come priorità principale.',
    });
  });

  it('does not adapt the recommendation when the user is on track', () => {
    const result = adaptSessionTypeAndFocusToWeeklyPace(
      'Upper body ipertrofia',
      'Dorso come priorità principale.',
      ['Schiena'],
      progress,
      {
        status: 'ON_TRACK',
        expectedSessions: 2,
        daysRemaining: 3,
      },
    );

    expect(result).toEqual({
      sessionType: 'Upper body ipertrofia',
      focus: 'Dorso come priorità principale.',
    });
  });

  it('does not adapt type and focus when pace is not applicable', () => {
    const result = adaptSessionTypeAndFocusToWeeklyPace(
      'Recupero e mobilità',
      'Recupero generale e mobilità.',
      [],
      {
        status: 'TARGET_REACHED',
        completedSessions: 4,
        targetSessions: 4,
        remainingSessions: 0,
      },
      {
        status: 'NOT_APPLICABLE',
        expectedSessions: 4,
        daysRemaining: 1,
      },
    );

    expect(result).toEqual({
      sessionType: 'Recupero e mobilità',
      focus: 'Recupero generale e mobilità.',
    });
  });
});

describe('adaptSessionStructureToWeeklyPace', () => {
  const baseStructure =
    'Inizia con 1-2 esercizi multiarticolari e completa con esercizi complementari.';

  it('keeps the original structure when the user is on track', () => {
    expect(
      adaptSessionStructureToWeeklyPace(baseStructure, {
        status: 'ON_TRACK',
        expectedSessions: 2,
        daysRemaining: 3,
      }),
    ).toBe(baseStructure);
  });

  it('adapts the structure without adding volume when the user is behind', () => {
    const result = adaptSessionStructureToWeeklyPace(baseStructure, {
      status: 'BEHIND_TARGET',
      expectedSessions: 3,
      daysRemaining: 2,
    });

    expect(result).toContain(baseStructure);
    expect(result).toContain('2 giorni rimanenti');
    expect(result).toContain('senza aggiungere serie per compensare');
  });

  it('reduces accessories when only one day remains', () => {
    const result = adaptSessionStructureToWeeklyPace(baseStructure, {
      status: 'BEHIND_TARGET',
      expectedSessions: 3,
      daysRemaining: 1,
    });

    expect(result).toContain('un solo giorno utile');
    expect(result).toContain('riduci gli accessori');
    expect(result).toContain(
      'non tentare di recuperare tutto il volume mancante',
    );
  });

  it('does not alter the structure of a completed historical week', () => {
    expect(
      adaptSessionStructureToWeeklyPace(baseStructure, {
        status: 'BEHIND_TARGET',
        expectedSessions: 4,
        daysRemaining: 0,
      }),
    ).toBe(baseStructure);
  });
});
