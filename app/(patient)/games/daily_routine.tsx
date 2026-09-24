import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { VoiceButton } from '../../../src/components/ui/VoiceButton';
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
  const { patient, recordGameSession, recentSessions, updateDifficultyTier } = usePatientStore();

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

    const adaptResult = await calculateAdaptiveTier('daily_routine_recall', currentTier, recentSessions);
    if (adaptResult.suggestedTier !== currentTier) {
      updateDifficultyTier('daily_routine_recall', adaptResult.suggestedTier);
    }
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#FAF7F2' }} 
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 50 }}
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between pt-6 mb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center bg-white border border-[#E8E2D8] px-4 py-2 rounded-full shadow-sm"
        >
          <ArrowLeft size={16} color="#4A5568" />
          <Text 
            className="text-[#4A5568] font-bold ml-1.5 text-xs"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Back
          </Text>
        </TouchableOpacity>

        <View className="bg-[#FDF3ED] border border-[#F4D8C9] px-3.5 py-1 rounded-full">
          <Text 
            className="text-[#864127] text-xs font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Level: {currentTier}
          </Text>
        </View>
      </View>

      {/* Title Card */}
      <View 
        className="bg-[#FDF3ED] rounded-[32px] p-6 border border-[#F4D8C9] mb-6"
        style={{
          shadowColor: '#8A4226',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <Text 
          className="text-4xl text-[#864127] text-center"
          style={{ fontFamily: 'PatrickHand' }}
        >
          {t('game_routine')}
        </Text>
        <Text 
          className="text-[#A95838] text-center text-sm font-semibold mt-1"
          style={{ fontFamily: 'Nunito-SemiBold' }}
        >
          Arrange your routine cards in morning to afternoon order.
        </Text>
      </View>

      {/* Target Schedule List */}
      <View className="mb-6">
        <Text 
          className="text-2xl text-[#2B3A30] mb-3"
          style={{ fontFamily: 'PatrickHand' }}
        >
          Your Ordered Schedule:
        </Text>
        <View className="gap-2.5">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const step = selectedSequence[idx];
            return (
              <View
                key={idx}
                className={`p-4 rounded-[26px] border-2 flex-row items-center min-h-[72px] ${
                  step
                    ? 'bg-white border-[#F4D8C9] shadow-sm'
                    : 'bg-[#F8F6F2] border-dashed border-[#DFD8CC]'
                }`}
              >
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${step ? 'bg-[#C87453]' : 'bg-[#EAE4D8]'}`}>
                  <Text className="text-white font-bold text-sm">{idx + 1}</Text>
                </View>
                {step ? (
                  <View className="flex-row items-center flex-1">
                    <Text className="text-3xl mr-3">{step.emoji}</Text>
                    <Text 
                      className="text-[#2D3748] text-base font-bold flex-1"
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      {step.title}
                    </Text>
                  </View>
                ) : (
                  <Text 
                    className="text-[#A0AEC0] text-sm font-semibold"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    Tap a card below to place step {idx + 1}
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
          className={`p-8 rounded-3xl border-2 items-center mb-6 ${isCorrect ? 'bg-white border-[#CDE3D5]' : 'bg-white border-[#F5D8C9]'}`}
          style={{
            shadowColor: '#8C5A40',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
            elevation: 3,
          }}
        >
          <View className="w-18 h-18 bg-[#FAF3E0] rounded-full items-center justify-center mb-2">
            <Trophy size={40} color={isCorrect ? '#59936E' : '#C87453'} />
          </View>
          <Text 
            className="text-3xl text-[#2B3A30] mt-2 text-center"
            style={{ fontFamily: 'PatrickHand' }}
          >
            {isCorrect ? t('well_done') : t('try_again')}
          </Text>
          <Text 
            className="text-[#64748B] text-sm text-center mt-1"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            {isCorrect ? 'You remembered your daily order accurately!' : 'Morning tea comes first, followed by medicine.'}
          </Text>

          <View className="flex-row gap-3 mt-6 w-full">
            <View className="flex-1">
              <Button
                title="Try Again"
                variant="warm"
                size="large"
                icon={<RefreshCw size={18} color="#FFFFFF" />}
                onPress={initGame}
              />
            </View>
            <View className="flex-1">
              <Button
                title="Home"
                variant="outline"
                size="large"
                onPress={() => router.replace('/(patient)/home')}
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="mb-6">
          <Text 
            className="text-2xl text-[#2B3A30] mb-3"
            style={{ fontFamily: 'PatrickHand' }}
          >
            Available Cards (Tap in order):
          </Text>
          <View className="gap-2.5">
            {availableSteps.map((step) => (
              <TouchableOpacity
                key={step.id}
                activeOpacity={0.82}
                onPress={() => handleSelectStep(step)}
                className="bg-white border border-[#E8E2D8] active:border-[#C87453] p-4 rounded-3xl flex-row items-center shadow-sm min-h-[74px]"
              >
                <Text className="text-4xl mr-3">{step.emoji}</Text>
                <View className="flex-1">
                  <Text 
                    className="text-[#2D3748] text-base font-bold"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    {step.title}
                  </Text>
                  <Text 
                    className="text-[#718096] text-xs font-semibold mt-0.5"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    {step.hint}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Voice Assistant */}
      <View className="items-center mt-2">
        <VoiceButton
          textToSpeak="Arrange your daily tasks in order from morning to afternoon."
          label={t('voice_assist')}
        />
      </View>
    </ScrollView>
  );
}
