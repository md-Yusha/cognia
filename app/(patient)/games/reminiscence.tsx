import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Volume2, Heart, RefreshCw, Home, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { ResponsiveContainer } from '../../../src/components/ui/ResponsiveContainer';
import { Button } from '../../../src/components/ui/Button';
import { VoiceButton } from '../../../src/components/ui/VoiceButton';
import { usePatientStore } from '../../../src/store/usePatientStore';
import { speakPrompt } from '../../../src/services/ttsService';
import { subscribeToFamilyMemories, DEFAULT_NER_MEMORIES } from '../../../src/services/familyMemoryService';
import { FamilyMemoryItem } from '../../../src/types';
import * as Haptics from 'expo-haptics';

export default function ReminiscenceGameScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { patient, recordGameSession } = usePatientStore();

  const [memories, setMemories] = useState<FamilyMemoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);

  // Load family memories
  useEffect(() => {
    const patientId = patient?.id || 'demo_patient';
    const unsub = subscribeToFamilyMemories(patientId, (list) => {
      if (list && list.length > 0) {
        setMemories(list);
      }
    });
    return () => unsub();
  }, [patient?.id]);

  // Generate options when current memory changes
  useEffect(() => {
    if (memories.length === 0) return;
    const current = memories[currentIndex % memories.length];
    if (!current) return;

    setStartTime(Date.now());
    setIsAnswered(false);
    setSelectedOption(null);

    // Prompt elder with voice
    const questionText = `Look at this family photograph. Who or what memory is this?`;
    speakPrompt(questionText, (patient?.preferredLanguage || 'en') as any);

    // Pick 3 options: 1 correct + 2 distractors
    const correct = current.title;
    const distractors = memories
      .map((m) => m.title)
      .filter((title) => title !== correct);

    // If not enough distractors in custom, pull from defaults
    DEFAULT_NER_MEMORIES.forEach((def) => {
      if (distractors.length < 2 && def.title !== correct && !distractors.includes(def.title)) {
        distractors.push(def.title);
      }
    });

    const shuffled = [correct, ...distractors.slice(0, 2)].sort(() => 0.5 - Math.random());
    setOptions(shuffled);
  }, [currentIndex, memories, patient?.preferredLanguage]);

  const handleSelectOption = (choice: string) => {
    if (isAnswered) return;

    const reactionTime = Date.now() - startTime;
    setReactionTimes((prev) => [...prev, reactionTime]);

    const current = memories[currentIndex % memories.length];
    const correct = choice === current.title;
    setIsAnswered(true);
    setSelectedOption(choice);
    setIsCorrect(correct);

    if (correct) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setScore((prev) => prev + 1);
      speakPrompt(`Wonderful memory! That is indeed ${current.title}. ${current.clue}`, (patient?.preferredLanguage || 'en') as any);
    } else {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      speakPrompt(`This is actually ${current.title}. ${current.clue}`, (patient?.preferredLanguage || 'en') as any);
    }
  };

  const handleNext = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    if (currentIndex + 1 >= Math.min(memories.length, 4)) {
      finishGame();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const finishGame = () => {
    setIsGameOver(true);
    const totalTrials = Math.min(memories.length, 4) || 1;
    const accuracy = Math.round((score / totalTrials) * 100);
    const avgReactionTime = reactionTimes.length 
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) 
      : 1600;

    recordGameSession({
      gameType: 'reminiscence_match',
      difficultyTier: 'easy',
      score: score * 25,
      accuracy,
      averageReactionTimeMs: avgReactionTime,
      hesitationCount: 0,
      totalTrials,
      successfulTrials: score,
      durationSeconds: 60,
    });
  };

  const restartGame = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setScore(0);
    setCurrentIndex(0);
    setIsGameOver(false);
    setIsAnswered(false);
    setSelectedOption(null);
  };

  const currentMemory = memories[currentIndex % memories.length];

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#FAF7F2' }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 }}
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
            <Text className="text-[#475569] font-bold ml-1.5 text-sm" style={{ fontFamily: 'Nunito-Bold' }}>
              {t('back')}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center bg-[#FFF1F2] border border-[#FECDD3] px-3 py-1 rounded-full">
            <Heart size={14} color="#E11D48" />
            <Text className="text-[#9F1239] text-xs font-bold ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
              Family Album
            </Text>
          </View>
        </View>

        {isGameOver ? (
          /* Game Finished Card */
          <View 
            className="bg-white border-2 border-[#FFE4E6] rounded-[32px] p-7 items-center mb-6"
            style={{
              shadowColor: '#BE123C',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <View className="w-20 h-20 bg-[#FFF1F2] rounded-3xl items-center justify-center mb-3 border border-[#FECDD3]">
              <Sparkles size={42} color="#E11D48" />
            </View>

            <Text className="text-3xl text-[#1E293B] font-bold text-center" style={{ fontFamily: 'Nunito-Bold' }}>
              Wonderful Memories!
            </Text>

            <Text className="text-[#64748B] text-base font-semibold mt-1 text-center" style={{ fontFamily: 'Nunito-SemiBold' }}>
              You remembered {score} of {Math.min(memories.length, 4)} family memories accurately.
            </Text>

            <View className="flex-row gap-3 mt-6 w-full">
              <View className="flex-1">
                <Button
                  title="Play Again"
                  variant="primary"
                  size="large"
                  icon={<RefreshCw size={16} color="#FFFFFF" />}
                  onPress={restartGame}
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
        ) : currentMemory ? (
          <View>
            {/* Memory Photo Card */}
            <View 
              className="bg-white border-2 border-[#CBD5E1] rounded-[28px] overflow-hidden mb-5"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {currentMemory.imageUrl ? (
                <Image
                  source={{ uri: currentMemory.imageUrl }}
                  style={{ width: '100%', height: 220, resizeMode: 'cover' }}
                />
              ) : (
                <View style={{ width: '100%', height: 200, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={64} color="#FDA4AF" />
                </View>
              )}

              <View className="p-4 bg-[#FAF8F5] border-t border-[#E2DDD5]">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs uppercase font-bold text-[#E11D48] tracking-wider" style={{ fontFamily: 'Nunito-Bold' }}>
                    {currentMemory.relationship} • {currentMemory.dateYear || 'Memory'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => speakPrompt(`Clue: ${currentMemory.clue}`, (patient?.preferredLanguage || 'en') as any)}
                    className="flex-row items-center bg-white border border-[#CBD5E1] px-2.5 py-1 rounded-full"
                  >
                    <Volume2 size={13} color="#16704A" />
                    <Text className="text-xs font-bold text-[#16704A] ml-1">Hear Clue</Text>
                  </TouchableOpacity>
                </View>

                {isAnswered && (
                  <Text className="text-sm text-[#334155] font-semibold mt-2.5 bg-white p-3 rounded-xl border border-[#E2DDD5]" style={{ fontFamily: 'Nunito-SemiBold' }}>
                    💡 {currentMemory.clue}
                  </Text>
                )}
              </View>
            </View>

            {/* Question Text */}
            <Text className="text-xl text-[#1E293B] font-bold text-center mb-3" style={{ fontFamily: 'Nunito-Bold' }}>
              Who or what is this photo?
            </Text>

            {/* Answer Choices */}
            <View className="gap-3 mb-5">
              {options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isThisCorrect = option === currentMemory.title;

                let cardBg = 'bg-white border-[#CBD5E1]';
                let textColor = 'text-[#1E293B]';

                if (isAnswered) {
                  if (isThisCorrect) {
                    cardBg = 'bg-[#F0FDF4] border-[#86EFAC]';
                    textColor = 'text-[#166534]';
                  } else if (isSelected && !isThisCorrect) {
                    cardBg = 'bg-[#FEF2F2] border-[#FCA5A5]';
                    textColor = 'text-[#991B1B]';
                  }
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.82}
                    onPress={() => handleSelectOption(option)}
                    disabled={isAnswered}
                    className={`p-4 rounded-2xl border-2 flex-row items-center justify-between ${cardBg}`}
                    style={{
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <Text className={`text-lg font-bold ${textColor}`} style={{ fontFamily: 'Nunito-Bold' }}>
                      {option}
                    </Text>
                    {isAnswered && isThisCorrect && <CheckCircle2 size={20} color="#16A34A" />}
                    {isAnswered && isSelected && !isThisCorrect && <AlertCircle size={20} color="#DC2626" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Next Button */}
            {isAnswered && (
              <View className="mb-4">
                <Button
                  title={currentIndex + 1 >= Math.min(memories.length, 4) ? 'Finish Album' : 'Next Memory'}
                  variant="primary"
                  size="large"
                  onPress={handleNext}
                />
              </View>
            )}
          </View>
        ) : null}
      </ResponsiveContainer>
    </ScrollView>
  );
}
