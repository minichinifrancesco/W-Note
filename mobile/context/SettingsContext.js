import React, { createContext, useContext, useRef, useState } from "react";
import { useColorScheme } from "react-native";
import { getUserSettings, saveUserSettings } from "../services/api";

const DEFAULT_SETTINGS = {
  weightUnit: "kg", // 'kg' | 'lbs'
  themeMode: "auto", // 'light' | 'dark' | 'auto'
  defaultRestTime: 60, // seconds
  showExerciseNotes: true,
  restTimerHaptic: false,
  restTimerSound: false,
};

export const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  loadSettings: async () => {},
  clearSettings: () => {},
  convertWeight: (v) => v,
  toKg: (v) => v,
  formatWeight: (v) => `${v} kg`,
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const authTokenRef = useRef(null);

  const loadSettings = async (token) => {
    authTokenRef.current = token || null;
    if (!token) {
      setSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }

    const serverSettings = await getUserSettings(token);
    const nextSettings = { ...DEFAULT_SETTINGS, ...serverSettings };
    setSettings(nextSettings);
    return nextSettings;
  };

  const clearSettings = () => {
    authTokenRef.current = null;
    setSettings(DEFAULT_SETTINGS);
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (authTokenRef.current) {
        saveUserSettings(authTokenRef.current, next)
          .then((serverSettings) => {
            setSettings((current) => ({
              ...current,
              ...serverSettings,
            }));
          })
          .catch((error) => {
            console.error(
              "Errore salvataggio impostazioni:",
              error.message || error,
            );
          });
      }
      return next;
    });
  };

  // Convert a weight value FROM kg TO display unit
  const parseWeightValue = (value) =>
    parseFloat(String(value || 0).replace(",", ".")) || 0;

  const convertWeight = (kgValue, decimalPlaces = 1) => {
    const value = parseWeightValue(kgValue);

    if (settings.weightUnit === "lbs") {
      const factor = 10 ** decimalPlaces;

      return Math.round(value * 2.20462 * factor) / factor;
    }

    return value;
  };

  // Convert a weight value FROM display unit TO kg (for storage)
  const toKg = (displayValue) => {
    if (settings.weightUnit === "lbs") {
      return Math.round((parseWeightValue(displayValue) / 2.20462) * 10) / 10;
    }
    return parseWeightValue(displayValue);
  };

  const formatWeight = (kgValue) => {
    const converted = convertWeight(kgValue);
    return `${converted} ${settings.weightUnit}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        loadSettings,
        clearSettings,
        convertWeight,
        toKg,
        formatWeight,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

/**
 * Hook that returns the effective isDarkMode boolean, respecting the user's
 * themeMode setting (light / dark / auto). Use this in every screen/modal
 * instead of `useColorScheme() === 'dark'` so the global theme switch works.
 */
export function useEffectiveDark() {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();
  if (settings.themeMode === "dark") return true;
  if (settings.themeMode === "light") return false;
  return systemScheme === "dark"; // 'auto'
}
