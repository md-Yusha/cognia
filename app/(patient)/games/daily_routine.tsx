import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, Trophy, Home } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { VoiceButton } from '../../../src/components/ui/VoiceButton';
import { ResponsiveContainer } from '../../../src/components/ui/ResponsiveContainer';
import { usePatientStore } from '../../../src/store/usePatientStore';
import { calculateAdaptiveTier } from '../../../src/services/adaptiveEngine';
import { speakPrompt } from '../../../src/services/ttsService';
import * as Haptics from 'expo-haptics';

interface RoutineStep {
  id: string;
  order: number;
  title: string;
  emoji: string;
  hint: string;
}

const ALL_ROUTINE_STEPS: RoutineStep[] = [
  { id: 'tea', order: 1, title: 'Drink Warm Assam Tea', emoji: '☕', hint: 'Morning refreshment' },
  { id: 'meds', order: 2, title: 'Take Morning Medicines', emoji: '💊', hint: 'After light breakfast' },
  { id: 'walk', order: 3, title: 'Garden Walk & Sunlight', emoji: '🌳', hint: 'Gentle fresh air' },
  { id: 'lunch', order: 4, title: 'Nutritious Traditional Lunch', emoji: '🍲', hint: 'Midday meal' },
];

export default function DailyRoutineGameScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { patient, recordGameSession, updateDifficultyTier } = usePatientStore();

  const currentTier = patient?.difficultyLevels.daily_routine_recall || 'easy';
  const totalSteps = currentTier === 'easy' ? 3 : 4;

  const [availableSteps, setAvailableSteps] = useState<RoutineStep[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<RoutineStep[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const attemptsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const lastPressTimeRef = useRef<number>(0);

  const initGame = () => {
    const targetSteps = ALL_ROUTINE_STEPS.slice(0, totalSteps);
    const shuffled = [...targetSteps].sort(() => Math.random() - 0.5);
    setAvailableSteps(shuffled);
    setSelectedSequence([]);
    setIsFinished(false);
    setIsCorrect(null);
    setStartTime(Date.now());
    lastPressTimeRef.current = Date.now();
    attemptsRef.current = 0;
    reactionTimesRef.current = [];

    speakPrompt('Tap the cards in the order you do them every day, starting from the morning.', (i18n.language || 'en') as any);
  };

  useEffect(() => {
    initGame();
  }, [totalSteps]);

  const handleSelectStep = (step: RoutineStep) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const now = Date.now();
    reactionTimesRef.current.push(now - lastPressTimeRef.current);
    lastPressTimeRef.current = now;

    const newSeq = [...selectedSequence, step];
    setSelectedSequence(newSeq);
    setAvailableSteps(availableSteps.filter((s) => s.id !== step.id));

    if (newSeq.length === totalSteps) {
      checkSequence(newSeq);
    }
  };

  const checkSequence = async (sequence: RoutineStep[]) => {
    attemptsRef.current++;
    const correct = sequence.every((s, idx) => s.order === idx + 1);
    setIsCorrect(correct);
    setIsFinished(true);

    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const accuracy = correct ? 100 : 50;
    const avgReaction = reactionTimesRef.current.length > 0
      ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
      : 2500;

    if (correct) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      speakPrompt('Excellent! You placed your daily routine in perfect order!', (i18n.language || 'en') as any);
    } else {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      speakPrompt('Good try! Let us arrange them one more time.', (i18n.language || 'en') as any);
    }

    await recordGameSession({
      gameType: 'daily_routine_recall',
      difficultyTier: currentTier,
      score: correct ? 100 : 40,
      accuracy,
      averageReactionTimeMs: avgReaction,
      hesitationCount: correct ? 0 : 2,
      totalTrials: 1,
      successfulTrials: correct ? 1 : 0,
      durationSeconds,
    });

    const adaptResult = await calculateAdaptiveTier('daily_routine_recall', currentTier, usePatientStore.getState().recentSessions);
    if (adaptResult.suggestedTier !== currentTier) {
      updateDifficultyTier('daily_routine_recall', adaptResult.suggestedTier);
    }
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#FAF7F2' }} 
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 64 }}
      keyboardShouldPersistTaps="handled"
    >
      <ResponsiveContainer maxWidth="md">
        {/* Top Header */}
        <View className="flex-row items-center justify-between pt-4 mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.82}
            className="flex-row items-center bg-white border border-[#CBD5E1] px-3.5 py-1.5 rounded-full"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <ArrowLeft size={15} color="#475569" />
            <Text 
              className="text-[#475569] font-bold ml-1.5 text-sm"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Back
            </Text>
          </TouchableOpacity>

          <View className="bg-[#FFF0E6] border border-[#FAD0B6] px-3.5 py-1 rounded-full">
            <Text 
              className="text-[#9A431D] text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Level: {currentTier}
            </Text>
          </View>
        </View>

        {/* Title Card */}
        <View 
          className="bg-[#FFF8F3] rounded-[28px] p-5 border-2 border-[#FBDCC8] mb-5"
          style={{
            shadowColor: '#9A431D',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <Text 
            className="text-2xl text-[#9A431D] font-bold text-center"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            {t('game_routine')}
          </Text>
          <Text 
            className="text-[#B95217] text-center text-sm font-semibold mt-1"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            Arrange your routine cards in morning to afternoon order.
          </Text>
        </View>

        {/* Target Schedule List */}
        <View className="mb-5">
          <Text 
            className="text-base text-[#1E293B] font-bold mb-3"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Your Ordered Schedule:
          </Text>
          <View style={{ gap: 10 }}>
            {Array.from({ length: totalSteps }).map((_, idx) => {
              const step = selectedSequence[idx];
              return (
                <View
                  key={idx}
                  className="p-3.5 rounded-2xl border-2 flex-row items-center min-h-[68px]"
                  style={{
                    backgroundColor: step ? '#FFFFFF' : '#FAF8F5',
                    borderColor: step ? '#FBDCC8' : '#E2DDD5',
                    borderStyle: step ? 'solid' : 'dashed',
                    shadowColor: step ? '#000000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: step ? 0.05 : 0,
                    shadowRadius: 2,
                    elevation: step ? 1 : 0,
                  }}
                >
                  <View 
                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: step ? '#D96B27' : '#CBD5E1' }}
                  >
                    <Text className="text-white font-bold text-sm">{idx + 1}</Text>
                  </View>
                  {step ? (
                    <View className="flex-row items-center flex-1">
                      <Text className="text-3xl mr-2.5">{step.emoji}</Text>
                      <Text 
                        className="text-[#1E293B] text-base font-bold flex-1"
                        style={{ fontFamily: 'Nunito-Bold' }}
                      >
                        {step.title}
                      </Text>
                    </View>
                  ) : (
                    <Text 
                      className="text-[#94A3B8] text-sm font-semibold"
                      style={{ fontFamily: 'Nunito-SemiBold' }}
                    >
                      Tap a step below to place slot #{idx + 1}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Results View or Available Pool */}
        {isFinished ? (
          <View 
            className="p-7 rounded-[32px] border-2 items-center mb-6 bg-white"
            style={{
              borderColor: isCorrect ? '#CCEAD7' : '#FBDCC8',
              shadowColor: isCorrect ? '#16704A' : '#9A431D',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            <View className="w-20 h-20 bg-[#FEF3C7] rounded-3xl items-center justify-center mb-3 border border-[#FDE68A]">
              <Trophy size={40} color={isCorrect ? '#16704A' : '#D96B27'} />
            </View>
            <Text 
              className="text-3xl text-[#1E293B] font-bold text-center"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              {isCorrect ? t('well_done') : t('try_again')}
            </Text>
            <Text 
              className="text-[#64748B] text-base text-center mt-1 font-semibold"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              {isCorrect ? 'You arranged your daily routine in perfect sequence!' : 'Tea comes first in the morning, followed by medicine.'}
            </Text>

            <View className="flex-row gap-3 mt-6 w-full">
              <View className="flex-1">
                <Button
                  title={isCorrect ? t('play_again') : t('try_again')}
                  variant="primary"
                  size="large"
                  icon={<RefreshCw size={16} color="#FFFFFF" />}
                  onPress={initGame}
                />
              </View>
              <View className="flex-1">
                <Button
                  title={t('return_home')}
                  variant="outline"
                  size="large"
                  icon={<Home size={16} color="#475569" />}
                  onPress={() => router.replace('/(patient)/home')}
                />
              </View>
            </View>
          </View>
        ) : (
          <View className="mb-6">
            <Text 
              className="text-base text-[#1E293B] font-bold mb-2.5"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Available Daily Activities:
            </Text>
            <View style={{ gap: 10 }}>
              {availableSteps.map((step) => (
                <TouchableOpacity
                  key={step.id}
                  activeOpacity={0.84}
                  onPress={() => handleSelectStep(step)}
                  className="bg-white border-2 border-[#EDE7DD] p-3.5 rounded-2xl flex-row items-center justify-between"
                  style={{
                    shadowColor: '#3A3226',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <Text className="text-3xl mr-3">{step.emoji}</Text>
                    <View className="flex-1">
                      <Text 
                        className="text-[#1E293B] text-base font-bold"
                        style={{ fontFamily: 'Nunito-Bold' }}
                      >
                        {step.title}
                      </Text>
                      <Text 
                        className="text-[#64748B] text-xs font-semibold"
                        style={{ fontFamily: 'Nunito-SemiBold' }}
                      >
                        {step.hint}
                      </Text>
                    </View>
                  </View>
                  <View className="bg-[#FFF0E6] px-3 py-1.5 rounded-full border border-[#FAD0B6]">
                    <Text className="text-[#9A431D] text-xs font-bold">Tap to Place ➔</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Voice Assistant */}
        <View className="items-center">
          <VoiceButton
            compact
            textToSpeak="Tap the cards in the order you do them every day, starting with morning tea."
            label={t('voice_assist')}
          />
        </View>
      </ResponsiveContainer>
    </ScrollView>
  );
}
