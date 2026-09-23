import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatSignedPercent, formatWeight } from '../utils/coachFormatter';
import {
  getCoachIconBubbleStyle,
  getCoachListRowStyle,
  getCoachMutedTextStyle,
} from '../styles/coachUi';

const MAX_VISIBLE_TRENDS = 3;

function getTrendTheme(status, colors) {
  if (status === 'IMPROVING') {
    return {
      label: 'In crescita',
      icon: 'trending-up-outline',
      color: colors.primary,
      backgroundColor: colors.accentGreenBg,
      borderColor: colors.accentGreenBorder,
    };
  }

  if (status === 'DECLINING') {
    return {
      label: 'In calo',
      icon: 'trending-down-outline',
      color: colors.deleteBtnText,
      backgroundColor: colors.deleteBtnBg,
      borderColor: colors.deleteBtnText,
    };
  }

  return {
    label: 'Stabile',
    icon: 'remove-outline',
    color: colors.textMuted,
    backgroundColor: colors.chipBackground,
    borderColor: colors.border,
  };
}

export default function CoachExerciseTrendsSection({
  summary,
  colors,
  styles,
  formatOptions,
}) {
  const trends = useMemo(() => {
    const items = Array.isArray(summary?.exerciseTrends)
      ? summary.exerciseTrends.filter(Boolean)
      : [];

    return items.slice(0, MAX_VISIBLE_TRENDS);
  }, [summary]);

  if (trends.length === 0) {
    return null;
  }

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
          <Ionicons name="analytics-outline" size={19} color={colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Lettura del progresso</Text>

          <Text style={[getCoachMutedTextStyle(colors), { marginTop: 3 }]}>
            Confronto tra le ultime sedute dello stesso esercizio.
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        {trends.map((trend, index) => {
          const theme = getTrendTheme(trend.status, colors);
          const currentOneRm = formatWeight(
            trend.currentEstimatedOneRm,
            formatOptions,
          );
          const previousOneRm = formatWeight(
            trend.previousEstimatedOneRm,
            formatOptions,
          );

          return (
            <View
              key={`${trend.exerciseId ?? trend.exerciseName}-${index}`}
              style={[
                getCoachListRowStyle(colors, index === trends.length - 1),
                { alignItems: 'flex-start' },
              ]}
            >
              <View
                style={getCoachIconBubbleStyle(
                  colors,
                  theme.backgroundColor,
                  theme.borderColor,
                )}
              >
                <Ionicons name={theme.icon} size={18} color={theme.color} />
              </View>

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      color: colors.textDark,
                      fontSize: 14,
                      fontWeight: '700',
                    }}
                  >
                    {trend.exerciseName}
                  </Text>

                  <Text
                    style={{
                      color: theme.color,
                      fontSize: 12,
                      fontWeight: '800',
                    }}
                  >
                    {theme.label}
                  </Text>
                </View>

                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {trend.muscleGroup}
                </Text>

                <Text
                  style={{
                    color: colors.textDark,
                    fontSize: 13,
                    fontWeight: '600',
                    marginTop: 8,
                  }}
                >
                  1RM stimato: {currentOneRm}
                </Text>

                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  Seduta precedente: {previousOneRm} ·{' '}
                  <Text style={{ color: theme.color, fontWeight: '700' }}>
                    {formatSignedPercent(trend.deltaPercent)}
                  </Text>
                </Text>

                <Text
                  style={[getCoachMutedTextStyle(colors), { marginTop: 8 }]}
                >
                  {trend.message}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
