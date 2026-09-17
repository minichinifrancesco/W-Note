import React, { useState, useMemo, useCallback } from 'react';
import { Alert, SafeAreaView, View, Image, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useEffectiveDark, useSettings } from '../context/SettingsContext';
import { logoCompact } from '../constants';
import { getStyles } from '../styles/styles';
import BottomNav from '../components/BottomNav';
import HelpButton from '../components/HelpModal';
import SettingsModal from '../modals/SettingsModal';
import BadgesModal from '../modals/BadgesModal';
import { Ionicons } from '@expo/vector-icons';
import {
  getTrainingGoalLabel,
  getTrainingLevelLabel,
} from '../constants/coachProfile';

export default function ProfileScreen({
  user,
  profileName,
  profileSurname,
  profileBirthDate,
  profileGender,
  profileAge,
  profileHeight,
  profileWeight,
  profileTrainingGoal,
  profileTrainingLevel,
  profileTargetWorkoutDays,
  openProfileEdit,
  openCoachProfileEdit,
  history,
  workouts,
  getTotalHours,
  getCompletedSets,
  currentScreen,
  setCurrentScreen,
  badges = [],
  handleLogout,
}) {
  const isDarkMode = useEffectiveDark();
  const { formatWeight } = useSettings();
  const styles = getStyles(isDarkMode);
  const [showSettings, setShowSettings] = useState(false);
  const [showBadges, setShowBadges] = useState(false);

  const trainingGoalLabel = getTrainingGoalLabel(profileTrainingGoal);
  const trainingLevelLabel = getTrainingLevelLabel(profileTrainingLevel);

  const totalHours = useMemo(() => getTotalHours(), [history, getTotalHours]);
  const completedSets = useMemo(() => getCompletedSets(), [history, getCompletedSets]);

  const handleCloseSettings = useCallback(() => setShowSettings(false), []);
  const handleCloseBadges = useCallback(() => setShowBadges(false), []);
  const handleOpenBadges = useCallback(() => setShowBadges(true), []);
  const handleOpenSettings = useCallback(() => setShowSettings(true), []);
  const confirmLogout = useCallback(() => {
    Alert.alert(
      'Conferma logout',
      "Vuoi davvero uscire dall'app?",
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: handleLogout,
        },
      ],
      { cancelable: true },
    );
  }, [handleLogout]);
  const profileFullName =
    [profileName, profileSurname].filter(Boolean).join(' ') ||
    'Nome non impostato';
  const profileInitial = (profileName || profileSurname || user?.email || 'U')
    .charAt(0)
    .toUpperCase();
  const genderLabel =
    {
      MASCHIO: 'Maschio',
      FEMMINA: 'Femmina',
      NON_SPECIFICATO: 'Non specificato',
    }[profileGender || user?.gender] || 'Non specificato';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={logoCompact} style={styles.logoSmall} />
          <View>
            <Text style={styles.headerTitle}>Profilo</Text>
            <Text style={styles.headerSubtitle}>{user?.email || 'Utente'}</Text>
          </View>
        </View>

        {/* Settings button + Help button + Logout button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={confirmLogout}
            style={{
              backgroundColor: '#ef4444',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={0.75}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Esci</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenSettings}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#f0fdf4',
              borderWidth: 1.5,
              borderColor: '#86B749',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="settings-outline" size={16} color="#15803d" />
          </TouchableOpacity>
          <HelpButton screen="profile" />
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{profileInitial}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profileFullName}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>

            <TouchableOpacity
              style={styles.profileEditButton}
              onPress={openProfileEdit}>
              <Text style={styles.profileEditButtonText}>Modifica</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfoRow}>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Nascita</Text>
              <Text style={styles.profileInfoValue}>
                {profileBirthDate || '-'}
              </Text>
            </View>

            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Età</Text>
              <Text style={styles.profileInfoValue}>{profileAge || '-'}</Text>
            </View>

            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Altezza</Text>
              <Text style={styles.profileInfoValue}>
                {profileHeight ? `${profileHeight} cm` : '-'}
              </Text>
            </View>

            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Peso</Text>
              <Text style={styles.profileInfoValue}>
                {profileWeight ? formatWeight(profileWeight) : '-'}
              </Text>
            </View>
          </View>

          <View style={styles.profileInfoRow}>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Genere</Text>
              <Text style={styles.profileInfoValue}>{genderLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, }}>
            <Text style={styles.sectionTitle}>Profilo Coach</Text>
            <TouchableOpacity
              style={styles.profileEditButton}
              onPress={openCoachProfileEdit}>
              <Text style={styles.profileEditButtonText}>Modifica</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfoRow}>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Obiettivo</Text>
              <Text style={styles.profileInfoValue}>{trainingGoalLabel}</Text>
            </View>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Livello</Text>
              <Text style={styles.profileInfoValue}>{trainingLevelLabel}</Text>
            </View>
          </View>
          <View style={styles.profileInfoRow}>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Target</Text>
              <Text style={styles.profileInfoValue}>
                {profileTargetWorkoutDays || 3}{' '}
                {Number(profileTargetWorkoutDays || 3) === 1 ? 'allenamento' : 'allenamenti'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.sectionTitle}>Statistiche generali</Text>

          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatBox}>
              <Text style={styles.profileStatLabel}>Sessioni totali</Text>
              <Text style={styles.profileStatValue}>{history.length}</Text>
            </View>

            <View style={styles.profileStatBox}>
              <Text style={styles.profileStatLabel}>Ore totali</Text>
              <Text style={styles.profileStatValue}>{totalHours}h</Text>
            </View>
          </View>

          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatBox}>
              <Text style={styles.profileStatLabel}>Serie completate</Text>
              <Text style={styles.profileStatValue}>{completedSets}</Text>
            </View>

            <View style={styles.profileStatBox}>
              <Text style={styles.profileStatLabel}>Schede create</Text>
              <Text style={styles.profileStatValue}>{workouts.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.sectionTitle}>Badge e obiettivi</Text>
          <Text style={{ fontSize: 13, color: isDarkMode ? '#94a3b8' : '#64748b', lineHeight: 19, marginBottom: 12 }}>
            Record personali e streak salvati in modo permanente.
          </Text>

          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatBox}>
              <Text style={styles.profileStatLabel}>Badge ottenuti</Text>
              <Text style={styles.profileStatValue}>{badges.length}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.profileStatBox,
                {
                  borderColor: '#86B749',
                  borderWidth: 1.5,
                  justifyContent: 'center',
                },
              ]}
              onPress={handleOpenBadges}
            >
              <Text style={[styles.profileStatLabel, { color: '#15803d' }]}>
                Apri raccolta
              </Text>
              <Text style={[styles.profileStatValue, { color: '#86B749', fontSize: 18 }]}>
                Vedi
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BottomNav currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />

      <SettingsModal visible={showSettings} onClose={handleCloseSettings} />
      <BadgesModal visible={showBadges} onClose={handleCloseBadges} badges={badges} />
    </SafeAreaView>
  );
}
