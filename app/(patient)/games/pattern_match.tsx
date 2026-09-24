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
  const { patient, recordGameSession, recentSessions, updateDifficultyTier } = usePatientStore();

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

    const adaptResult = await calculateAdaptiveTier('pattern_recognition', currentTier, recentSessions);
    if (adaptResult.suggestedTier !== currentTier) {
      updateDifficultyTier('pattern_recognition', adaptResult.suggestedTier);
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

        <View className="bg-[#F5F0F8] border border-[#DDD3E7] px-3.5 py-1 rounded-full">
          <Text 
            className="text-[#503D68] text-xs font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Level: {currentTier}
          </Text>
        </View>
      </View>

      {/* Game Title */}
      <View 
        className="bg-[#F5F0F8] rounded-[32px] p-6 border border-[#DDD3E7] mb-6"
        style={{
          shadowColor: '#503D68',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <Text 
          className="text-4xl text-[#503D68] text-center"
          style={{ fontFamily: 'PatrickHand' }}
        >
          {t('game_pattern')}
        </Text>
        <Text 
          className="text-[#675283] text-center text-sm font-semibold mt-1"
          style={{ fontFamily: 'Nunito-SemiBold' }}
        >
          Identify the missing traditional handloom motif.
        </Text>
      </View>

      {/* Pattern Display */}
      <View 
        className="bg-white rounded-[32px] border border-[#EFEBE4] p-6 mb-6"
        style={{
          shadowColor: '#503D68',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 14,
          elevation: 2,
        }}
      >
        <Text 
          className="text-2xl text-[#2D3748] text-center mb-4"
          style={{ fontFamily: 'PatrickHand' }}
        >
          Complete the sequence:
        </Text>

        <View className="flex-row flex-wrap justify-center items-center gap-2.5">
          {patternSequence.map((item, idx) => (
            <View
              key={idx}
              className="w-16 h-16 bg-[#FAF7F2] border border-[#E8E2D8] rounded-2xl items-center justify-center p-2"
            >
              <Text className="text-3xl">{item.emoji}</Text>
            </View>
          ))}

          {/* Missing Box */}
          <View className="w-16 h-16 bg-[#FDF3ED] border-2 border-[#C87453] border-dashed rounded-2xl items-center justify-center p-2">
            {selectedOption ? (
              <Text className="text-3xl">{selectedOption.emoji}</Text>
            ) : (
              <Text className="text-2xl font-black text-[#C87453]">?</Text>
            )}
          </View>
        </View>
      </View>

      {/* Result or Options */}
      {isFinished ? (
        <View 
          className={`p-8 rounded-3xl border-2 items-center mb-6 ${isCorrect ? 'bg-white border-[#CDE3D5]' : 'bg-white border-[#F5D8C9]'}`}
          style={{
            shadowColor: '#503D68',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
            elevation: 3,
          }}
        >
          <View className="w-18 h-18 bg-[#FAF3E0] rounded-full items-center justify-center mb-2">
            <Trophy size={40} color={isCorrect ? '#59936E' : '#836EA1'} />
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
            {isCorrect ? 'You solved the pattern flawlessly!' : 'The pattern repeats with matching motifs.'}
          </Text>

          <View className="flex-row gap-3 mt-6 w-full">
            <View className="flex-1">
              <Button
                title="Play Next"
                variant="primary"
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
            className="text-2xl text-[#2B3A30] mb-3 text-center"
            style={{ fontFamily: 'PatrickHand' }}
          >
            Tap the matching symbol:
          </Text>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.82}
                onPress={() => handleSelectOption(opt)}
                className="w-[48%] bg-white border border-[#E8E2D8] active:border-[#836EA1] p-4 rounded-3xl items-center shadow-sm min-h-[90px]"
              >
                <Text className="text-4xl">{opt.emoji}</Text>
                <Text 
                  className="text-[#2D3748] text-sm font-bold mt-1"
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
          textToSpeak="Look at the repeating pattern and tap the symbol that belongs inside the question mark box."
          label={t('voice_assist')}
        />
      </View>
    </ScrollView>
  );
}
