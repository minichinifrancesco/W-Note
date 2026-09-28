import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCoachIconBubbleStyle,
  getCoachMutedTextStyle,
} from '../styles/coachUi';
import CoachMuscleCoverageModal from './CoachMuscleCoverageModal';

function formatSessionCount(value) {
  const count = Number(value || 0);

  return `${count} ${count === 1 ? 'allenamento' : 'allenamenti'}`;
}

function getAdherenceContent(adherence) {
  const completed = Number(adherence?.completedSessions || 0);
  const target = Number(adherence?.targetSessions || 0);
  const remaining = Number(adherence?.remainingSessions || 0);

  if (adherence?.status === 'ABOVE_TARGET') {
    return {
      title: 'Target superato',
      completionLabel: `Hai completato ${formatSessionCount(
        completed,
      )} rispetto al target di ${formatSessionCount(target)}.`,
      detail: 'Nel periodo hai superato il numero di sedute previsto.',
    };
  }

  if (adherence?.status === 'TARGET_REACHED') {
    return {
      title: 'Target raggiunto',
      completionLabel: `Hai completato ${formatSessionCount(
        completed,
      )} su ${formatSessionCount(target)} previsti.`,
      detail: 'Nel periodo hai raggiunto il numero di sedute programmato.',
    };
  }

  if (adherence?.status === 'NOT_STARTED') {
    return {
      title: 'Nessuna seduta registrata',
      completionLabel: `Target del periodo: ${formatSessionCount(target)}.`,
      detail: 'Nel periodo selezionato non risultano allenamenti completati.',
    };
  }

  return {
    title: 'Target non completato',
    completionLabel: `Hai completato ${formatSessionCount(
      completed,
    )} su ${formatSessionCount(target)} previsti.`,
    detail:
      remaining > 0
        ? `Nel periodo non sono state completate ${formatSessionCount(
            remaining,
          )} rispetto al target.`
        : 'Il periodo si è concluso senza ulteriori sedute registrate.',
  };
}

function getMuscleCoverageSummary(groups) {
  const items = Array.isArray(groups) ? groups.filter(Boolean) : [];
  const trainedGroupCount = items.filter(
    (group) => Number(group.sets || 0) > 0,
  ).length;
  const untrainedGroupCount = items.filter(
    (group) => group.status === 'none',
  ).length;
  const highGroupCount = items.filter(
    (group) => group.status === 'high',
  ).length;

  const parts = [`${trainedGroupCount} distretti allenati nel periodo`];

  if (untrainedGroupCount > 0) {
    parts.push(
      `${untrainedGroupCount} ${
        untrainedGroupCount === 1
          ? 'distretto non allenato'
          : 'distretti non allenati'
      }`,
    );
  }

  if (highGroupCount > 0) {
    parts.push(
      `${highGroupCount} ${
        highGroupCount === 1
          ? 'distretto con volume elevato'
          : 'distretti con volume elevato'
      }`,
    );
  }

  return `${parts.join('. ')}.`;
}

export default function CoachHistoricalAnalysisSection({
  summary,
  colors,
  styles,
  formatOptions,
}) {
  const [coverageVisible, setCoverageVisible] = useState(false);
  const adherence = summary?.adherence;
  const coverageSummary = useMemo(
    () => getMuscleCoverageSummary(summary?.muscleGroups),
    [summary?.muscleGroups],
  );

  if (summary?.periodStatus !== 'HISTORICAL' || !adherence) {
    return null;
  }

  const content = getAdherenceContent(adherence);

  return (
    <View style={styles.workoutCard}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View style={getCoachIconBubbleStyle(colors)}>
          <Ionicons
            name="document-text-outline"
            size={19}
            color={colors.primary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Analisi della settimana</Text>

          <Text
            style={{
              color: colors.textDark,
              fontSize: 16,
              fontWeight: '800',
              marginTop: 3,
            }}
          >
            {content.title}
          </Text>
        </View>
      </View>

      <Text style={[getCoachMutedTextStyle(colors), { marginTop: 14 }]}>
        {content.completionLabel}
      </Text>

      <Text style={[getCoachMutedTextStyle(colors), { marginTop: 6 }]}>
        {content.detail}
      </Text>

      <View
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.textDark,
            fontSize: 14,
            fontWeight: '700',
          }}
        >
          Copertura muscolare
        </Text>

        <Text style={[getCoachMutedTextStyle(colors), { marginTop: 4 }]}>
          {coverageSummary}
        </Text>

        <Pressable
          onPress={() => setCoverageVisible(true)}
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: colors.accentGreenBorder,
            backgroundColor: colors.accentGreenBg,
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="analytics-outline" size={18} color={colors.primary} />

          <Text
            style={{
              color: colors.primary,
              fontSize: 13,
              fontWeight: '800',
            }}
          >
            Vedi copertura muscolare
          </Text>
        </Pressable>
      </View>

      <CoachMuscleCoverageModal
        visible={coverageVisible}
        onClose={() => setCoverageVisible(false)}
        summary={summary}
        colors={colors}
        formatOptions={formatOptions}
      />
    </View>
  );
}
