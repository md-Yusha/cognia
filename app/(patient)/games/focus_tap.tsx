import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, Trophy, Target } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { VoiceButton } from '../../../src/components/ui/VoiceButton';
import { usePatientStore } from '../../../src/store/usePatientStore';
import { calculateAdaptiveTier } from '../../../src/services/adaptiveEngine';
import { speakPrompt } from '../../../src/services/ttsService';
import * as Haptics from 'expo-haptics';

interface TargetGridItem {
  id: number;
  isTarget: boolean;
  emoji: string;
}

export default function FocusTapGameScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { patient, recordGameSession, recentSessions, updateDifficultyTier } = usePatientStore();

  const currentTier = patient?.difficultyLevels.focus_tap || 'easy';
  const totalRounds = currentTier === 'easy' ? 4 : currentTier === 'medium' ? 6 : 8;

  const [currentRound, setCurrentRound] = useState(0);
  const [gridItems, setGridItems] = useState<TargetGridItem[]>([]);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [mismatches, setMismatches] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState(0);

  const roundStartTimeRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);

  const startRound = (roundNum: number) => {
    if (roundNum >= totalRounds) {
      handleGameOver();
      return;
    }

    setCurrentRound(roundNum);

    const targetCellIndex = Math.floor(Math.random() * 4);
    const items: TargetGridItem[] = Array.from({ length: 4 }).map((_, idx) => {
      const isTarget = idx === targetCellIndex;
      return {
        id: idx,
        isTarget,
        emoji: isTarget ? '🍃' : '🦋',
      };
    });

    setGridItems(items);
    roundStartTimeRef.current = Date.now();
  };

  const initGame = () => {
    setCurrentRound(0);
    setScore(0);
    setHits(0);
    setMismatches(0);
    setIsFinished(false);
    setStartTime(Date.now());
    reactionTimesRef.current = [];

    speakPrompt('Tap the fresh green tea leaf as fast as you can. Avoid the butterflies.', (i18n.language || 'en') as any);
    startRound(0);
  };

  useEffect(() => {
    initGame();
  }, [totalRounds]);

  const handleCellPress = (item: TargetGridItem) => {
    const reaction = Date.now() - roundStartTimeRef.current;
    reactionTimesRef.current.push(reaction);

    if (item.isTarget) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setHits((h) => h + 1);
      setScore((s) => s + 20);
    } else {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
      setMismatches((m) => m + 1);
    }

    setTimeout(() => {
      startRound(currentRound + 1);
    }, 200);
  };

  const handleGameOver = async () => {
    setIsFinished(true);
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const accuracy = Math.round((hits / Math.max(1, hits + mismatches)) * 100);
    const avgReaction = reactionTimesRef.current.length > 0
      ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
      : 1800;

    speakPrompt('Fantastic focus and concentration! Great job today!', (i18n.language || 'en') as any);

    await recordGameSession({
      gameType: 'focus_tap',
      difficultyTier: currentTier,
      score: hits * 20,
      accuracy,
      averageReactionTimeMs: avgReaction,
      hesitationCount: mismatches,
      totalTrials: totalRounds,
      successfulTrials: hits,
      durationSeconds,
    });

    const adaptResult = await calculateAdaptiveTier('focus_tap', currentTier, recentSessions);
    if (adaptResult.suggestedTier !== currentTier) {
      updateDifficultyTier('focus_tap', adaptResult.suggestedTier);
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

        <View className="bg-[#EDF6F8] border border-[#C4E3EB] px-3.5 py-1 rounded-full">
          <Text 
            className="text-[#2C5E6E] text-xs font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Round: {Math.min(currentRound + 1, totalRounds)} / {totalRounds}
          </Text>
        </View>
      </View>

      {/* Game Title */}
      <View 
        className="bg-[#EDF6F8] rounded-[32px] p-6 border border-[#C4E3EB] mb-6"
        style={{
          shadowColor: '#2C5E6E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <Text 
          className="text-4xl text-[#2C5E6E] text-center"
          style={{ fontFamily: 'PatrickHand' }}
        >
          {t('game_focus')}
        </Text>
        <Text 
          className="text-[#43798A] text-center text-sm font-semibold mt-1"
          style={{ fontFamily: 'Nunito-SemiBold' }}
        >
          Tap the fresh green tea leaf 🍃 when it appears in the garden.
        </Text>
      </View>

      {/* Finished Summary or Active Garden Grid */}
      {isFinished ? (
        <View 
          className="bg-white border-2 border-[#C4E3EB] rounded-[32px] p-8 items-center mb-6"
          style={{
            shadowColor: '#2C5E6E',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 3,
          }}
        >
          <View className="w-20 h-20 bg-[#FAF3E0] rounded-full items-center justify-center mb-2 border border-[#F4E3C4]">
            <Trophy size={42} color="#D97706" />
          </View>
          <Text 
            className="text-4xl text-[#2B3A30] mt-2 text-center"
            style={{ fontFamily: 'PatrickHand' }}
          >
            {t('well_done')}
          </Text>
          <Text 
            className="text-[#64748B] text-base font-semibold mt-1"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            Found {hits} of {totalRounds} tea leaves accurately!
          </Text>

          <View className="flex-row gap-3 mt-6 w-full">
            <View className="flex-1">
              <Button
                title="Play Again"
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
          <View className="flex-row flex-wrap justify-between gap-y-3.5">
            {gridItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.75}
                onPress={() => handleCellPress(item)}
                style={{
                  shadowColor: '#6B5E4F',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                }}
                className={`w-[48%] h-40 rounded-[28px] border-2 items-center justify-center transition-all ${
                  item.isTarget
                    ? 'bg-[#EBF4EE] border-[#4A7C59]'
                    : 'bg-white border-[#E8E2D8]'
                }`}
              >
                <Text className="text-5xl">{item.emoji}</Text>
                <Text 
                  className={`text-sm font-bold mt-2 ${item.isTarget ? 'text-[#2C503A]' : 'text-[#718096]'}`}
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  {item.isTarget ? 'Tea Leaf' : 'Butterfly'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Voice Assistant */}
      <View className="items-center">
        <VoiceButton
          textToSpeak="Find and tap the tea leaf as quickly as possible. Avoid the butterfly."
          label={t('voice_assist')}
        />
      </View>
    </ScrollView>
  );
}
