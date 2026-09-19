import { CoachMuscleGroupDto } from '../dto/weeklyCoachSummary.dto';
import { buildCoachSessionRecommendation } from './coachSessionRecommendation.rules';

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
    expect(result.reasons[0]).toBe('Hai completato 2 allenamenti su 4.');
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

    expect(result.reasons[0]).toBe('Hai completato 1 allenamento su 3.');
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
});
