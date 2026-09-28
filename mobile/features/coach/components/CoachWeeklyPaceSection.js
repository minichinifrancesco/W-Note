import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getCoachIconBubbleStyle,
  getCoachMutedTextStyle,
} from "../styles/coachUi";

function formatSessionCount(value) {
  const count = Number(value || 0);

  return `${count} ${count === 1 ? "allenamento" : "allenamenti"}`;
}

function formatDayCount(value) {
  const count = Number(value || 0);

  return `${count} ${count === 1 ? "giorno" : "giorni"}`;
}

function getPaceContent(progress, colors) {
  const completed = Number(progress.completedSessions || 0);
  const target = Number(progress.targetSessions || 0);
  const expected = Number(progress.expectedSessions || 0);
  const daysRemaining = Number(progress.daysRemaining || 0);

  const completionLabel = `Hai completato ${formatSessionCount(
    completed,
  )} su ${target}.`;

  if (progress.status === "TARGET_REACHED") {
    return {
      title: "Target settimanale raggiunto",
      icon: "checkmark-circle-outline",
      color: colors.primary,
      completionLabel,
      detail:
        "Hai raggiunto il numero di sedute previsto. Mantieni attenzione a recupero e qualità del lavoro.",
      expected,
      daysRemaining,
    };
  }

  if (progress.status === "ABOVE_TARGET") {
    return {
      title: "Target settimanale superato",
      icon: "trophy-outline",
      color: colors.primary,
      completionLabel,
      detail:
        "Hai superato il numero di sedute previsto. Valuta se lasciare spazio a recupero o mobilità.",
      expected,
      daysRemaining,
    };
  }

  if (progress.paceStatus === "BEHIND_TARGET") {
    return {
      title: "Ritmo da recuperare",
      icon: "alert-circle-outline",
      color: colors.deleteBtnText,
      completionLabel,
      detail:
        daysRemaining === 0
          ? "La settimana è conclusa: usa questo dato per distribuire meglio il lavoro nella prossima."
          : `A questo punto erano attesi ${formatSessionCount(
              expected,
            )}. Restano ${formatDayCount(
              daysRemaining,
            )}: evita di recuperare tutto con volume eccessivo.`,
      expected,
      daysRemaining,
    };
  }

  return {
    title:
      progress.status === "NOT_STARTED"
        ? "Settimana da iniziare"
        : "In linea con il ritmo",
    icon:
      progress.status === "NOT_STARTED"
        ? "play-circle-outline"
        : "checkmark-circle-outline",
    color: colors.primary,
    completionLabel,
    detail:
      expected === 0
        ? null
        : `A questo punto erano attesi ${formatSessionCount(
            expected,
          )}. Restano ${formatDayCount(daysRemaining)}.`,
    detailLines:
      expected === 0
        ? [
            "La settimana è appena iniziata.",
            `Restano ${formatDayCount(
              daysRemaining,
            )} per distribuire le sedute.`,
          ]
        : null,
    expected,
    daysRemaining,
  };
}

export default function CoachWeeklyPaceSection({ summary, colors, styles }) {
  const progress = summary?.recommendedSession?.weeklyProgress;

  if (!progress) {
    return null;
  }

  const content = getPaceContent(progress, colors);

  const remainingSessions = Math.max(
    Number(progress.targetSessions || 0) -
      Number(progress.completedSessions || 0),
    0,
  );

  const detailLines = Array.isArray(content.detailLines)
    ? content.detailLines
    : [content.detail].filter(Boolean);

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
          <Ionicons name="calendar-outline" size={19} color={colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Ritmo settimanale</Text>

          <Text
            style={{
              color: content.color,
              fontSize: 16,
              fontWeight: "800",
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

      <View style={{ marginTop: 6 }}>
        {detailLines.map((line, index) => (
          <Text
            key={`${line}-${index}`}
            style={[
              getCoachMutedTextStyle(colors),
              { marginTop: index === 0 ? 0 : 2 },
            ]}
          >
            {line}
          </Text>
        ))}
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 16,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View>
          <Text style={getCoachMutedTextStyle(colors)}>
            Allenamenti rimanenti
          </Text>
          <Text
            style={{
              color: colors.textDark,
              fontSize: 15,
              fontWeight: "700",
              marginTop: 3,
            }}
          >
            {formatSessionCount(remainingSessions)}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={getCoachMutedTextStyle(colors)}>Giorni rimanenti</Text>
          <Text
            style={{
              color: colors.textDark,
              fontSize: 15,
              fontWeight: "700",
              marginTop: 3,
            }}
          >
            {formatDayCount(content.daysRemaining)}
          </Text>
        </View>
      </View>
    </View>
  );
}
