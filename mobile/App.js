import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Alert,
  Platform,
  StatusBar,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getStyles } from './styles/styles';
import {
  SettingsProvider,
  useEffectiveDark,
  useSettings,
} from './context/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import {
  archiveWorkoutPlan,
  createCustomExercise as createCustomExerciseRequest,
  createWorkoutPlan,
  createWorkoutRecord,
  deleteCustomExercise as deleteCustomExerciseRequest,
  getExercises,
  getUserData,
  login as loginRequest,
  register as registerRequest,
  updateCustomExercise as updateCustomExerciseRequest,
  updateWorkoutPlan,
  updateWorkoutNotes,
  updateProfile,
} from './services/api';

// Screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ActiveWorkoutScreen from './screens/ActiveWorkoutScreen';
import EditTemplateScreen from './screens/EditTemplateScreen';
import HistoryScreen from './screens/HistoryScreen';
import ExercisesScreen from './screens/ExercisesScreen';
import ProfileScreen from './screens/ProfileScreen';
import CoachScreen from './screens/CoachScreen';

// Modals
import CreateWorkoutModal from './modals/CreateWorkoutModal';
import ViewWorkoutModal from './modals/ViewWorkoutModal';
import CustomExerciseModal from './modals/CustomExerciseModal';
import RenameCustomExerciseModal from './modals/RenameCustomExerciseModal';
import RestTimeModal from './modals/RestTimeModal';
import EditProfileModal from './modals/EditProfileModal';
import HistoryDetailModal from './modals/HistoryDetailModal';
import EditHistoryModal from './modals/EditHistoryModal';
import AddExerciseInSessionModal from './modals/AddExerciseInSessionModal';
import AddExerciseInTemplateModal from './modals/AddExerciseInTemplateModal';
import EditCoachProfileModal from './modals/EditCoachProfileModal';

// Components
import ExerciseDescriptionModal from './components/ExerciseDescriptionModal';
import {
  detectPersonalRecords,
  exerciseMatches,
  getHistoricalBestForExercise,
} from './utils/progress';

const parseWorkoutNumber = (value) =>
  parseFloat(String(value || 0).replace(',', '.')) || 0;

const normalizeTargetWorkoutDays = (value) => {
  const parsed = parseInt(String(value ?? 3), 10);

  if (!Number.isFinite(parsed)) return 3;

  return Math.min(Math.max(parsed, 1), 7);
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getPasswordValidationError = (value) => {
  const passwordValue = value || '';
  if (passwordValue.length < 8) {
    return 'La password deve contenere almeno 8 caratteri.';
  }

  const missingRequirements = [];
  if (!/[a-z]/.test(passwordValue)) {
    missingRequirements.push('una lettera minuscola');
  }
  if (!/[A-Z]/.test(passwordValue)) {
    missingRequirements.push('una lettera maiuscola');
  }
  if (!/\d/.test(passwordValue)) missingRequirements.push('un numero');
  if (!/[^A-Za-z0-9]/.test(passwordValue)) {
    missingRequirements.push('un simbolo');
  }

  if (missingRequirements.length > 0) {
    return `La password deve contenere anche ${missingRequirements.join(', ')}.`;
  }

  return null;
};

const showAuthError = (title, message) => {
  const safeMessage = message || 'Operazione non riuscita';

  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.alert === 'function'
  ) {
    window.alert(`${title}\n\n${safeMessage}`);
    return;
  }

  Alert.alert(title, safeMessage);
};

const normalizeProfileGender = (value) => {
  const normalized = String(value || 'NON_SPECIFICATO').toUpperCase();
  return ['MASCHIO', 'FEMMINA', 'NON_SPECIFICATO'].includes(normalized)
    ? normalized
    : 'NON_SPECIFICATO';
};

const formatProfileDate = (value) => {
  if (!value) return '';

  const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Extracted as React.memo so only this component re-renders every second
// (when workoutSeconds changes), not the entire MainApp tree.
const FloatingWorkoutBar = React.memo(function FloatingWorkoutBar({
  activeWorkout,
  currentScreen,
  workoutSeconds,
  isDarkMode,
  formatWorkoutTime,
  onPress,
}) {
  if (
    !activeWorkout ||
    currentScreen === 'activeWorkout' ||
    currentScreen === 'login' ||
    currentScreen === 'editTemplate'
  ) {
    return null;
  }
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{
        position: 'absolute',
        bottom: 110,
        left: 12,
        right: 12,
        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#86B749',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 8,
      }}
      onPress={onPress}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#86B749',
          }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: '#86B749',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Allenamento Attivo
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: isDarkMode ? '#f8fafc' : '#0f172a',
            }}
          >
            {activeWorkout.name}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: '#86B749',
            fontFamily: 'monospace',
          }}
        >
          {formatWorkoutTime(workoutSeconds)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#86B749" />
      </View>
    </TouchableOpacity>
  );
});

