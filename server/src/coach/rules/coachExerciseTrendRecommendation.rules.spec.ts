import { CoachRecommendedSessionDto } from '../dto/weeklyCoachSummary.dto';
import { CoachExerciseTrend } from './coachExerciseTrend.rules';
import { adaptSessionRecommendationToExerciseTrends } from './coachExerciseTrendRecommendation.rules';

const baseRecommendation: CoachRecommendedSessionDto = {
  title: 'Prossima seduta consigliata',
  sessionType: 'Seduta di forza',
  reasons: ['Hai completato 2 allenamenti su 5: ne restano 3.'],
  priorities: ['Petto'],
  guidance: 'Gestisci volume, intensità e recuperi.',
  focus: 'Petto come priorità principale della seduta.',
  structure: 'Concentrati su 1 o 2 sollevamenti fondamentali.',
  intensity: 'Recupera tra 3 e 5 minuti sulle alzate principali.',
  weeklyProgress: {
    status: 'IN_PROGRESS',
    completedSessions: 2,
    targetSessions: 5,
    remainingSessions: 3,
    paceStatus: 'ON_TRACK',
    expectedSessions: 2,
    daysRemaining: 4,
  },
};

function trend(
  overrides: Partial<CoachExerciseTrend> = {},
): CoachExerciseTrend {
  return {
    exerciseId: 10,
    exerciseName: 'Panca piana',
    muscleGroup: 'Petto',
    status: 'STABLE',
    currentEstimatedOneRm: 120,
    previousEstimatedOneRm: 120,
    deltaPercent: 0,
    comparedSessions: 2,
    message: 'Messaggio del trend.',
    ...overrides,
  };
}

const advancedStrengthProfile = {
  trainingGoal: 'FORZA' as const,
  trainingLevel: 'AVANZATO' as const,
  targetWorkoutDays: 5,
};

describe('adaptSessionRecommendationToExerciseTrends', () => {
  it('adds a technical priority for a stable strength exercise', () => {
    const result = adaptSessionRecommendationToExerciseTrends(
      baseRecommendation,
      [trend()],
      advancedStrengthProfile,
    );

    expect(result.priorities).toEqual([
      'Panca piana: tecnica e recuperi lunghi',
      'Petto',
    ]);
    expect(result.reasons[1]).toContain(
      'Il tuo 1RM stimato su Panca piana è stabile nelle ultime 2 sedute.',
    );
    expect(result.reasons[1]).toContain('evita di aggiungere volume');
    expect(result.focus).toContain('Panca piana come riferimento tecnico');
    expect(result.structure).toContain('poche serie di qualità');
    expect(result.intensity).toContain('3-5 minuti');
  });

  it('keeps beginner strength guidance controlled for a stable exercise', () => {
    const result = adaptSessionRecommendationToExerciseTrends(
      baseRecommendation,
      [trend()],
      {
        trainingGoal: 'FORZA',
        trainingLevel: 'PRINCIPIANTE',
        targetWorkoutDays: 3,
      },
    );

    expect(result.priorities[0]).toBe(
      'Panca piana: tecnica e carichi controllabili',
    );
    expect(result.focus).toContain('carichi controllabili');
    expect(result.intensity).toContain('2-3 minuti');
    expect(result.intensity).toContain('3-4 ripetizioni di margine');
    expect(result.intensity).not.toContain('3-5 minuti');
  });

  it('prioritizes a declining trend before a stable one', () => {
    const result = adaptSessionRecommendationToExerciseTrends(
      baseRecommendation,
      [
        trend(),
        trend({
          exerciseId: 20,
          exerciseName: 'Stacco da terra',
          muscleGroup: 'Gambe e glutei',
          status: 'DECLINING',
          currentEstimatedOneRm: 150,
          previousEstimatedOneRm: 160,
          deltaPercent: -6.25,
        }),
      ],
      advancedStrengthProfile,
    );

    expect(result.priorities[0]).toBe(
      'Stacco da terra: tecnica e recuperi lunghi',
    );
    expect(result.reasons[1]).toContain(
      '1RM stimato su Stacco da terra è in calo',
    );
    expect(result.intensity).toContain('2-3 ripetizioni di margine');
  });

  it('supports gradual progression for an improving exercise', () => {
    const result = adaptSessionRecommendationToExerciseTrends(
      {
        ...baseRecommendation,
        sessionType: 'Upper body ipertrofia',
        priorities: ['Petto', 'Schiena'],
      },
      [
        trend({
          status: 'IMPROVING',
          currentEstimatedOneRm: 125,
          previousEstimatedOneRm: 120,
          deltaPercent: 4.2,
        }),
      ],
      {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
    );

    expect(result.priorities[0]).toBe('Panca piana: progressione graduale');
    expect(result.reasons[1]).toContain('è in crescita');
    expect(result.structure).toContain('una sola variabile alla volta');
  });

  it('does not add an adjustment for a stable non-strength trend', () => {
    const hypertrophyRecommendation = {
      ...baseRecommendation,
      sessionType: 'Upper body ipertrofia',
    };

    const result = adaptSessionRecommendationToExerciseTrends(
      hypertrophyRecommendation,
      [trend()],
      {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
    );

    expect(result).toBe(hypertrophyRecommendation);
  });

  it('does not use a lower-body trend for an upper-body session', () => {
    const upperBodyRecommendation = {
      ...baseRecommendation,
      sessionType: 'Upper body ipertrofia',
    };

    const result = adaptSessionRecommendationToExerciseTrends(
      upperBodyRecommendation,
      [
        trend({
          exerciseName: 'Leg press',
          muscleGroup: 'Gambe e glutei',
          status: 'DECLINING',
        }),
      ],
      {
        trainingGoal: 'MASSA',
        trainingLevel: 'INTERMEDIO',
        targetWorkoutDays: 4,
      },
    );

    expect(result).toBe(upperBodyRecommendation);
  });

  it('does not change a recovery session', () => {
    const recoveryRecommendation = {
      ...baseRecommendation,
      sessionType: 'Recupero e mobilità',
    };
    const result = adaptSessionRecommendationToExerciseTrends(
      recoveryRecommendation,
      [trend({ status: 'DECLINING' })],
      advancedStrengthProfile,
    );

    expect(result).toBe(recoveryRecommendation);
  });
});
