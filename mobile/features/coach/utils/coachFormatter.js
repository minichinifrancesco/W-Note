export function formatDuration(seconds = 0) {
  const safeSeconds = Number(seconds || 0);
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m`;
}

export function formatNumber(value = 0) {
  return Math.round(Number(value || 0)).toLocaleString("it-IT");
}

export function formatSignedNumber(value = 0) {
  const number = Math.round(Number(value || 0));

  if (number > 0) return `+${number.toLocaleString("it-IT")}`;
  return number.toLocaleString("it-IT");
}

export function formatSignedPercent(value = 0) {
  const number = Number(value || 0);
  const rounded = Math.round(number * 10) / 10;
  const formatted = rounded.toLocaleString("it-IT");

  if (rounded > 0) return `+${formatted}%`;
  return `${formatted}%`;
}

export function formatVolumeComparisonPercent(percent, volumeDelta = 0) {
  if (typeof percent === "number" && Number.isFinite(percent)) {
    return formatSignedPercent(percent);
  }

  return Number(volumeDelta) > 0
    ? "Nuovo volume"
    : "Nessun confronto disponibile";
}

export function formatSignedDuration(seconds = 0) {
  const value = Number(seconds || 0);
  const absSeconds = Math.abs(value);
  const totalMinutes = Math.floor(absSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";

  if (hours > 0) return `${prefix}${hours}h ${minutes}m`;
  return `${prefix}${minutes}m`;
}

export function formatLastTrainedAt(value) {
  if (!value) return "Mai allenato";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data non disponibile";

  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Oggi";
  if (days === 1) return "Ieri";

  return `${days} giorni fa`;
}

export function formatSetCount(value = 0) {
  const count = Number(value || 0);

  if (count === 1) return "1 serie";

  return `${count} serie`;
}

export function formatExerciseCount(value = 0) {
  const count = Number(value || 0);

  if (count === 1) return "1 esercizio";

  return `${count} esercizi`;
}

function convertDisplayWeight(value = 0, options = {}, decimalPlaces) {
  if (typeof options.convertWeight === "function") {
    return options.convertWeight(value, decimalPlaces);
  }

  return Number(value || 0);
}

function getDisplayWeightUnit(options = {}) {
  return options.weightUnit || "kg";
}

export function formatVolume(value = 0, options = {}) {
  const converted = convertDisplayWeight(value, options);
  const unit = getDisplayWeightUnit(options);

  return `${formatNumber(converted)} ${unit} x rep`;
}

export function formatSignedVolume(value = 0, options = {}) {
  const converted = convertDisplayWeight(value, options);
  const rounded = Math.round(Number(converted || 0));
  const formatted = rounded.toLocaleString("it-IT");
  const unit = getDisplayWeightUnit(options);

  if (rounded > 0) return `+${formatted} ${unit} x rep`;

  return `${formatted} ${unit} x rep`;
}

export function formatWeight(value = 0, options = {}) {
  if (typeof options.formatWeight === "function") {
    return options.formatWeight(value);
  }

  return `${formatNumber(value)} kg`;
}

export function formatEstimatedOneRepMax(value = 0, options = {}) {
  const converted = convertDisplayWeight(value, options, 2);
  const numericValue = Number(converted);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const unit = getDisplayWeightUnit(options);

  const formatted = safeValue.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatted} ${unit}`;
}

export function formatReps(value = 0) {
  const count = Number(value || 0);

  if (count === 1) return "1 rep";

  return `${formatNumber(count)} reps`;
}

export function formatBadgeValue(value, code, options = {}) {
  if (value === null || value === undefined) return null;

  const safeCode = String(code || "").toUpperCase();

  if (safeCode.includes("VOLUME")) return formatVolume(value, options);
  if (safeCode.includes("PESO") || safeCode.includes("WEIGHT"))
    return formatWeight(value, options);
  if (safeCode.includes("REP")) return formatReps(value);

  return formatNumber(value);
}

export function formatBadgeDate(value) {
  if (!value) return "Data non disponibile";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data non disponibile";

  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
