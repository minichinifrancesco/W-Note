import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import BottomNav from '../components/BottomNav';
import { logoCompact } from '../constants';
import { useEffectiveDark, useSettings } from '../context/SettingsContext';
import { getStyles, getThemeColors } from '../styles/styles';
import CoachSummaryMetrics from '../features/coach/components/CoachSummaryMetrics';
import CoachRecommendedSessionSection from '../features/coach/components/CoachRecommendedSessionSection';
import CoachWeeklyPaceSection from '../features/coach/components/CoachWeeklyPaceSection';
import CoachExerciseTrendsSection from '../features/coach/components/CoachExerciseTrendsSection';
import CoachWeekNavigator from '../features/coach/components/CoachWeekNavigator';
import CoachComparisonCard from '../features/coach/components/CoachComparisonCard';
import CoachInsightsSection from '../features/coach/components/CoachInsightsSection';
import CoachWeekDayStrip from '../features/coach/components/CoachWeekDayStrip';
import CoachBadgesSection from '../features/coach/components/CoachBadgesSection';
import CoachEmptyState from '../features/coach/components/CoachEmptyState';
import CoachNextFocusSection from '../features/coach/components/CoachNextFocusSection';
import CoachExportButton from '../features/coach/components/CoachExportButton';
import { useWeeklyCoachSummary } from '../features/coach/hooks/useWeeklyCoachSummary';
import { useCoachReportExport } from '../features/coach/hooks/useCoachReportExport';

export default function CoachScreen({
  authToken,
  currentScreen,
  setCurrentScreen,
}) {
  const isDarkMode = useEffectiveDark();
  const styles = getStyles(isDarkMode);
  const colors = getThemeColors(isDarkMode);

  const { settings, convertWeight, formatWeight } = useSettings();

  const formatOptions = useMemo(
    () => ({
      weightUnit: settings.weightUnit,
      convertWeight,
      formatWeight,
    }),
    [settings.weightUnit, convertWeight, formatWeight],
  );

  const {
    summary,
    loading,
    refreshing,
    error,
    isCurrentWeek,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    refresh,
  } = useWeeklyCoachSummary(authToken);

  const hasSessions = Number(summary?.totals?.sessions || 0) > 0;

  const { exporting, canExportCoachReport, exportCoachReport } =
    useCoachReportExport({
      summary,
      loading,
      error,
      hasSessions,
      formatOptions,
    });

  const goToHome = () => {
    setCurrentScreen('home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={logoCompact} style={styles.logoSmall} />

          <View>
            <Text style={styles.headerTitle}>Coach</Text>
            <Text style={styles.headerSubtitle}>
              {summary?.period?.label || 'Dashboard settimanale'}
            </Text>
          </View>
        </View>

        <CoachExportButton
          disabled={!canExportCoachReport}
          exporting={exporting}
          colors={colors}
          onPress={exportCoachReport}
        />
      </View>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <CoachWeekNavigator
          styles={styles}
          isCurrentWeek={isCurrentWeek}
          onPreviousWeek={goToPreviousWeek}
          onCurrentWeek={goToCurrentWeek}
          onNextWeek={goToNextWeek}
        />

        {loading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />

            <Text style={{ marginTop: 8, color: colors.textMuted }}>
              Caricamento coach . . .
            </Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.workoutCard}>
            <Text style={styles.sectionTitle}>Errore</Text>

            <Text style={{ color: colors.textMuted, marginTop: 8 }}>
              {error}
            </Text>
          </View>
        ) : null}

        {!loading && !error && summary ? (
          <>
            <CoachSummaryMetrics
              summary={summary}
              colors={colors}
              styles={styles}
              formatOptions={formatOptions}
            />

            <CoachRecommendedSessionSection
              summary={summary}
              colors={colors}
              styles={styles}
            />

            <CoachWeeklyPaceSection
              summary={summary}
              colors={colors}
              styles={styles}
              isCurrentWeek={isCurrentWeek}
            />

            <CoachExerciseTrendsSection
              summary={summary}
              colors={colors}
              styles={styles}
              formatOptions={formatOptions}
            />

            {hasSessions ? (
              <>
                <CoachWeekDayStrip
                  summary={summary}
                  colors={colors}
                  styles={styles}
                />

                <CoachComparisonCard
                  summary={summary}
                  colors={colors}
                  styles={styles}
                  formatOptions={formatOptions}
                />

                <CoachInsightsSection
                  summary={summary}
                  colors={colors}
                  styles={styles}
                />

                <CoachNextFocusSection
                  summary={summary}
                  colors={colors}
                  styles={styles}
                  formatOptions={formatOptions}
                />

                <CoachBadgesSection
                  summary={summary}
                  colors={colors}
                  styles={styles}
                  formatOptions={formatOptions}
                />
              </>
            ) : (
              <CoachEmptyState
                colors={colors}
                styles={styles}
                onGoHome={goToHome}
                showGoHomeButton={isCurrentWeek}
                isCurrentWeek={isCurrentWeek}
              />
            )}
          </>
        ) : null}
      </ScrollView>

      <BottomNav
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
      />
    </SafeAreaView>
  );
}
