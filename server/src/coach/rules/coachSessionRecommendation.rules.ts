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

function getFocusGroupLabel(groupName: string): string {
  return groupName === 'Schiena' ? 'Dorso' : groupName;
}

function getSessionFocus(
  sessionType: string,
  priorityGroups: CoachMuscleGroupDto[],
  hasMuscleData: boolean,
): string {
  if (!hasMuscleData || sessionType.startsWith('Full body')) {
    return 'Copri i tre movimenti principali: gambe, spinta e tirata, scegliendo almeno un esercizio per ogni grande distretto.';
  }

  if (priorityGroups.length === 0) {
    return 'Mantieni una distribuzione equilibrata tra i principali distretti muscolari.';
  }

  const [mainPriority, ...secondaryPriorities] = priorityGroups;

  if (
    mainPriority.status === 'none' &&
    secondaryPriorities.length > 0 &&
    secondaryPriorities.every((group) => group.status === 'low')
  ) {
    const secondaryNames = secondaryPriorities
      .map((group) => getFocusGroupLabel(group.name))
      .join(' e ');

    return `${getFocusGroupLabel(mainPriority.name)} come priorità principale, con richiamo su ${secondaryNames}.`;
  }

  const priorityNames = new Set(priorityGroups.map((group) => group.name));

  if (priorityNames.has('Petto') && priorityNames.has('Schiena')) {
    const additionalPriorities = priorityGroups
      .filter((group) => group.name !== 'Petto' && group.name !== 'Schiena')
      .map((group) => getFocusGroupLabel(group.name));

    const additionalFocus =
      additionalPriorities.length > 0
        ? `, con richiamo su ${additionalPriorities.join(' e ')}`
        : '';

    return `Alterna movimenti di spinta e tirata per Petto e Dorso${additionalFocus}.`;
  }

  if (priorityGroups.length === 1) {
    return `${getFocusGroupLabel(mainPriority.name)} come priorità principale della seduta.`;
  }

  const secondaryNames = secondaryPriorities
    .map((group) => getFocusGroupLabel(group.name))
    .join(' e ');

  return `${getFocusGroupLabel(mainPriority.name)} come priorità principale, con richiamo su ${secondaryNames}.`;
}

function getSessionStructure(profile: CoachProfile): string {
  if (profile.trainingLevel === 'PRINCIPIANTE') {
    return 'Scegli 3-4 esercizi principali. Usa carichi gestibili e movimenti dalla traiettoria stabile, concentrandoti sull’apprendimento tecnico.';
  }

  if (profile.trainingGoal === 'MASSA') {
    return 'Inizia con 1-2 esercizi multiarticolari per il focus principale, poi completa la seduta con 2-3 esercizi complementari mirati.';
  }

  if (
    profile.trainingGoal === 'FORZA' &&
    profile.trainingLevel === 'AVANZATO'
  ) {
    return 'Concentrati su 1 o 2 sollevamenti fondamentali. Mantieni il lavoro accessorio leggero e orientato alla qualità tecnica.';
  }

  if (profile.trainingGoal === 'FORZA') {
    return 'Inizia con un sollevamento principale, poi aggiungi 2-3 esercizi accessori con volume controllato.';
  }

  if (profile.trainingGoal === 'DIMAGRIMENTO') {
    return 'Scegli pochi esercizi globali e organizza transizioni efficienti, mantenendo un volume sostenibile per tutta la seduta.';
  }

  return 'Combina 2-3 movimenti principali con 1-2 esercizi complementari, mantenendo una distribuzione equilibrata.';
}

function getSessionIntensity(profile: CoachProfile): string {
  if (
    profile.trainingLevel === 'PRINCIPIANTE' &&
    profile.trainingGoal === 'FORZA'
  ) {
    return 'Usa carichi gestibili che permettano ripetizioni pulite e lascia 3-4 ripetizioni di margine. Recupera 2-3 minuti sugli esercizi principali ed evita il cedimento.';
  }

  if (profile.trainingGoal === 'MASSA') {
    return 'Mantieni uno sforzo medio-alto, con 1-3 ripetizioni di margine nei multiarticolari e recuperi tra 90 e 120 secondi.';
  }

  if (profile.trainingGoal === 'FORZA') {
    return 'Usa carichi impegnativi e volume contenuto. Recupera tra 3 e 5 minuti sulle alzate principali ed evita il cedimento.';
  }

  if (profile.trainingGoal === 'DIMAGRIMENTO') {
    return 'Mantieni un ritmo sostenuto con recuperi tra 45 e 90 secondi, senza sacrificare tecnica e controllo.';
  }

  return 'Mantieni un’intensità moderata, recupera tra 60 e 120 secondi e conserva un margine tecnico nelle serie.';
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
  const sessionType = hasMuscleData
    ? getSessionType(profile, priorityGroups)
    : getInitialSessionType(profile);
  const focus = getSessionFocus(sessionType, priorityGroups, hasMuscleData);
  const structure = getSessionStructure(profile);
  const intensity = getSessionIntensity(profile);

  const workoutLabel = totals.sessions === 1 ? 'allenamento' : 'allenamenti';

  const reasons = [
    `Hai completato ${totals.sessions} ${workoutLabel} su ${profile.targetWorkoutDays}.`,
  ];

  if (!hasCompletedSessions) {
    reasons.push(
      `In assenza di dati recenti, il tuo profilo indica come punto di partenza: ${sessionType}.`,
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

  return {
    title: 'Prossima seduta consigliata',
    sessionType,
    reasons,
    priorities: priorityNames,
    guidance: getGuidance(profile),
    focus,
    structure,
    intensity,
  };
}
