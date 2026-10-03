export function getMuscleGroupStatusLabel(status) {
  switch (status) {
    case "none":
      return "Nessuna serie diretta";

    case "low":
      return "Poco allenato";

    case "ok":
      return "OK";

    case "high":
      return "Molto allenato";

    default:
      return "Non disponibile";
  }
}

export function getMuscleGroupStatusTheme(status, colors) {
  switch (status) {
    case "none":
      return {
        color: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.14)",
        borderColor: "#ef4444",
      };

    case "low":
      return {
        color: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.14)",
        borderColor: "#f59e0b",
      };

    case "ok":
      return {
        color: colors.primary,
        backgroundColor: colors.accentGreenBg,
        borderColor: colors.accentGreenBorder,
      };

    case "high":
      return {
        color: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.14)",
        borderColor: "#3b82f6",
      };

    default:
      return {
        color: colors.textMuted,
        backgroundColor: colors.inputBg,
        borderColor: colors.border,
      };
  }
}
