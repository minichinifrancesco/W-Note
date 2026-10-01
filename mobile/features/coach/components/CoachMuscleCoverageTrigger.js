import React, { useState } from "react";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CoachMuscleCoverageModal from "./CoachMuscleCoverageModal";

export default function CoachMuscleCoverageTrigger({
  summary,
  colors,
  formatOptions,
  label = "Vedi copertura muscolare",
}) {
  const [coverageVisible, setCoverageVisible] = useState(false);
  const hasSessions = Number(summary?.totals?.sessions || 0) > 0;

  const groups = Array.isArray(summary?.muscleGroups)
    ? summary.muscleGroups.filter(Boolean)
    : [];

  if (!hasSessions || groups.length === 0) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setCoverageVisible(true)}
        style={{
          marginTop: 12,
          borderWidth: 1,
          borderColor: colors.accentGreenBorder,
          backgroundColor: colors.accentGreenBg,
          borderRadius: 8,
          paddingVertical: 10,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Ionicons name="analytics-outline" size={18} color={colors.primary} />

        <Text
          style={{
            color: colors.primary,
            fontSize: 13,
            fontWeight: "800",
          }}
        >
          {label}
        </Text>
      </Pressable>

      <CoachMuscleCoverageModal
        visible={coverageVisible}
        onClose={() => setCoverageVisible(false)}
        summary={summary}
        colors={colors}
        formatOptions={formatOptions}
      />
    </>
  );
}
