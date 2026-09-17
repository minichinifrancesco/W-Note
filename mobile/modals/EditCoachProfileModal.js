import React, { useEffect, useState, useCallback } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
} from 'react-native';
import { useEffectiveDark } from '../context/SettingsContext';
import { getStyles, getThemeColors } from '../styles/styles';
import {
  TRAINING_GOAL_OPTIONS,
  TRAINING_LEVEL_OPTIONS,
  getOptionLabel,
} from '../constants/coachProfile';

export default function EditCoachProfileModal({
  visible,
  onClose,
  profileTrainingGoal,
  profileTrainingLevel,
  profileTargetWorkoutDays,
  saveCoachProfile,
}) {
  const isDarkMode = useEffectiveDark();
  const styles = getStyles(isDarkMode);
  const C = getThemeColors(isDarkMode);

  const [openSelect, setOpenSelect] = useState(null);
  const [draftTrainingGoal, setDraftTrainingGoal] = useState(
    profileTrainingGoal || 'GENERALE',
  );
  const [draftTrainingLevel, setDraftTrainingLevel] = useState(
    profileTrainingLevel || 'PRINCIPIANTE',
  );
  const [draftTargetWorkoutDays, setDraftTargetWorkoutDays] = useState(
    String(profileTargetWorkoutDays || 3),
  );

  const updateTargetDays = (nextValue) => {
    const normalizedValue = Math.min(Math.max(nextValue, 1), 7);
    setDraftTargetWorkoutDays(String(normalizedValue));
  };

  const resetDrafts = useCallback(() => {
    setDraftTrainingGoal(profileTrainingGoal || 'GENERALE');
    setDraftTrainingLevel(profileTrainingLevel || 'PRINCIPIANTE');
    setDraftTargetWorkoutDays(String(profileTargetWorkoutDays || 3));
    setOpenSelect(null);
  }, [profileTrainingGoal, profileTrainingLevel, profileTargetWorkoutDays]);

  useEffect(() => {
    if (!visible) return;

    resetDrafts();
  }, [visible, resetDrafts]);

  const renderSelect = ({
    title,
    value,
    options,
    fallback,
    onChange,
    selectKey,
  }) => {
    const isOpen = openSelect === selectKey;
    const selectedLabel = getOptionLabel(options, value, fallback);

    return (
      <View style={{ marginBottom: 12 }}>
        <Text
          style={{
            color: C.textDark,
            fontSize: 14,
            fontWeight: '700',
            marginBottom: 6,
          }}
        >
          {title}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setOpenSelect(isOpen ? null : selectKey)}
          style={{
            minHeight: 46,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isOpen ? '#86B749' : C.border,
            backgroundColor: C.card,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: C.textDark,
              fontSize: 15,
              fontWeight: '700',
              flex: 1,
            }}
          >
            {selectedLabel}
          </Text>

          <Text
            style={{
              color: '#86B749',
              fontSize: 13,
              fontWeight: '800',
              marginLeft: 10,
            }}
          >
            {isOpen ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {isOpen ? (
          <View
            style={{
              marginTop: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.card,
              overflow: 'hidden',
            }}
          >
            {options.map((option, index) => {
              const isSelected = value === option.value;
              const isLast = index === options.length - 1;

              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.8}
                  onPress={() => {
                    onChange(option.value);
                    setOpenSelect(null);
                  }}
                  style={{
                    minHeight: 42,
                    paddingHorizontal: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: C.border,
                    backgroundColor: isSelected
                      ? 'rgba(134, 183, 73, 0.18)'
                      : C.card,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? '#86B749' : C.textDark,
                      fontSize: 14,
                      fontWeight: isSelected ? '800' : '600',
                    }}
                  >
                    {option.label}
                  </Text>

                  {isSelected ? (
                    <Text
                      style={{
                        color: '#86B749',
                        fontSize: 14,
                        fontWeight: '900',
                      }}
                    >
                      ✓
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.modalContentLarge, { maxHeight: '82%' }]}>
            <Text style={styles.modalTitle}>Modifica Profilo Coach</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {renderSelect({
                title: 'Obiettivo',
                value: draftTrainingGoal,
                options: TRAINING_GOAL_OPTIONS,
                fallback: 'Generale',
                onChange: setDraftTrainingGoal,
                selectKey: 'goal',
              })}

              {renderSelect({
                title: 'Livello',
                value: draftTrainingLevel,
                options: TRAINING_LEVEL_OPTIONS,
                fallback: 'Principiante',
                onChange: setDraftTrainingLevel,
                selectKey: 'level',
              })}

              <Text
                style={{
                  color: C.textDark,
                  fontSize: 14,
                  fontWeight: '700',
                  marginBottom: 8,
                }}
              >
                Giorni target a settimana
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    {
                      width: 48,
                      height: 48,
                      padding: 0,
                      marginBottom: 0,
                      justifyContent: 'center',
                    },
                  ]}
                  onPress={() =>
                    updateTargetDays(Number(draftTargetWorkoutDays || 3) - 1)
                  }
                >
                  <Text style={styles.secondaryButtonText}>-</Text>
                </TouchableOpacity>

                <Text
                  style={{
                    color: C.textDark,
                    fontSize: 18,
                    fontWeight: '800',
                  }}
                >
                  {draftTargetWorkoutDays || 3}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    {
                      width: 48,
                      height: 48,
                      padding: 0,
                      marginBottom: 0,
                      justifyContent: 'center',
                    },
                  ]}
                  onPress={() =>
                    updateTargetDays(Number(draftTargetWorkoutDays || 3) + 1)
                  }
                >
                  <Text style={styles.secondaryButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.modalButtonFlex]}
                onPress={() => {
                  Keyboard.dismiss();
                  resetDrafts();
                  onClose();
                }}
              >
                <Text style={styles.secondaryButtonText}>Annulla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, styles.modalButtonFlex]}
                onPress={() => {
                  Keyboard.dismiss();
                  saveCoachProfile({
                    trainingGoal: draftTrainingGoal,
                    trainingLevel: draftTrainingLevel,
                    targetWorkoutDays: draftTargetWorkoutDays,
                  });
                }}
              >
                <Text style={styles.primaryButtonText}>Salva</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
