import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCoachListRowStyle } from "../styles/coachUi";

function getDeltaColor(value, colors) {
  if (value > 0) return colors.primary;
  if (value < 0) return "#ef4444";

  return colors.textMuted;
}

function getDeltaIcon(value) {
  if (value > 0) return "trending-up-outline";
  if (value < 0) return "trending-down-outline";

  return "remove-outline";
}

export default function CoachComparisonRow({
  label,
  value,
  rawValue,
  colors,
  isLast = false,
}) {
  const color = getDeltaColor(rawValue, colors);
  const hasDirectionalDelta = Number.isFinite(rawValue);
  const icon = hasDirectionalDelta ? getDeltaIcon(rawValue) : null;
  return (
    <View
      style={[
        getCoachListRowStyle(colors, isLast),
        { justifyContent: "space-between" },
      ]}
    >
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          marginRight: 10,
          color: colors.textDark,
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        {hasDirectionalDelta ? (
          <Ionicons name={icon} size={16} color={color} />
        ) : null}

        <Text
          numberOfLines={1}
          style={{
            color,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
