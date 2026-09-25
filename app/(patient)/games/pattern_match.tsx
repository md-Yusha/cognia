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

interface PatternItem {
  id: string;
  emoji: string;
  label: string;
}

const MOTIFS: PatternItem[] = [
  { id: 'bamboo', emoji: '🎋', label: 'Bamboo' },
  { id: 'peacock', emoji: '🦚', label: 'Peacock' },
  { id: 'flower', emoji: '🌺', label: 'Kopou Orchid' },
  { id: 'lotus', emoji: '🪷', label: 'Lotus' },
];

export default function PatternMatchGameScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { patient, recordGameSession, updateDifficultyTier } = usePatientStore();

  const currentTier = patient?.difficultyLevels.pattern_recognition || 'easy';

  const [patternSequence, setPatternSequence] = useState<PatternItem[]>([]);
  const [targetMotif, setTargetMotif] = useState<PatternItem | null>(null);
  const [options, setOptions] = useState<PatternItem[]>([]);
  const [selectedOption, setSelectedOption] = useState<PatternItem | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const reactionTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(0);

  const initGame = () => {
    const motifA = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
    let motifB = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
    while (motifB.id === motifA.id) {
      motifB = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
    }

    let sequence: PatternItem[] = [];
    let correct: PatternItem;

    if (currentTier === 'easy') {
      sequence = [motifA, motifB, motifA];
      correct = motifB;
    } else if (currentTier === 'medium') {
      sequence = [motifA, motifA, motifB, motifA, motifA];
      correct = motifB;
    } else {
      let motifC = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
      while (motifC.id === motifA.id || motifC.id === motifB.id) {
        motifC = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
      }
      sequence = [motifA, motifB, motifC, motifA, motifB];
      correct = motifC;
    }

    setPatternSequence(sequence);
    setTargetMotif(correct);

    const optionPool = [...MOTIFS].sort(() => Math.random() - 0.5);
    setOptions(optionPool);
    setSelectedOption(null);
    setIsFinished(false);
    setIsCorrect(null);
    setStartTime(Date.now());
    lastTimeRef.current = Date.now();
    reactionTimesRef.current = [];

    speakPrompt('Look at the pattern of traditional symbols. What comes next in the box?', (i18n.language || 'en') as any);
  };

  useEffect(() => {
    initGame();
  }, [currentTier]);

  const handleSelectOption = async (option: PatternItem) => {
    if (isFinished || !targetMotif) return;

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    const reaction = Date.now() - lastTimeRef.current;
    reactionTimesRef.current.push(reaction);

    setSelectedOption(option);
    const correct = option.id === targetMotif.id;
    setIsCorrect(correct);
    setIsFinished(true);

    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const accuracy = correct ? 100 : 0;

    if (correct) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      speakPrompt('Terrific! You solved the pattern!', (i18n.language || 'en') as any);
    } else {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      speakPrompt('Nice try! Let us try this pattern once more.', (i18n.language || 'en') as any);
    }

    await recordGameSession({
      gameType: 'pattern_recognition',
      difficultyTier: currentTier,
      score: correct ? 100 : 30,
      accuracy,
      averageReactionTimeMs: reaction,
      hesitationCount: correct ? 0 : 1,
      totalTrials: 1,
      successfulTrials: correct ? 1 : 0,
      durationSeconds,
    });

    const adaptResult = await calculateAdaptiveTier('pattern_recognition', currentTier, usePatientStore.getState().recentSessions);
    if (adaptResult.suggestedTier !== currentTier) {
      updateDifficultyTier('pattern_recognition', adaptResult.suggestedTier);
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

          <View className="bg-[#F2ECF8] border border-[#DDD0E8] px-3.5 py-1 rounded-full">
            <Text 
              className="text-[#6A4690] text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Level: {currentTier}
            </Text>
          </View>
        </View>

        {/* Game Title */}
        <View 
          className="bg-[#F8F6FB] rounded-[28px] p-5 border-2 border-[#E3D7EE] mb-5"
          style={{
            shadowColor: '#6A4690',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <Text 
            className="text-2xl text-[#4C1D95] font-bold text-center"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            {t('game_pattern')}
          </Text>
          <Text 
            className="text-[#6D28D9] text-center text-sm font-semibold mt-1"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            Identify the missing traditional handloom motif.
          </Text>
        </View>

        {/* Pattern Display Box */}
        <View 
          className="bg-white rounded-[28px] border-2 border-[#EDE7DD] p-5 mb-5"
          style={{
            shadowColor: '#3A3226',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <Text 
            className="text-base text-[#1E293B] font-bold text-center mb-3"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Complete the sequence:
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            {patternSequence.map((item, idx) => (
              <View
                key={idx}
                className="w-16 h-16 bg-[#FAF8F5] border-2 border-[#CBD5E1] rounded-2xl items-center justify-center p-1.5"
              >
                <Text className="text-3xl">{item.emoji}</Text>
              </View>
            ))}

            {/* Missing Slot */}
            <View className="w-16 h-16 bg-[#FFF8F3] border-2 border-[#D96B27] border-dashed rounded-2xl items-center justify-center p-1.5">
              {selectedOption ? (
                <Text className="text-3xl">{selectedOption.emoji}</Text>
              ) : (
                <Text className="text-2xl font-black text-[#D96B27]">?</Text>
              )}
            </View>
          </View>
        </View>

        {/* Result or Options */}
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
              className="text-[#64748B] text-base font-semibold mt-1 text-center"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              {isCorrect ? 'You solved the pattern sequence flawlessly!' : 'The pattern repeats with alternating motifs.'}
            </Text>

            <View className="flex-row gap-3 mt-6 w-full">
              <View className="flex-1">
                <Button
                  title={t('play_again')}
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
              className="text-base text-[#1E293B] font-bold mb-3 text-center"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Tap the matching motif:
            </Text>
            <View 
              className="flex-row flex-wrap justify-between"
              style={{ rowGap: 12 }}
            >
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.82}
                  onPress={() => handleSelectOption(opt)}
                  className="w-[48%] bg-white border-2 border-[#EDE7DD] p-3.5 rounded-2xl items-center min-h-[96px] justify-center"
                  style={{
                    shadowColor: '#3A3226',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <Text className="text-4xl">{opt.emoji}</Text>
                  <Text 
                    className="text-[#1E293B] text-sm font-bold mt-1 text-center"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Voice Assistant */}
        <View className="items-center">
          <VoiceButton
            compact
            textToSpeak="Look at the repeating pattern and tap the symbol that belongs inside the question mark box."
            label={t('voice_assist')}
          />
        </View>
      </ResponsiveContainer>
    </ScrollView>
  );
}
