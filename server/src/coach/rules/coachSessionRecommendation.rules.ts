import {
  CoachMuscleGroupDto,
  CoachRecommendedSessionDto,
  CoachTotalsDto,
} from '../dto/weeklyCoachSummary.dto';

import { CoachProfile } from '../types/coachProfile.types';

type CoachRecommendationContext = {
  profile: CoachProfile;
  totals: CoachTotalsDto;
  muscleGroups: CoachMuscleGroupDto[];
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

function getLastTrainedScore(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function getPriorityGroups(
  muscleGroups: CoachMuscleGroupDto[],
): CoachMuscleGroupDto[] {
  return muscleGroups
    .filter((group) => group.status === 'none' || group.status === 'low')
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === 'none' ? -1 : 1;
      }
      const lastTrainedDifference =
        getLastTrainedScore(left.lastTrainedAt) -
        getLastTrainedScore(right.lastTrainedAt);

      if (lastTrainedDifference !== 0) {
        return lastTrainedDifference;
      }

      if (left.sets !== right.sets) {
        return left.sets - right.sets;
      }

      return left.name.localeCompare(right.name, 'it');
    })
    .slice(0, 3);
}

function getInitialSessionType(profile: CoachProfile): string {
  if (profile.trainingGoal === 'FORZA') {
    return profile.targetWorkoutDays <= 2
      ? 'Full body forza'
      : 'Seduta di forza';
  }

  if (profile.trainingGoal === 'MASSA') {
    return 'Full body ipertrofia';
  }

  if (profile.trainingGoal === 'DIMAGRIMENTO') {
    return 'Full body guidata';
  }

  return 'Seduta bilanciata';
}

function getSessionType(
  profile: CoachProfile,
  priorityGroups: CoachMuscleGroupDto[],
): string {
  if (profile.targetWorkoutDays <= 2) {
    if (profile.trainingGoal === 'FORZA') return 'Full body forza';
    if (profile.trainingGoal === 'MASSA') return 'Full body ipertrofia';
    return 'Full body guidata';
  }

  if (profile.trainingGoal === 'MASSA') {
    const upperBodyCount = priorityGroups.filter((group) =>
      UPPER_BODY_GROUPS.has(group.name),
    ).length;

    const lowerBodyCount = priorityGroups.filter((group) =>
      LOWER_BODY_GROUPS.has(group.name),
    ).length;

    if (upperBodyCount > lowerBodyCount) return 'Upper body ipertrofia';
    if (lowerBodyCount > upperBodyCount) return 'Lower body ipertrofia';

    return 'Full body ipertrofia';
  }

  if (profile.trainingGoal === 'FORZA') {
    return 'Seduta di forza';
  }

  if (profile.trainingGoal === 'DIMAGRIMENTO') {
    return 'Full body metabolica';
  }

  return 'Seduta bilanciata';
}

function getGuidance(profile: CoachProfile): string {
  if (profile.trainingLevel === 'PRINCIPIANTE') {
    return 'Procedi con movimenti semplici, carichi gestibili e tecnica controllata.';
  }

  if (profile.trainingLevel === 'AVANZATO') {
    return 'Gestisci volume, intensità e recuperi in base alla qualità delle serie.';
  }

  return 'Mantieni una progressione controllata e concentrati sulle serie di qualità.';
}

export function buildCoachSessionRecommendation({
  profile,
  totals,
  muscleGroups,
}: CoachRecommendationContext): CoachRecommendedSessionDto {
  const hasCompletedSessions = totals.sessions > 0;
  const hasMuscleData = hasCompletedSessions && totals.completedSets > 0;
  const priorityGroups = hasMuscleData ? getPriorityGroups(muscleGroups) : [];
  const priorityNames = priorityGroups.map((group) => group.name);

  const workoutLabel = totals.sessions === 1 ? 'allenamento' : 'allenamenti';

  const reasons = [
    `Hai completato ${totals.sessions} ${workoutLabel} su ${profile.targetWorkoutDays}.`,
  ];

  if (!hasCompletedSessions) {
    reasons.push(
      'Non ci sono ancora dati sufficienti: iniziamo con una seduta adatta al tuo profilo.',
    );
  } else if (!hasMuscleData) {
    reasons.push(
      'La seduta registrata non contiene ancora serie completate sufficienti per valutare la distribuzione muscolare.',
    );
  } else if (priorityNames.length > 0) {
    reasons.push(
      `I gruppi con meno lavoro questa settimana sono: ${priorityNames.join(', ')}.`,
    );
  } else {
    reasons.push(
      'Nessun gruppo muscolare risulta sotto priorità questa settimana.',
    );
  }

  const sessionType = hasMuscleData
    ? getSessionType(profile, priorityGroups)
    : getInitialSessionType(profile);

  return {
    title: 'Prossima seduta consigliata',
    sessionType,
    reasons,
    priorities: priorityNames,
    guidance: getGuidance(profile),
  };
}
