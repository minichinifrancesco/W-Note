import { CoachRecommendedSessionDto } from '../dto/weeklyCoachSummary.dto';
import { CoachProfile } from '../types/coachProfile.types';
import {
  CoachExerciseTrend,
  CoachExerciseTrendStatus,
} from './coachExerciseTrend.rules';

type SessionScope = 'UPPER' | 'LOWER' | 'ALL' | 'NONE';

type TrendAdjustment = {
  priority: string;
  reason: string;
  focus: string;
  structure: string;
  intensity: string;
};

const UPPER_BODY_GROUPS = new Set([
  'Petto',
  'Schiena',
  'Spalle',
  'Bicipiti',
  'Tricipiti',
]);

const LOWER_BODY_GROUPS = new Set([
  'Gambe e glutei',
  'Polpacci',
  'Glutei specifici',
]);

function getSessionScope(sessionType: string): SessionScope {
  if (sessionType === 'Recupero e mobilità') {
    return 'NONE';
  }

  if (sessionType.startsWith('Upper body')) {
    return 'UPPER';
  }

  if (sessionType.startsWith('Lower body')) {
    return 'LOWER';
  }

  return 'ALL';
}

function isTrendInScope(
  trend: CoachExerciseTrend,
  scope: SessionScope,
): boolean {
  if (scope === 'NONE') {
    return false;
  }

  if (scope === 'ALL') {
    return true;
  }

  if (scope === 'UPPER') {
    return UPPER_BODY_GROUPS.has(trend.muscleGroup);
  }

  return LOWER_BODY_GROUPS.has(trend.muscleGroup);
}

function selectRelevantTrend(
  trends: CoachExerciseTrend[],
  profile: CoachProfile,
  sessionType: string,
): CoachExerciseTrend | null {
  const scope = getSessionScope(sessionType);
  const scopedTrends = trends.filter((trend) => isTrendInScope(trend, scope));
  const decliningTrend = scopedTrends.find(
    (trend) => trend.status === 'DECLINING',
  );

  if (decliningTrend) {
    return decliningTrend;
  }

  if (profile.trainingGoal === 'FORZA') {
    const stableTrend = scopedTrends.find((trend) => trend.status === 'STABLE');

    if (stableTrend) {
      return stableTrend;
    }
  }

  return scopedTrends.find((trend) => trend.status === 'IMPROVING') ?? null;
}

function formatComparedSessions(value: number): string {
  return `${value} ${value === 1 ? 'seduta' : 'sedute'}`;
}

function getTrendAdjustment(
  trend: CoachExerciseTrend,
  status: CoachExerciseTrendStatus,
  profile: CoachProfile,
): TrendAdjustment {
  if (status === 'DECLINING') {
    return {
      priority: `${trend.exerciseName}: tecnica e recuperi lunghi`,
      reason: `Il tuo 1RM stimato su ${trend.exerciseName} è in calo rispetto alla seduta precedente. Riduci le pretese sul carico e privilegia tecnica e recupero.`,
      focus: `Per ${trend.exerciseName}, usa carichi controllabili e privilegia esecuzioni pulite.`,
      structure: `Riduci il lavoro accessorio attorno a ${trend.exerciseName} se la tecnica peggiora.`,
      intensity: `Su ${trend.exerciseName}, lascia 2-3 ripetizioni di margine ed evita il cedimento.`,
    };
  }

  if (status === 'STABLE') {
    const isBeginner = profile.trainingLevel === 'PRINCIPIANTE';

    return {
      priority: isBeginner
        ? `${trend.exerciseName}: tecnica e carichi controllabili`
        : `${trend.exerciseName}: tecnica e recuperi lunghi`,
      reason: `Il tuo 1RM stimato su ${trend.exerciseName} è stabile nelle ultime ${formatComparedSessions(trend.comparedSessions)}. Per il tuo obiettivo Forza, evita di aggiungere volume: consolida la qualità.`,
      focus: isBeginner
        ? `Usa ${trend.exerciseName} per consolidare la tecnica con carichi controllabili.`
        : `Inserisci ${trend.exerciseName} come riferimento tecnico, con recuperi completi tra le serie.`,
      structure: isBeginner
        ? `Mantieni ${trend.exerciseName} semplice e controllato, senza aggiungere lavoro accessorio non necessario.`
        : `Mantieni ${trend.exerciseName} come alzata principale, con poche serie di qualità.`,
      intensity: isBeginner
        ? `Su ${trend.exerciseName}, recupera 2-3 minuti, lascia 3-4 ripetizioni di margine ed evita il cedimento.`
        : `Su ${trend.exerciseName}, recupera 3-5 minuti e non cercare il cedimento.`,
    };
  }

  return {
    priority: `${trend.exerciseName}: progressione graduale`,
    reason: `Il tuo 1RM stimato su ${trend.exerciseName} è in crescita. Mantieni una progressione graduale senza aumentare contemporaneamente carico e volume.`,
    focus: `Per ${trend.exerciseName}, mantieni la progressione senza sacrificare la tecnica.`,
    structure: `Mantieni invariata la struttura e aumenta una sola variabile alla volta su ${trend.exerciseName}.`,
    intensity: `Su ${trend.exerciseName}, conserva il margine tecnico e non aumentare anche il volume.`,
  };
}

export function adaptSessionRecommendationToExerciseTrends(
  recommendation: CoachRecommendedSessionDto,
  trends: CoachExerciseTrend[],
  profile: CoachProfile,
): CoachRecommendedSessionDto {
  const selectedTrend = selectRelevantTrend(
    trends,
    profile,
    recommendation.sessionType,
  );

  if (!selectedTrend) {
    return recommendation;
  }

  const adjustment = getTrendAdjustment(
    selectedTrend,
    selectedTrend.status,
    profile,
  );

  return {
    ...recommendation,
    priorities: [
      adjustment.priority,
      ...recommendation.priorities.filter(
        (priority) => priority !== adjustment.priority,
      ),
    ],
    reasons: [...recommendation.reasons, adjustment.reason],
    focus: `${recommendation.focus} ${adjustment.focus}`,
    structure: `${recommendation.structure} ${adjustment.structure}`,
    intensity: `${recommendation.intensity} ${adjustment.intensity}`,
  };
}
