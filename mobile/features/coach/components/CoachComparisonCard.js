import React, { useMemo } from "react";
import { Text, View } from "react-native";
import {
  formatSignedDuration,
  formatSignedNumber,
  formatSignedVolume,
  formatVolumeComparisonPercent,
} from "../utils/coachFormatter";
import CoachComparisonRow from "./CoachComparisonRow";
import { getCoachMutedTextStyle } from "../styles/coachUi";

export default function CoachComparisonCard({
  summary,
  colors,
  styles,
  formatOptions,
}) {
  const rows = useMemo(() => {
    if (!summary?.comparison) return [];

    const comparison = summary.comparison;
    const hasComparableVolumePercent = Number.isFinite(
      comparison.volumeDeltaPercent,
    );

    return [
      {
        label: "Sessioni",
        value: formatSignedNumber(comparison.sessionsDelta),
        rawValue: comparison.sessionsDelta,
      },
      {
        label: "Durata",
        value: formatSignedDuration(comparison.durationSecondsDelta),
        rawValue: comparison.durationSecondsDelta,
      },
      {
        label: "Serie completate",
        value: formatSignedNumber(comparison.completedSetsDelta),
        rawValue: comparison.completedSetsDelta,
      },
      {
        label: "Volume",
        value: formatSignedVolume(comparison.volumeDelta, formatOptions),
        rawValue: comparison.volumeDelta,
      },
      {
        label: "Variazione volume",
        value: formatVolumeComparisonPercent(
          comparison.volumeDeltaPercent,
          comparison.volumeDelta,
        ),
        rawValue: hasComparableVolumePercent
          ? comparison.volumeDeltaPercent
          : null,
      },
    ];
  }, [summary, formatOptions]);

  if (!summary?.comparison) return null;

  return (
    <View style={styles.workoutCard}>
      <Text style={styles.sectionTitle}>Confronto settimana precedente</Text>

      <Text
        style={[
          getCoachMutedTextStyle(colors),
          {
            marginTop: 6,
            marginBottom: 8,
          },
        ]}
      >
        Differenza rispetto al periodo precedente
      </Text>

      {rows.map((row, index) => (
        <CoachComparisonRow
          key={row.label}
          label={row.label}
          value={row.value}
          rawValue={row.rawValue}
          colors={colors}
          isLast={index === rows.length - 1}
        />
      ))}
    </View>
  );
}