function MainApp() {
  const isDarkMode = useEffectiveDark();
  const { settings, loadSettings, clearSettings, formatWeight } = useSettings();
  const styles = getStyles(isDarkMode);

  const [currentScreen, setCurrentScreen] = useState('login');

  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [baseExercises, setBaseExercises] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [history, setHistory] = useState([]);
  const [badges, setBadges] = useState([]);

  const [activeWorkout, setActiveWorkout] = useState(null);
  const [templateWorkout, setTemplateWorkout] = useState(null);

  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [focusedMuscle, setFocusedMuscle] = useState(null);

  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [showViewWorkout, setShowViewWorkout] = useState(false);
  const [showCustomExercise, setShowCustomExercise] = useState(false);
  const [showRenameCustomExercise, setShowRenameCustomExercise] =
    useState(false);
  const [showRestTimeModal, setShowRestTimeModal] = useState(false);
  const [showAddExerciseInSession, setShowAddExerciseInSession] =
    useState(false);
  const [showAddExerciseInTemplate, setShowAddExerciseInTemplate] =
    useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);
  const [replaceTargetExerciseId, setReplaceTargetExerciseId] = useState(null);
  const [showEditCoachProfileModal, setShowEditCoachProfileModal] =
    useState(false);

  // Exercise Description Modal states
  const [selectedDescriptionExercise, setSelectedDescriptionExercise] =
    useState(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [renamingCustomExercise, setRenamingCustomExercise] = useState(null);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [editingHistoryRecord, setEditingHistoryRecord] = useState(null);

  const [editingRestExerciseId, setEditingRestExerciseId] = useState(null);
  const [tempRestTime, setTempRestTime] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workoutName, setWorkoutName] = useState('');

  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customMuscleGroup, setCustomMuscleGroup] = useState('');
  const [customExerciseType, setCustomExerciseType] = useState('weight_reps');
  const [customExerciseDescription, setCustomExerciseDescription] =
    useState('');

  const [profileName, setProfileName] = useState('');
  const [profileSurname, setProfileSurname] = useState('');
  const [profileBirthDate, setProfileBirthDate] = useState('');
  const [profileGender, setProfileGender] = useState('NON_SPECIFICATO');
  const [profileAge, setProfileAge] = useState('');
  const [profileHeight, setProfileHeight] = useState('');
  const [profileWeight, setProfileWeight] = useState('');
  const [profileTrainingGoal, setProfileTrainingGoal] = useState('GENERALE');
  const [profileTrainingLevel, setProfileTrainingLevel] =
    useState('PRINCIPIANTE');
  const [profileTargetWorkoutDays, setProfileTargetWorkoutDays] = useState('3');

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [restTime, setRestTime] = useState('60');
  const [duration, setDuration] = useState('');

  const [sessionSelectedExercise, setSessionSelectedExercise] = useState(null);
  const [sessionSets, setSessionSets] = useState('');
  const [sessionReps, setSessionReps] = useState('');
  const [sessionWeight, setSessionWeight] = useState('');
  const [sessionRestTime, setSessionRestTime] = useState('60');
  const [sessionDuration, setSessionDuration] = useState('');

  const [templateSelectedExercise, setTemplateSelectedExercise] =
    useState(null);
  const [templateSets, setTemplateSets] = useState('');
  const [templateReps, setTemplateReps] = useState('');
  const [templateWeight, setTemplateWeight] = useState('');
  const [templateRestTime, setTemplateRestTime] = useState('60');
  const [templateDuration, setTemplateDuration] = useState('');

  useEffect(() => {
    bootstrapApp();
  }, []);

  useEffect(() => {
    let interval;
    if (timerActive && timer > 0 && !isPaused) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0 && timerActive) {
      setTimerActive(false);

      // Play native feedback notifications on timer end based on settings preferences
      const triggerFeedback = async () => {
        try {
          if (settings.restTimerHaptic) {
            const Haptics = require('expo-haptics');
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
          }
        } catch (err) {
          console.log('Haptics feedback error:', err);
        }

        try {
          if (settings.restTimerSound) {
            const { Audio } = require('expo-av');
            // Configure Audio to play through the ringtone/speaker channel at maximum system output
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldRouteThroughEarpieceAndroid: false,
            });
            const { sound } = await Audio.Sound.createAsync(
              require('./assets/ping.mp3'),
              { volume: 1.0 }, // Set volume level to 1.0 (maximum output)
            );
            await sound.playAsync();
            // Automatically stop the sound after 3 seconds
            setTimeout(async () => {
              try {
                await sound.stopAsync();
                await sound.unloadAsync();
              } catch (e) {}
            }, 3000);
          }
        } catch (err) {
          console.log('Audio feedback error:', err);
        }
      };

      triggerFeedback();
      Alert.alert('Timer terminato', 'Tempo concluso!');
    }
    return () => clearInterval(interval);
  }, [timerActive, timer, isPaused, settings]);

  useEffect(() => {
    let interval;
    if (activeWorkout && !isPaused) {
      interval = setInterval(() => setWorkoutSeconds((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkout, isPaused]);

  const isCustomExercise = (exercise) =>
    exercise?.custom === true || exercise?.source === 'CUSTOM';

  const getCustomExercises = (value) =>
    Array.isArray(value) ? value.filter(isCustomExercise) : [];

  const mergeExerciseCatalog = (catalog = [], savedExercises = []) => {
    const merged = [...catalog, ...getCustomExercises(savedExercises)];
    const seen = new Set();
    return merged.filter((exercise) => {
      const key = `${exercise.id}:${exercise.name}:${exercise.muscleGroup}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const normalizeExercises = (value, catalog = baseExercises) => {
    return mergeExerciseCatalog(catalog, value);
  };

  const applyServerData = useCallback(
    (serverData, catalog = exercises) => {
      const nextData = {
        workouts: Array.isArray(serverData?.workouts)
          ? serverData.workouts
          : [],
        exercises: normalizeExercises(serverData?.exercises, catalog),
        history: Array.isArray(serverData?.history) ? serverData.history : [],
        badges: Array.isArray(serverData?.badges) ? serverData.badges : [],
      };

      setWorkouts(nextData.workouts);
      setExercises(nextData.exercises);
      setHistory(nextData.history);
      setBadges(nextData.badges);
    },
    [exercises, normalizeExercises],
  );

  const loadExerciseCatalog = async (token) => {
    try {
      const catalog = await getExercises(token);
      const safeCatalog = Array.isArray(catalog) ? catalog : [];
      if (!token) {
        setBaseExercises(safeCatalog);
      }
      setExercises(safeCatalog);
      return safeCatalog;
    } catch (error) {
      console.error(
        'Errore caricamento catalogo esercizi:',
        error.message || error,
      );
      return token ? baseExercises : [];
    }
  };

  const bootstrapApp = async () => {
    try {
      await loadExerciseCatalog();
    } finally {
      setIsHydrating(false);
    }
  };

  const applyUserProfile = (targetUser) => {
    setProfileName(targetUser?.name || '');
    setProfileSurname(targetUser?.surname || '');
    setProfileBirthDate(formatProfileDate(targetUser?.birthDate));
    setProfileGender(normalizeProfileGender(targetUser?.gender));
    setProfileAge(targetUser?.age ? String(targetUser.age) : '');
    setProfileHeight(targetUser?.height ? String(targetUser.height) : '');
    setProfileWeight(targetUser?.weight ? String(targetUser.weight) : '');
    setProfileTrainingGoal(targetUser?.trainingGoal || 'GENERALE');
    setProfileTrainingLevel(targetUser?.trainingLevel || 'PRINCIPIANTE');
    setProfileTargetWorkoutDays(String(targetUser?.targetWorkoutDays || 3));
  };

  const loadUserData = async (token, catalog = baseExercises) => {
    let serverData = null;
    try {
      serverData = await getUserData(token);
    } catch (error) {
      console.error('Errore caricamento dati server:', error.message || error);
    }

    applyServerData(serverData, catalog);
  };

  const openExerciseDescription = useCallback(
    (exercise) => {
      if (!exercise) return;
      const fullExercise = exercises.find(
        (e) =>
          e.id === exercise.exerciseId ||
          e.id === exercise.id ||
          (e.name &&
            exercise.name &&
            e.name.toLowerCase().trim() === exercise.name.toLowerCase().trim()),
      );
      setSelectedDescriptionExercise(fullExercise || exercise);
      setShowDescriptionModal(true);
    },
    [exercises],
  );

  const handleCloseDescriptionModal = useCallback(() => {
    setShowDescriptionModal(false);
    setSelectedDescriptionExercise(null);
  }, []);

  const handleGoToActiveWorkout = useCallback(() => {
    setCurrentScreen('activeWorkout');
  }, []);

  const formatWorkoutTime = useCallback((totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return (
      `${hours.toString().padStart(2, '0')}:` +
      `${minutes.toString().padStart(2, '0')}:` +
      `${seconds.toString().padStart(2, '0')}`
    );
  }, []);

  const formatDate = useCallback(() => {
    const d = new Date();
    return d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, []);

  const getCompletedSets = useCallback(() => {
    let count = 0;
    history.forEach((record) => {
      (record.exercises || []).forEach((ex) => {
        (ex.setDetails || []).forEach((sd) => {
          if (sd.completed) count += 1;
        });
      });
    });
    return count;
  }, [history]);

  const getTotalHours = useCallback(() => {
    let totalSeconds = 0;
    history.forEach((record) => {
      if (typeof record.durationSeconds === 'number') {
        totalSeconds += record.durationSeconds;
      }
    });
    return Math.round(totalSeconds / 3600);
  }, [history]);

  const completeAuth = async ({ token, user: nextUser }) => {
    setIsHydrating(true);
    try {
      setAuthToken(token);
      setUser(nextUser);
      applyUserProfile(nextUser);
      setCurrentScreen('home');
      setPassword('');
      await loadSettings(token);
      const catalog = await loadExerciseCatalog(token);
      await loadUserData(token, catalog);
    } catch (error) {
      setIsHydrating(false);
      throw error;
    } finally {
      setIsHydrating(false);
    }
  };

  const handleLogin = async () => {
    const loginEmail = email.trim();

    if (!loginEmail || !password) {
      showAuthError('Errore', 'Compila email e password');
      return;
    }
    if (!isValidEmail(loginEmail)) {
      showAuthError('Errore', 'Formato email non valido');
      return;
    }

    setAuthLoading(true);
    try {
      const authResponse = await loginRequest(loginEmail, password);
      await completeAuth(authResponse);
    } catch (error) {
      showAuthError('Errore login', error.message || 'Login non riuscito');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (registrationData) => {
    const registrationEmail = (registrationData?.email || '').trim();
    const registrationPassword = registrationData?.password || '';
    const registrationName = (registrationData?.name || '').trim();
    const registrationSurname = (registrationData?.surname || '').trim();
    const registrationBirthDate = registrationData?.birthDate;
    const registrationGender = normalizeProfileGender(registrationData?.gender);

    if (
      !registrationEmail ||
      !registrationPassword ||
      !registrationName ||
      !registrationSurname ||
      !registrationBirthDate
    ) {
      showAuthError('Errore', 'Compila tutti i campi');
      return false;
    }
    if (!isValidEmail(registrationEmail)) {
      showAuthError('Errore', 'Formato email non valido');
      return false;
    }

    const passwordValidationError =
      getPasswordValidationError(registrationPassword);
    if (passwordValidationError) {
      showAuthError('Password non valida', passwordValidationError);
      return false;
    }

    setAuthLoading(true);
    try {
      const authResponse = await registerRequest({
        email: registrationEmail,
        password: registrationPassword,
        name: registrationName,
        surname: registrationSurname,
        birthDate: registrationBirthDate,
        gender: registrationGender,
      });
      setEmail(registrationEmail);
      await completeAuth(authResponse);
      return true;
    } catch (error) {
      if (error.code === 'ACCOUNT_ALREADY_EXISTS' || error.status === 409) {
        showAuthError('Errore', 'Account già registrato, effettua il login');
      } else {
        showAuthError(
          'Errore registrazione',
          error.message || 'Registrazione non riuscita',
        );
      }
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setAuthToken(null);
    setCurrentScreen('login');
    setEmail('');
    setPassword('');
    setProfileName('');
    setProfileSurname('');
    setProfileBirthDate('');
    setProfileGender('NON_SPECIFICATO');
    setProfileAge('');
    setProfileHeight('');
    setProfileWeight('');
    setProfileTrainingGoal('GENERALE');
    setProfileTrainingLevel('PRINCIPIANTE');
    setProfileTargetWorkoutDays('3');
    setWorkouts([]);
    setExercises(baseExercises);
    setHistory([]);
    setBadges([]);
    clearSettings();
  };

  const createWorkout = () => {
    const newWorkout = {
      id: Date.now(),
      name: '',
      exercises: [],
      createdAt: new Date().toISOString(),
      isNew: true,
    };
    openTemplateEditor(newWorkout);
  };

  const deleteWorkout = useCallback(
    (id) => {
      Alert.alert('Conferma', 'Vuoi archiviare questa scheda?', [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Archivia',
          style: 'destructive',
          onPress: async () => {
            if (!authToken) {
              Alert.alert(
                'Errore',
                'Effettua il login per archiviare la scheda',
              );
              return;
            }

            try {
              const serverData = await archiveWorkoutPlan(authToken, id);
              applyServerData(serverData);
            } catch (error) {
              Alert.alert(
                'Errore scheda',
                error.message || 'Archiviazione scheda non riuscita',
              );
            }
          },
        },
      ]);
    },
    [authToken, applyServerData],
  );

  const createCustomExercise = async (override = null) => {
    const nextName = override?.name ?? customExerciseName;
    const nextMuscleGroup = override?.muscleGroup ?? customMuscleGroup;
    const nextEquipmentType = override?.equipmentType ?? 'Altro';
    const nextType = override?.type ?? customExerciseType;
    const nextDescription = override?.description ?? customExerciseDescription;
    const cleanedExName = nextName.trim();
    const isOnlySpecialChars =
      /^[-\s!@#$%^&*()_+={}\[\]|\\:;"'<>,.?\/~`]+$/.test(cleanedExName);

    if (!cleanedExName || !nextMuscleGroup.trim()) {
      Alert.alert(
        'Errore',
        'Compila nome esercizio e scegli il gruppo muscolare',
      );
      return;
    }
    if (isOnlySpecialChars) {
      Alert.alert(
        'Errore',
        "Il nome dell'esercizio non può contenere solo caratteri speciali o trattini",
      );
      return;
    }

    if (!authToken) {
      Alert.alert('Errore', 'Effettua il login per creare un esercizio');
      return;
    }

    try {
      const savedExercise = await createCustomExerciseRequest(authToken, {
        name: cleanedExName,
        muscleGroup: nextMuscleGroup,
        equipmentType: nextEquipmentType,
        type: nextType || 'weight_reps',
        description: nextDescription.trim() || '',
      });
      setExercises((prev) => [
        ...prev,
        {
          ...savedExercise,
          equipmentType: savedExercise.equipmentType || nextEquipmentType,
          description:
            (savedExercise.description ?? nextDescription.trim()) || '',
        },
      ]);
      setCustomExerciseName('');
      setCustomMuscleGroup('');
      setCustomExerciseType('weight_reps');
      setCustomExerciseDescription('');
      setShowCustomExercise(false);
    } catch (error) {
      Alert.alert(
        'Errore esercizio',
        error.message || 'Creazione esercizio non riuscita',
      );
    }
  };

  const openRenameCustomExercise = useCallback((exercise) => {
    if (!exercise?.custom) return;
    setRenamingCustomExercise(exercise);
    setShowRenameCustomExercise(true);
  }, []);

  const renameCustomExercise = useCallback(
    async (nextName) => {
      const cleanedExName = String(nextName || '').trim();
      const isOnlySpecialChars =
        /^[-\s!@#$%^&*()_+={}\[\]|\\:;"'<>,.?\/~`]+$/.test(cleanedExName);

      if (!renamingCustomExercise?.id) {
        setShowRenameCustomExercise(false);
        return;
      }

      if (!cleanedExName) {
        Alert.alert('Errore', "Inserisci il nuovo nome dell'esercizio");
        return;
      }

      if (isOnlySpecialChars) {
        Alert.alert(
          'Errore',
          "Il nome dell'esercizio non può contenere solo caratteri speciali o trattini",
        );
        return;
      }

      if (!authToken) {
        Alert.alert('Errore', 'Effettua il login per rinominare un esercizio');
        return;
      }

      try {
        await updateCustomExerciseRequest(
          authToken,
          renamingCustomExercise.id,
          {
            name: cleanedExName,
          },
        );
        const catalog = await loadExerciseCatalog(authToken);
        await loadUserData(authToken, catalog);
        setSelectedDescriptionExercise((prev) =>
          prev?.id === renamingCustomExercise.id
            ? { ...prev, name: cleanedExName }
            : prev,
        );
        setRenamingCustomExercise(null);
        setShowRenameCustomExercise(false);
      } catch (error) {
        Alert.alert(
          'Errore esercizio',
          error.message || 'Rinomina esercizio non riuscita',
        );
      }
    },
    [authToken, renamingCustomExercise, loadExerciseCatalog, loadUserData],
  );

  const deleteCustomExercise = async (exerciseId) => {
    if (!authToken) {
      Alert.alert('Errore', 'Effettua il login per eliminare un esercizio');
      return;
    }

    try {
      await deleteCustomExerciseRequest(authToken, exerciseId);
      setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
    } catch (error) {
      Alert.alert(
        'Errore esercizio',
        error.message || 'Eliminazione esercizio non riuscita',
      );
    }
  };

  const startWorkout = useCallback((workout) => {
    const clonedExercises = workout.exercises.map((ex) => {
      const exType = ex.type || 'weight_reps';
      const timed = exType === 'timed';
      const repsOnly = exType === 'reps';

      const setDetails =
        ex.setDetails && ex.setDetails.length > 0
          ? ex.setDetails.map((sd) => ({
              weight: timed || repsOnly ? 0 : (sd.weight ?? ex.weight ?? 0),
              reps: timed ? 0 : (sd.reps ?? ex.reps ?? 0),
              duration: timed ? (sd.duration ?? ex.duration ?? 0) : 0,
              completed: false,
            }))
          : Array.from({ length: ex.sets || 1 }, () => ({
              weight: timed || repsOnly ? 0 : ex.weight || 0,
              reps: timed ? 0 : ex.reps || 0,
              duration: timed ? ex.duration || 0 : 0,
              completed: false,
            }));

      return { ...ex, note: ex.note || '', setDetails };
    });

    setActiveWorkout({
      ...workout,
      exercises: clonedExercises,
      startTime: new Date(),
    });
    setWorkoutSeconds(0);
    setTimer(0);
    setTimerActive(false);
    setIsPaused(false);
    setCurrentScreen('activeWorkout');
  }, []);

  const openTemplateEditor = useCallback((workout) => {
    const normalizedExercises = workout.exercises.map((ex) => {
      const exType = ex.type || 'weight_reps';
      const timed = exType === 'timed';
      const repsOnly = exType === 'reps';

      const existingSetDetails =
        ex.setDetails && ex.setDetails.length > 0
          ? ex.setDetails.map((sd) => ({
              weight: timed || repsOnly ? 0 : (sd.weight ?? ex.weight ?? 0),
              reps: timed ? 0 : (sd.reps ?? ex.reps ?? 0),
              duration: timed ? (sd.duration ?? ex.duration ?? 0) : 0,
              completed: false,
            }))
          : [{ weight: 0, reps: 0, duration: 0, completed: false }];

      return { ...ex, note: ex.note || '', setDetails: existingSetDetails };
    });

    setTemplateWorkout({
      ...workout,
      exercises: normalizedExercises,
    });
    setCurrentScreen('editTemplate');
  }, []);

  const saveTemplateWorkout = useCallback(async () => {
    if (!templateWorkout) return;
    if (!authToken) {
      Alert.alert('Errore', 'Effettua il login per salvare la scheda');
      return;
    }

    const cleanedName = (templateWorkout.name || '').trim();
    // Regex matches strings that are only hyphens, punctuation or special characters
    const isOnlySpecialChars =
      /^[-\s!@#$%^&*()_+={}\[\]|\\:;"'<>,.?\/~`]+$/.test(cleanedName);

    if (!cleanedName) {
      Alert.alert('Errore', 'Inserisci un nome per la scheda prima di salvare');
      return;
    }
    if (isOnlySpecialChars) {
      Alert.alert(
        'Errore',
        'Il nome della scheda non può contenere solo caratteri speciali o trattini',
      );
      return;
    }

    const parseNumberInput = (value) =>
      parseFloat(String(value || 0).replace(',', '.')) || 0;

    const normalizedExercises = templateWorkout.exercises.map((ex) => {
      const exType = ex.type || 'weight_reps';
      const timed = exType === 'timed';
      const repsOnly = exType === 'reps';
      const details = (ex.setDetails || []).map((sd) => ({
        weight: timed || repsOnly ? 0 : parseNumberInput(sd.weight),
        reps: timed ? 0 : parseNumberInput(sd.reps),
        duration: timed ? parseNumberInput(sd.duration) : 0,
        completed: false,
      }));
      const first = details[0] || {};

      return {
        ...ex,
        sets: details.length,
        reps: timed ? 0 : first.reps || 0,
        weight: timed || repsOnly ? 0 : first.weight || 0,
        duration: timed ? first.duration || 0 : 0,
        restTime: parseNumberInput(ex.restTime),
        setDetails: details,
      };
    });

    const finalWorkout = {
      ...templateWorkout,
      name: cleanedName,
      active: templateWorkout.active === false ? false : true,
      exercises: normalizedExercises,
      isNew: false,
    };

    try {
      const serverData = templateWorkout.isNew
        ? await createWorkoutPlan(authToken, finalWorkout)
        : await updateWorkoutPlan(authToken, templateWorkout.id, finalWorkout);

      applyServerData(serverData);
      setTemplateWorkout(null);
      setCurrentScreen('home');
    } catch (error) {
      Alert.alert(
        'Errore scheda',
        error.message || 'Salvataggio scheda non riuscito',
      );
    }
  }, [templateWorkout, authToken, applyServerData]);

  const startRestTimer = useCallback((seconds) => {
    if (!seconds || seconds <= 0) return;
    setTimer(seconds);
    setTimerActive(true);
  }, []);

  const adjustTimer = useCallback((delta) => {
    setTimer((prev) => {
      const next = prev + delta;
      if (next <= 0) {
        setTimerActive(false);
        return 0;
      }
      return next;
    });
  }, []);

  const skipTimer = useCallback(() => {
    setTimer(0);
    setTimerActive(false);
  }, []);

  const toggleSetComplete = useCallback(
    (exerciseId, setIndex) => {
      if (!activeWorkout) return;

      const targetExercise = activeWorkout.exercises.find(
        (ex) => ex.id === exerciseId,
      );
      const targetSet = targetExercise?.setDetails?.[setIndex];
      if (!targetExercise || !targetSet) return;

      const willComplete = !targetSet.completed;

      const performToggle = () => {
        const updatedWorkout = {
          ...activeWorkout,
          exercises: activeWorkout.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              setDetails: ex.setDetails.map((sd, idx) => {
                if (idx !== setIndex) return sd;
                const nextCompleted = !sd.completed;
                let isPr = false;

                if (nextCompleted) {
                  const exType = ex.type || 'weight_reps';
                  const repsOnly = exType === 'reps';
                  const timed = exType === 'timed';

                  const histBest = getHistoricalBestForExercise(history, ex);
                  const currentWeight = Number(sd.weight) || 0;
                  const currentReps = Number(sd.reps) || 0;

                  let currentSessionMaxWeight = 0;
                  let currentSessionMaxReps = 0;

                  ex.setDetails.forEach((s, sIdx) => {
                    if (s.completed && sIdx !== setIndex) {
                      if (Number(s.weight) > currentSessionMaxWeight)
                        currentSessionMaxWeight = Number(s.weight);
                      if (Number(s.reps) > currentSessionMaxReps)
                        currentSessionMaxReps = Number(s.reps);
                    }
                  });

                  const thresholdWeight = Math.max(
                    histBest.maxWeight || 0,
                    currentSessionMaxWeight,
                  );
                  const thresholdReps = Math.max(
                    histBest.maxReps || 0,
                    currentSessionMaxReps,
                  );

                  if (!timed) {
                    if (repsOnly) {
                      if (currentReps > 0 && currentReps > thresholdReps) {
                        isPr = true;
                      }
                    } else {
                      if (
                        (currentWeight > 0 &&
                          currentWeight > thresholdWeight) ||
                        (currentReps > 0 && currentReps > thresholdReps)
                      ) {
                        isPr = true;
                      }
                    }
                  }
                }

                return { ...sd, completed: nextCompleted, isPr };
              }),
            };
          }),
        };

        setActiveWorkout(updatedWorkout);

        if (willComplete) {
          startRestTimer(targetExercise.restTime || 60);
        }
      };

      if (willComplete) {
        // Check for anomalous values (value >= 3x previous set/log)
        let prevSet = null;
        if (setIndex > 0) {
          prevSet = targetExercise.setDetails[setIndex - 1];
        } else if (history && history.length > 0) {
          for (const record of history) {
            const histEx = record.exercises?.find((e) =>
              exerciseMatches(e, targetExercise),
            );
            if (histEx && histEx.setDetails && histEx.setDetails.length > 0) {
              const completedSets = histEx.setDetails.filter(
                (s) => s.completed,
              );
              if (completedSets.length > 0) {
                prevSet = completedSets[completedSets.length - 1];
                break;
              }
            }
          }
        }

        const exType = targetExercise.type || 'weight_reps';
        const timed = exType === 'timed';
        const repsOnly = exType === 'reps';

        let isAnomalous = false;
        let alertMsg = '';

        if (prevSet) {
          if (timed) {
            const currentDuration = parseWorkoutNumber(targetSet.duration);
            const prevDuration = parseWorkoutNumber(prevSet.duration);
            if (prevDuration > 0 && currentDuration >= prevDuration * 3) {
              isAnomalous = true;
              alertMsg = `La durata inserita (${currentDuration} min) è molto più alta rispetto a quella precedente (${prevDuration} min). Sei sicuro che sia corretta?`;
            }
          } else if (repsOnly) {
            const currentReps = parseWorkoutNumber(targetSet.reps);
            const prevReps = parseWorkoutNumber(prevSet.reps);
            if (prevReps > 0 && currentReps >= prevReps * 3) {
              isAnomalous = true;
              alertMsg = `Le ripetizioni inserite (${currentReps}) sono molto più alte rispetto a quelle precedenti (${prevReps}). Sei sicuro che siano corrette?`;
            }
          } else {
            const currentWeight = parseWorkoutNumber(targetSet.weight);
            const prevWeight = parseWorkoutNumber(prevSet.weight);
            const currentReps = Number(targetSet.reps) || 0;
            const prevReps = Number(prevSet.reps) || 0;

            const weightAnomalous =
              prevWeight > 0 && currentWeight >= prevWeight * 3;
            const repsAnomalous = prevReps > 0 && currentReps >= prevReps * 3;

            if (weightAnomalous && repsAnomalous) {
              isAnomalous = true;
              alertMsg = `Il peso (${formatWeight(currentWeight)}) e le ripetizioni (${currentReps}) inseriti sono molto più alti rispetto a quelli precedenti (${formatWeight(prevWeight)}, ${prevReps}). Sei sicuro che siano corretti?`;
            } else if (weightAnomalous) {
              isAnomalous = true;
              alertMsg = `Il peso inserito (${formatWeight(currentWeight)}) è molto più alto rispetto a quello precedente (${formatWeight(prevWeight)}). Sei sicuro che sia corretto?`;
            } else if (repsAnomalous) {
              isAnomalous = true;
              alertMsg = `Le ripetizioni inserite (${currentReps}) sono molto più alte rispetto a quelle precedenti (${prevReps}). Sei sicuro che siano corrette?`;
            }
          }
        }

        if (isAnomalous) {
          Alert.alert('Valore anomalo', alertMsg, [
            {
              text: 'Modifica',
              style: 'cancel',
              onPress: () => {},
            },
            {
              text: 'Conferma',
              onPress: performToggle,
            },
          ]);
          return;
        }
      }

      performToggle();
    },
    [activeWorkout, formatWeight, history, startRestTimer],
  );

  const applySetUpdate = useCallback(
    (exerciseId, setIndex, field, parsedValue) => {
      setActiveWorkout((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              setDetails: ex.setDetails.map((sd, idx) => {
                if (idx !== setIndex) return sd;
                const updatedSet = { ...sd, [field]: parsedValue };

                let isPr = sd.isPr || false;
                if (updatedSet.completed) {
                  const exType = ex.type || 'weight_reps';
                  const repsOnly = exType === 'reps';
                  const timed = exType === 'timed';

                  const histBest = getHistoricalBestForExercise(history, ex);
                  const currentWeight = parseWorkoutNumber(updatedSet.weight);
                  const currentReps = parseWorkoutNumber(updatedSet.reps);

                  let currentSessionMaxWeight = 0;
                  let currentSessionMaxReps = 0;

                  ex.setDetails.forEach((s, sIdx) => {
                    if (s.completed && sIdx !== setIndex) {
                      if (
                        parseWorkoutNumber(s.weight) > currentSessionMaxWeight
                      )
                        currentSessionMaxWeight = parseWorkoutNumber(s.weight);
                      if (parseWorkoutNumber(s.reps) > currentSessionMaxReps)
                        currentSessionMaxReps = parseWorkoutNumber(s.reps);
                    }
                  });

                  const thresholdWeight = Math.max(
                    histBest.maxWeight || 0,
                    currentSessionMaxWeight,
                  );
                  const thresholdReps = Math.max(
                    histBest.maxReps || 0,
                    currentSessionMaxReps,
                  );

                  isPr = false;
                  if (!timed) {
                    if (repsOnly) {
                      if (currentReps > 0 && currentReps > thresholdReps) {
                        isPr = true;
                      }
                    } else {
                      if (
                        (currentWeight > 0 &&
                          currentWeight > thresholdWeight) ||
                        (currentReps > 0 && currentReps > thresholdReps)
                      ) {
                        isPr = true;
                      }
                    }
                  }
                } else {
                  isPr = false;
                }

                return { ...updatedSet, isPr };
              }),
            };
          }),
        };
      });
    },
    [history],
  );

  const updateSetDetail = useCallback(
    (exerciseId, setIndex, field, value) => {
      applySetUpdate(exerciseId, setIndex, field, value);
    },
    [applySetUpdate],
  );

  const deleteSetFromExercise = useCallback(
    (exerciseId, setIndex) => {
      if (!activeWorkout) return;
      Alert.alert(
        'Elimina serie',
        `Sei sicuro di voler eliminare la serie ${setIndex + 1}?`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Elimina',
            style: 'destructive',
            onPress: () => {
              setActiveWorkout((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  exercises: prev.exercises.map((ex) => {
                    if (ex.id !== exerciseId) return ex;
                    const newSetDetails = ex.setDetails.filter(
                      (_, idx) => idx !== setIndex,
                    );
                    return {
                      ...ex,
                      setDetails: newSetDetails,
                      sets: newSetDetails.length,
                    };
                  }),
                };
              });
            },
          },
        ],
      );
    },
    [activeWorkout],
  );

  const deleteExerciseFromActiveWorkout = useCallback(
    (exerciseId) => {
      if (!activeWorkout) return;
      const targetEx = activeWorkout.exercises.find(
        (ex) => ex.id === exerciseId,
      );
      const exName = targetEx ? ` "${targetEx.name}"` : '';
      Alert.alert(
        'Elimina esercizio',
        `Sei sicuro di voler eliminare l'esercizio${exName}?`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Elimina',
            style: 'destructive',
            onPress: () => {
              setActiveWorkout((prev) =>
                prev
                  ? {
                      ...prev,
                      exercises: prev.exercises.filter(
                        (ex) => ex.id !== exerciseId,
                      ),
                    }
                  : prev,
              );
            },
          },
        ],
      );
    },
    [activeWorkout],
  );

  const addSetToExercise = useCallback((exerciseId) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;

          const exType = ex.type || 'weight_reps';
          const timed = exType === 'timed';
          const repsOnly = exType === 'reps';

          // Copy last set values for convenience
          const lastSet = ex.setDetails?.[ex.setDetails.length - 1];
          const newSet = {
            weight: timed || repsOnly ? 0 : (lastSet?.weight ?? 0),
            reps: timed ? 0 : (lastSet?.reps ?? 0),
            duration: timed ? (lastSet?.duration ?? 0) : 0,
            completed: false,
          };

          const newSetDetails = [...ex.setDetails, newSet];
          return {
            ...ex,
            setDetails: newSetDetails,
            sets: newSetDetails.length,
          };
        }),
      };
    });
  }, []);

  const buildExerciseEntry = useCallback(
    (exerciseData, overrideId) => {
      const exType = exerciseData.type || 'weight_reps';
      const timed = exType === 'timed';
      const baseRest = settings.defaultRestTime || 60;
      const newEx = {
        id: overrideId ?? Date.now() + Math.random(),
        exerciseId: exerciseData.id,
        name: exerciseData.name,
        muscleGroup: exerciseData.muscleGroup,
        equipmentType: exerciseData.equipmentType || 'Altro',
        type: exType,
        sets: 1,
        reps: 0,
        weight: 0,
        duration: 0,
        restTime: baseRest,
        setDetails: [{ weight: 0, reps: 0, duration: 0, completed: false }],
      };
      return newEx;
    },
    [settings.defaultRestTime],
  );

  const addExerciseToActiveWorkout = useCallback(() => {
    if (!activeWorkout) return;
    if (!sessionSelectedExercise) {
      Alert.alert('Errore', 'Seleziona un esercizio');
      return;
    }
    const newEx = buildExerciseEntry(sessionSelectedExercise);
    setActiveWorkout((prev) =>
      prev ? { ...prev, exercises: [...prev.exercises, newEx] } : prev,
    );
    setShowAddExerciseInSession(false);
    setSessionSelectedExercise(null);
    setSessionSets('');
    setSessionReps('');
    setSessionWeight('');
    setSessionRestTime('60');
    setSessionDuration('');
  }, [activeWorkout, sessionSelectedExercise, buildExerciseEntry]);

  const addMultipleExercisesToActiveWorkout = useCallback(
    (exerciseList) => {
      if (!activeWorkout || !exerciseList || exerciseList.length === 0) return;
      const newExercises = exerciseList.map((ex) => buildExerciseEntry(ex));
      setActiveWorkout((prev) =>
        prev
          ? { ...prev, exercises: [...prev.exercises, ...newExercises] }
          : prev,
      );
      setShowAddExerciseInSession(false);
    },
    [activeWorkout, buildExerciseEntry],
  );

  const replaceExerciseInActiveWorkout = useCallback(
    (targetId, newExerciseData) => {
      if (!activeWorkout || !targetId || !newExerciseData) return;
      const replacement = buildExerciseEntry(newExerciseData, targetId);
      setActiveWorkout((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises.map((ex) =>
                ex.id === targetId ? replacement : ex,
              ),
            }
          : prev,
      );
      setReplaceTargetExerciseId(null);
      setShowAddExerciseInSession(false);
    },
    [activeWorkout, buildExerciseEntry],
  );

  const openRestTimeModal = useCallback((exerciseId, currentRestTime) => {
    setEditingRestExerciseId(exerciseId);
    setTempRestTime(String(currentRestTime || 60));
    setShowRestTimeModal(true);
  }, []);

  const saveRestTime = useCallback(() => {
    if (!activeWorkout || !editingRestExerciseId) return;

    const newRestTime = parseInt(tempRestTime || '60', 10) || 60;

    setActiveWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === editingRestExerciseId
            ? { ...ex, restTime: newRestTime }
            : ex,
        ),
      };
    });

    setShowRestTimeModal(false);
    setEditingRestExerciseId(null);
    setTempRestTime('');
  }, [activeWorkout, editingRestExerciseId, tempRestTime]);

  const updateTemplateSetDetail = useCallback(
    (exerciseId, setIndex, field, value) => {
      setTemplateWorkout((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;

            return {
              ...ex,
              setDetails: (ex.setDetails || []).map((sd, idx) => {
                if (idx !== setIndex) return sd;

                return { ...sd, [field]: value };
              }),
            };
          }),
        };
      });
    },
    [],
  );

  const addSetToTemplateExercise = useCallback((exerciseId) => {
    setTemplateWorkout((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;

          const isTimeExercise =
            ex.type === 'time' || ex.type === 'plank' || ex.type === 'cardio';

          const newSet = {
            weight: isTimeExercise ? 0 : 0,
            reps: isTimeExercise ? 0 : 0,
            duration: isTimeExercise ? 0 : 0,
            completed: false,
          };

          return {
            ...ex,
            setDetails: [...(ex.setDetails || []), newSet],
          };
        }),
      };
    });
  }, []);

  const deleteSetFromTemplateExercise = useCallback(
    (exerciseId, setIndex) => {
      if (!templateWorkout) return;
      Alert.alert(
        'Elimina serie',
        `Sei sicuro di voler eliminare la serie ${setIndex + 1}?`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Elimina',
            style: 'destructive',
            onPress: () => {
              setTemplateWorkout((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  exercises: prev.exercises.map((ex) => {
                    if (ex.id !== exerciseId) return ex;
                    return {
                      ...ex,
                      setDetails: (ex.setDetails || []).filter(
                        (_, idx) => idx !== setIndex,
                      ),
                    };
                  }),
                };
              });
            },
          },
        ],
      );
    },
    [templateWorkout],
  );

  const deleteExerciseFromTemplate = useCallback(
    (exerciseId) => {
      if (!templateWorkout) return;
      const targetEx = templateWorkout.exercises.find(
        (ex) => ex.id === exerciseId,
      );
      const exName = targetEx ? ` "${targetEx.name}"` : '';
      Alert.alert(
        'Elimina esercizio',
        `Sei sicuro di voler eliminare l'esercizio${exName}?`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Elimina',
            style: 'destructive',
            onPress: () => {
              setTemplateWorkout((prev) =>
                prev
                  ? {
                      ...prev,
                      exercises: prev.exercises.filter(
                        (ex) => ex.id !== exerciseId,
                      ),
                    }
                  : prev,
              );
            },
          },
        ],
      );
    },
    [templateWorkout],
  );

  const addExerciseToTemplate = useCallback(() => {
    if (!templateWorkout || !templateSelectedExercise) {
      Alert.alert('Errore', 'Seleziona un esercizio');
      return;
    }
    const exType = templateSelectedExercise.type || 'weight_reps';
    const timed = exType === 'timed';
    const repsOnly = exType === 'reps';
    const exercise = {
      id: Date.now(),
      exerciseId: templateSelectedExercise.id,
      name: templateSelectedExercise.name,
      muscleGroup: templateSelectedExercise.muscleGroup,
      equipmentType: templateSelectedExercise.equipmentType || 'Altro',
      type: exType,
      sets: 1,
      reps: 0,
      weight: 0,
      duration: 0,
      restTime: settings.defaultRestTime || 60,
      setDetails: [{ weight: 0, reps: 0, duration: 0, completed: false }],
    };
    setTemplateWorkout((prev) =>
      prev ? { ...prev, exercises: [...prev.exercises, exercise] } : prev,
    );
    setTemplateSelectedExercise(null);
    setTemplateSets('');
    setTemplateReps('');
    setTemplateWeight('');
    setTemplateRestTime('60');
    setTemplateDuration('');
    setShowAddExerciseInTemplate(false);
  }, [templateWorkout, templateSelectedExercise, settings.defaultRestTime]);

  const addMultipleExercisesToTemplate = useCallback(
    (exerciseList) => {
      if (!templateWorkout || !exerciseList || exerciseList.length === 0)
        return;
      const newExercises = exerciseList.map((ex) => {
        const exType = ex.type || 'weight_reps';
        const timed = exType === 'timed';
        return {
          id: Date.now() + Math.random(),
          exerciseId: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          equipmentType: ex.equipmentType || 'Altro',
          type: exType,
          sets: 1,
          reps: 0,
          weight: 0,
          duration: 0,
          restTime: settings.defaultRestTime || 60,
          setDetails: [{ weight: 0, reps: 0, duration: 0, completed: false }],
        };
      });
      setTemplateWorkout((prev) =>
        prev
          ? { ...prev, exercises: [...prev.exercises, ...newExercises] }
          : prev,
      );
      setShowAddExerciseInTemplate(false);
    },
    [templateWorkout, settings.defaultRestTime],
  );

  const finishWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    if (!authToken) {
      Alert.alert('Errore', 'Effettua il login per salvare il workout');
      return;
    }

    const normalizedExercises = activeWorkout.exercises.map((ex) => {
      const exType = ex.type || 'weight_reps';
      const timed = exType === 'timed';
      const repsOnly = exType === 'reps';
      const details = (ex.setDetails || []).map((sd) => ({
        ...sd,
        weight: timed || repsOnly ? 0 : parseWorkoutNumber(sd.weight),
        reps: timed ? 0 : parseWorkoutNumber(sd.reps),
        duration: timed ? parseWorkoutNumber(sd.duration) : 0,
      }));
      const first = details[0] || {};

      return {
        ...ex,
        sets: details.length,
        reps: timed ? 0 : first.reps || 0,
        weight: timed || repsOnly ? 0 : first.weight || 0,
        duration: timed ? first.duration || 0 : 0,
        setDetails: details,
      };
    });

    const recordId = Date.now();
    const recordDate = new Date().toISOString();
    const prResult = detectPersonalRecords(
      normalizedExercises,
      history,
      recordDate,
      recordId,
    );
    const earnedBadges = prResult.badges;

    const workoutRecord = {
      id: recordId,
      workoutId: activeWorkout.id,
      name: activeWorkout.name,
      exercises: prResult.exercises,
      startTime: activeWorkout.startTime,
      endTime: new Date(),
      date: recordDate,
      durationSeconds: workoutSeconds,
      prBadges: earnedBadges,
    };

    try {
      const serverData = await createWorkoutRecord(authToken, workoutRecord);
      applyServerData(serverData);

      setActiveWorkout(null);
      setWorkoutSeconds(0);
      setTimer(0);
      setTimerActive(false);
      setFocusedMuscle(null);
      setCurrentScreen('home');

      Alert.alert(
        'Completato!',
        earnedBadges.length > 0
          ? `Workout salvato nello storico. Nuovi badge ottenuti: ${earnedBadges.length}`
          : 'Workout salvato nello storico',
      );
    } catch (error) {
      Alert.alert(
        'Errore workout',
        error.message || 'Salvataggio workout non riuscito',
      );
    }
  }, [activeWorkout, history, workoutSeconds, authToken, applyServerData]);

  const openHistoryDetail = useCallback((record) => {
    setSelectedHistoryRecord(record);
    setShowHistoryDetailModal(true);
  }, []);

  const openEditHistory = useCallback((record) => {
    const clone = JSON.parse(JSON.stringify(record));
    setEditingHistoryRecord(clone);
    setShowEditHistoryModal(true);
  }, []);

  const deleteHistoryRecord = useCallback((id) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateHistorySetDetail = useCallback(
    (exerciseId, setIndex, field, value) => {
      if (!editingHistoryRecord) return;

      setEditingHistoryRecord((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;

            return {
              ...ex,
              setDetails: ex.setDetails.map((sd, idx) => {
                if (idx !== setIndex) return sd;

                if (field === 'completed') {
                  return { ...sd, completed: !sd.completed };
                }

                let parsedValue = value;
                if (field === 'reps' || field === 'duration') {
                  parsedValue = parseInt(value || '0', 10) || 0;
                }
                if (field === 'weight') {
                  parsedValue = parseFloat(value || '0') || 0;
                }

                return { ...sd, [field]: parsedValue };
              }),
            };
          }),
        };
      });
    },
    [],
  );

  const updateHistoryGeneralNote = useCallback(
    async (recordId, noteText) => {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === recordId ? { ...item, generalNote: noteText } : item,
        ),
      );
      if (selectedHistoryRecord && selectedHistoryRecord.id === recordId) {
        setSelectedHistoryRecord((prev) =>
          prev ? { ...prev, generalNote: noteText } : prev,
        );
      }

      if (!authToken) return;
      try {
        await updateWorkoutNotes(authToken, recordId, noteText);
      } catch (error) {
        console.error(
          'Errore salvataggio nota workout:',
          error.message || error,
        );
      }
    },
    [selectedHistoryRecord, authToken],
  );

  const saveEditedHistory = useCallback(() => {
    if (!editingHistoryRecord) return;
    setHistory((prev) =>
      prev.map((item) =>
        item.id === editingHistoryRecord.id ? editingHistoryRecord : item,
      ),
    );
    setShowEditHistoryModal(false);
    setEditingHistoryRecord(null);
  }, [editingHistoryRecord]);

  const openProfileEdit = useCallback(() => {
    setProfileName(profileName || user?.name || '');
    setProfileGender(normalizeProfileGender(profileGender || user?.gender));
    setProfileHeight(
      profileHeight || (user?.height ? String(user.height) : ''),
    );
    setProfileWeight(
      profileWeight || (user?.weight ? String(user.weight) : ''),
    );
    setShowEditProfileModal(true);
  }, [profileName, profileGender, profileHeight, profileWeight, user]);

  const openCoachProfileEdit = useCallback(() => {
    setProfileTrainingGoal(
      user?.trainingGoal || profileTrainingGoal || 'GENERALE',
    );
    setProfileTrainingLevel(
      user?.trainingLevel || profileTrainingLevel || 'PRINCIPIANTE',
    );
    setProfileTargetWorkoutDays(
      String(user?.targetWorkoutDays || profileTargetWorkoutDays || 3),
    );
    setShowEditCoachProfileModal(true);
  }, [
    user,
    profileTrainingGoal,
    profileTrainingLevel,
    profileTargetWorkoutDays,
  ]);

  const saveProfile = useCallback(async () => {
    const profile = {
      name: profileName.trim(),
      gender: normalizeProfileGender(profileGender),
      height: profileHeight ? parseInt(profileHeight, 10) : null,
      weight: profileWeight ? parseFloat(profileWeight) : null,
    };

    try {
      const response = authToken
        ? await updateProfile(authToken, profile)
        : null;
      const updatedUser = response?.user || {
        ...(user || {}),
        email: user?.email || email,
        ...profile,
      };
      setUser(updatedUser);
      applyUserProfile(updatedUser);
      setShowEditProfileModal(false);
    } catch (error) {
      Alert.alert(
        'Errore profilo',
        error.message || 'Salvataggio non riuscito',
      );
    }
  }, [
    user,
    email,
    profileName,
    profileGender,
    profileHeight,
    profileWeight,
    authToken,
  ]);

  const saveCoachProfile = useCallback(
    async (coachProfile = {}) => {
      const profile = {
        trainingGoal: coachProfile.trainingGoal ?? profileTrainingGoal,
        trainingLevel: coachProfile.trainingLevel ?? profileTrainingLevel,
        targetWorkoutDays: normalizeTargetWorkoutDays(
          coachProfile.targetWorkoutDays ?? profileTargetWorkoutDays,
        ),
      };

      try {
        const response = authToken
          ? await updateProfile(authToken, profile)
          : null;
        const updatedUser = response?.user || {
          ...(user || {}),
          email: user?.email || email,
          ...profile,
        };
        setUser(updatedUser);
        applyUserProfile(updatedUser);
        setShowEditCoachProfileModal(false);
      } catch (error) {
        Alert.alert(
          'Errore profilo coach',
          error.message || 'Salvataggio non riuscito',
        );
      }
    },
    [
      user,
      email,
      profileTrainingGoal,
      profileTrainingLevel,
      profileTargetWorkoutDays,
      authToken,
    ],
  );

  // Memoized grouped exercises — avoids re-iterating 200+ exercises on every render
  const groupExercisesByMuscle = useMemo(() => {
    const grouped = {};
    exercises.forEach((ex) => {
      if (!grouped[ex.muscleGroup]) grouped[ex.muscleGroup] = [];
      grouped[ex.muscleGroup].push(ex);
    });
    return grouped;
  }, [exercises]);

  const activeWorkouts = useMemo(
    () => workouts.filter((workout) => workout.active !== false),
    [workouts],
  );

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={styles.header.backgroundColor}
      />
      {currentScreen === 'login' && (
        <LoginScreen
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          handleLogin={handleLogin}
          handleRegister={handleRegister}
          authLoading={authLoading}
        />
      )}
      {currentScreen === 'home' && (
        <HomeScreen
          workouts={activeWorkouts}
          formatDate={formatDate}
          handleLogout={handleLogout}
          startWorkout={startWorkout}
          deleteWorkout={deleteWorkout}
          setSelectedWorkout={setSelectedWorkout}
          setShowViewWorkout={setShowViewWorkout}
          openTemplateEditor={openTemplateEditor}
          createWorkout={createWorkout}
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          activeWorkout={activeWorkout}
        />
      )}
      {currentScreen === 'coach' && (
        <CoachScreen
          authToken={authToken}
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
        />
      )}
      {currentScreen === 'activeWorkout' && (
        <ActiveWorkoutScreen
          activeWorkout={activeWorkout}
          setActiveWorkout={setActiveWorkout}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          workoutSeconds={workoutSeconds}
          setWorkoutSeconds={setWorkoutSeconds}
          formatWorkoutTime={formatWorkoutTime}
          setSessionSelectedExercise={setSessionSelectedExercise}
          setSessionSets={setSessionSets}
          setSessionReps={setSessionReps}
          setSessionWeight={setSessionWeight}
          setSessionRestTime={setSessionRestTime}
          setSessionDuration={setSessionDuration}
          setShowAddExerciseInSession={setShowAddExerciseInSession}
          timerActive={timerActive}
          setTimerActive={setTimerActive}
          timer={timer}
          setTimer={setTimer}
          adjustTimer={adjustTimer}
          skipTimer={skipTimer}
          deleteExerciseFromActiveWorkout={deleteExerciseFromActiveWorkout}
          openRestTimeModal={openRestTimeModal}
          deleteSetFromExercise={deleteSetFromExercise}
          updateSetDetail={updateSetDetail}
          toggleSetComplete={toggleSetComplete}
          addSetToExercise={addSetToExercise}
          finishWorkout={finishWorkout}
          setCurrentScreen={setCurrentScreen}
          openExerciseDescription={openExerciseDescription}
          setReplaceTargetExerciseId={setReplaceTargetExerciseId}
        />
      )}
      {currentScreen === 'editTemplate' && (
        <EditTemplateScreen
          templateWorkout={templateWorkout}
          setTemplateWorkout={setTemplateWorkout}
          setCurrentScreen={setCurrentScreen}
          saveTemplateWorkout={saveTemplateWorkout}
          setTemplateSelectedExercise={setTemplateSelectedExercise}
          setTemplateSets={setTemplateSets}
          setTemplateReps={setTemplateReps}
          setTemplateWeight={setTemplateWeight}
          setTemplateRestTime={setTemplateRestTime}
          setTemplateDuration={setTemplateDuration}
          setShowAddExerciseInTemplate={setShowAddExerciseInTemplate}
          deleteExerciseFromTemplate={deleteExerciseFromTemplate}
          deleteSetFromTemplateExercise={deleteSetFromTemplateExercise}
          updateTemplateSetDetail={updateTemplateSetDetail}
          addSetToTemplateExercise={addSetToTemplateExercise}
          openExerciseDescription={openExerciseDescription}
        />
      )}
      {currentScreen === 'history' && (
        <HistoryScreen
          history={history}
          openEditHistory={openEditHistory}
          deleteHistoryRecord={deleteHistoryRecord}
          openHistoryDetail={openHistoryDetail}
          formatWorkoutTime={formatWorkoutTime}
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
        />
      )}
      {currentScreen === 'exercises' && (
        <ExercisesScreen
          groupExercisesByMuscle={groupExercisesByMuscle}
          setShowCustomExercise={setShowCustomExercise}
          openRenameCustomExercise={openRenameCustomExercise}
          deleteCustomExercise={deleteCustomExercise}
          formatDate={formatDate}
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          openExerciseDescription={openExerciseDescription}
          exercises={exercises}
        />
      )}
      {currentScreen === 'profile' && (
        <ProfileScreen
          user={user}
          profileName={profileName}
          profileSurname={profileSurname}
          profileBirthDate={profileBirthDate}
          profileGender={profileGender}
          profileAge={profileAge}
          profileHeight={profileHeight}
          profileWeight={profileWeight}
          profileTrainingGoal={profileTrainingGoal}
          profileTrainingLevel={profileTrainingLevel}
          profileTargetWorkoutDays={profileTargetWorkoutDays}
          openProfileEdit={openProfileEdit}
          openCoachProfileEdit={openCoachProfileEdit}
          history={history}
          workouts={workouts}
          getTotalHours={getTotalHours}
          getCompletedSets={getCompletedSets}
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          badges={badges}
          handleLogout={handleLogout}
        />
      )}

      <CreateWorkoutModal
        showCreateWorkout={showCreateWorkout}
        setShowCreateWorkout={setShowCreateWorkout}
        workoutName={workoutName}
        setWorkoutName={setWorkoutName}
        createWorkout={createWorkout}
      />
      <ViewWorkoutModal
        showViewWorkout={showViewWorkout}
        setShowViewWorkout={setShowViewWorkout}
        selectedWorkout={selectedWorkout}
      />
      <CustomExerciseModal
        showCustomExercise={showCustomExercise}
        setShowCustomExercise={setShowCustomExercise}
        customExerciseName={customExerciseName}
        setCustomExerciseName={setCustomExerciseName}
        customMuscleGroup={customMuscleGroup}
        setCustomMuscleGroup={setCustomMuscleGroup}
        customExerciseType={customExerciseType}
        setCustomExerciseType={setCustomExerciseType}
        customExerciseDescription={customExerciseDescription}
        setCustomExerciseDescription={setCustomExerciseDescription}
        exercises={exercises}
        createCustomExercise={createCustomExercise}
      />
      <RenameCustomExerciseModal
        visible={showRenameCustomExercise}
        exercise={renamingCustomExercise}
        onClose={() => {
          setShowRenameCustomExercise(false);
          setRenamingCustomExercise(null);
        }}
        onSave={renameCustomExercise}
      />
      <RestTimeModal
        showRestTimeModal={showRestTimeModal}
        setShowRestTimeModal={setShowRestTimeModal}
        tempRestTime={tempRestTime}
        setTempRestTime={setTempRestTime}
        setEditingRestExerciseId={setEditingRestExerciseId}
        saveRestTime={saveRestTime}
      />
      <EditProfileModal
        showEditProfileModal={showEditProfileModal}
        setShowEditProfileModal={setShowEditProfileModal}
        profileName={profileName}
        setProfileName={setProfileName}
        profileGender={profileGender}
        setProfileGender={setProfileGender}
        profileHeight={profileHeight}
        setProfileHeight={setProfileHeight}
        profileWeight={profileWeight}
        setProfileWeight={setProfileWeight}
        saveProfile={saveProfile}
      />
      <EditCoachProfileModal
        visible={showEditCoachProfileModal}
        onClose={() => setShowEditCoachProfileModal(false)}
        profileTrainingGoal={profileTrainingGoal}
        profileTrainingLevel={profileTrainingLevel}
        profileTargetWorkoutDays={profileTargetWorkoutDays}
        saveCoachProfile={saveCoachProfile}
      />
      <HistoryDetailModal
        showHistoryDetailModal={showHistoryDetailModal}
        setShowHistoryDetailModal={setShowHistoryDetailModal}
        selectedHistoryRecord={selectedHistoryRecord}
        formatWorkoutTime={formatWorkoutTime}
        updateHistoryGeneralNote={updateHistoryGeneralNote}
      />
      <EditHistoryModal
        showEditHistoryModal={showEditHistoryModal}
        setShowEditHistoryModal={setShowEditHistoryModal}
        editingHistoryRecord={editingHistoryRecord}
        setEditingHistoryRecord={setEditingHistoryRecord}
        updateHistorySetDetail={updateHistorySetDetail}
        saveEditedHistory={saveEditedHistory}
        formatWorkoutTime={formatWorkoutTime}
      />
      <AddExerciseInSessionModal
        showAddExerciseInSession={showAddExerciseInSession}
        setShowAddExerciseInSession={setShowAddExerciseInSession}
        groupExercisesByMuscle={groupExercisesByMuscle}
        sessionSelectedExercise={sessionSelectedExercise}
        setSessionSelectedExercise={setSessionSelectedExercise}
        sessionSets={sessionSets}
        setSessionSets={setSessionSets}
        sessionReps={sessionReps}
        setSessionReps={setSessionReps}
        sessionWeight={sessionWeight}
        setSessionWeight={setSessionWeight}
        sessionRestTime={sessionRestTime}
        setSessionRestTime={setSessionRestTime}
        sessionDuration={sessionDuration}
        setSessionDuration={setSessionDuration}
        addExerciseToActiveWorkout={addExerciseToActiveWorkout}
        addMultipleExercisesToActiveWorkout={
          addMultipleExercisesToActiveWorkout
        }
        replaceExerciseInActiveWorkout={replaceExerciseInActiveWorkout}
        replaceTargetExerciseId={replaceTargetExerciseId}
        setReplaceTargetExerciseId={setReplaceTargetExerciseId}
        openExerciseDescription={openExerciseDescription}
        exercises={exercises}
        history={history}
      />
      <AddExerciseInTemplateModal
        showAddExerciseInTemplate={showAddExerciseInTemplate}
        setShowAddExerciseInTemplate={setShowAddExerciseInTemplate}
        groupExercisesByMuscle={groupExercisesByMuscle}
        templateSelectedExercise={templateSelectedExercise}
        setTemplateSelectedExercise={setTemplateSelectedExercise}
        setTemplateSets={setTemplateSets}
        setTemplateReps={setTemplateReps}
        setTemplateWeight={setTemplateWeight}
        setTemplateRestTime={setTemplateRestTime}
        setTemplateDuration={setTemplateDuration}
        addExerciseToTemplate={addExerciseToTemplate}
        addMultipleExercisesToTemplate={addMultipleExercisesToTemplate}
        openExerciseDescription={openExerciseDescription}
        exercises={exercises}
        history={history}
      />

      <ExerciseDescriptionModal
        visible={showDescriptionModal}
        exercise={selectedDescriptionExercise}
        history={history}
        onClose={handleCloseDescriptionModal}
      />

      {/* Floating Active Workout Bar — memoized component, re-renders only on workoutSeconds change */}
      <FloatingWorkoutBar
        activeWorkout={activeWorkout}
        currentScreen={currentScreen}
        workoutSeconds={workoutSeconds}
        isDarkMode={isDarkMode}
        formatWorkoutTime={formatWorkoutTime}
        onPress={handleGoToActiveWorkout}
      />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <MainApp />
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
