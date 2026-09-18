import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CoachEmptyState({
  colors,
  styles,
  onGoHome,
  showGoHomeButton,
  isCurrentWeek,
}) {
  return (
    <View style={styles.workoutCard}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.inputBg,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 12,
        }}
      >
        <Ionicons
          name="calendar-clear-outline"
          size={22}
          color={colors.textMuted}
        />
      </View>

      <Text style={styles.sectionTitle}>
        Nessun allenamento questa settimana
      </Text>

      <Text
        style={{
          color: colors.textMuted,
          fontSize: 14,
          lineHeight: 20,
          marginTop: 8,
          marginBottom: 14,
        }}
      >
        {isCurrentWeek
          ? "Completa una sessione per sbloccare statistiche dettagliate e confronti settimanali."
          : "In questa settimana non risultano allenamenti registrati."}
      </Text>

      {showGoHomeButton ? (
        <TouchableOpacity
          onPress={onGoHome}
          style={styles.primaryButton}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Vai alle schede</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
