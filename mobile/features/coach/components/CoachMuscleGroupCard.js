import React from "react";
import { Text, View } from "react-native";
import { formatLastTrainedAt, formatVolume } from "../utils/coachFormatter";
import {
  getMuscleGroupStatusLabel,
  getMuscleGroupStatusTheme,
} from "../utils/coachMuscleGroup";
import {
  getCoachInnerCardStyle,
  getCoachMutedTextStyle,
} from "../styles/coachUi";

function formatDirectMetricCount(value, singular, plural) {
  const count = Number(value || 0);
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function CoachMuscleGroupCard({ group, colors, formatOptions }) {
  const theme = getMuscleGroupStatusTheme(group.status, colors);
  const statusLabel = getMuscleGroupStatusLabel(group.status);
  const isNotTrained = group.status === "none";

  return (
    <View style={getCoachInnerCardStyle(colors)}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.textDark,
              fontSize: 15,
              fontWeight: "700",
            }}
          >
            {group.name}
          </Text>

          <Text style={[getCoachMutedTextStyle(colors), { marginTop: 4 }]}>
            {formatDirectMetricCount(
              group.sets,
              "serie diretta",
              "serie dirette",
            )}{" "}
            ·{" "}
            {formatDirectMetricCount(
              group.exerciseCount,
              "esercizio diretto",
              "esercizi diretti",
            )}{" "}
            · volume diretto {formatVolume(group.volume, formatOptions)}
          </Text>

          {isNotTrained ? (
            <Text
              style={[
                getCoachMutedTextStyle(colors),
                {
                  fontSize: 12,
                  marginTop: 6,
                },
              ]}
            >
              Ultima serie diretta: {formatLastTrainedAt(group.lastTrainedAt)}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            flexShrink: 0,
            borderWidth: 1,
            borderColor: theme.borderColor,
            backgroundColor: theme.backgroundColor,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{
              color: theme.color,
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            {statusLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}
