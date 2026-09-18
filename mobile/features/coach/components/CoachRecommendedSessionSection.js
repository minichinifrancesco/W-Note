import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getCoachIconBubbleStyle,
  getCoachMutedTextStyle,
} from "../styles/coachUi";

export default function CoachRecommendedSessionSection({
  summary,
  colors,
  styles,
}) {
  const recommendation = summary?.recommendedSession;

  if (!recommendation?.sessionType) {
    return null;
  }

  const reasons = Array.isArray(recommendation.reasons)
    ? recommendation.reasons.filter(Boolean)
    : [];

  const priorities = Array.isArray(recommendation.priorities)
    ? recommendation.priorities.filter(Boolean)
    : [];

  return (
    <View style={styles.workoutCard}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={getCoachIconBubbleStyle(colors)}>
          <Ionicons name="compass-outline" size={19} color={colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>
            {recommendation.title || "Prossima seduta consigliata"}
          </Text>

          <Text
            style={{
              color: colors.primary,
              fontSize: 16,
              fontWeight: "800",
              marginTop: 3,
            }}
          >
            {recommendation.sessionType}
          </Text>
        </View>
      </View>

      {reasons.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              color: colors.textDark,
              fontSize: 14,
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            Perché
          </Text>

          {reasons.map((reason, index) => (
            <View
              key={`${reason}-${index}`}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                marginTop: index === 0 ? 0 : 6,
              }}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color={colors.primary}
                style={{ marginTop: 1 }}
              />

              <Text style={[getCoachMutedTextStyle(colors), { flex: 1 }]}>
                {reason}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {priorities.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              color: colors.textDark,
              fontSize: 14,
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            Priorità
          </Text>

          {priorities.map((priority, index) => (
            <View
              key={`${priority}-${index}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 4,
              }}
            >
              <Ionicons
                name="fitness-outline"
                size={17}
                color={colors.primary}
              />

              <Text
                style={{
                  flex: 1,
                  color: colors.textDark,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {priority}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {recommendation.guidance ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            marginTop: 16,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Ionicons
            name="bulb-outline"
            size={19}
            color={colors.primary}
            style={{ marginTop: 1 }}
          />

          <Text
            style={[
              getCoachMutedTextStyle(colors),
              {
                flex: 1,
                color: colors.textDark,
              },
            ]}
          >
            {recommendation.guidance}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
