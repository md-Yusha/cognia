import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, Trophy, Sparkles } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { VoiceButton } from '../../../src/components/ui/VoiceButton';
import { usePatientStore } from '../../../src/store/usePatientStore';
import { calculateAdaptiveTier } from '../../../src/services/adaptiveEngine';
import { speakPrompt } from '../../../src/services/ttsService';
import * as Haptics from 'expo-haptics';

interface CardItem {
  id: number;
  pairId: string;
  label: string;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const REGIONAL_PAIRS = [
  { pairId: 'rhino', label: 'Rhino', emoji: '🦏' },
  { pairId: 'tea', label: 'Tea Pot', emoji: '🫖' },
  { pairId: 'dhol', label: 'Bihu Drum', emoji: '🥁' },
  { pairId: 'bamboo', label: 'Bamboo', emoji: '🎋' },
  { pairId: 'bird', label: 'Hornbill', emoji: '🦜' },
  { pairId: 'leaf', label: 'Tea Leaf', emoji: '🍃' },
];

export default function MemoryMatchGameScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { patient, recordGameSession, updateDifficultyTier } = usePatientStore();

  const currentTier = patient?.difficultyLevels.memory_match || 'easy';
  const pairCount = currentTier === 'easy' ? 2 : currentTier === 'medium' ? 3 : 4;

  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  const flipsRef = useRef(0);
  const mismatchesRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const lastFlipTimeRef = useRef<number>(0);
  const matchedRef = useRef(0);

  const initGame = () => {
    const selected = REGIONAL_PAIRS.slice(0, pairCount);
    const deck: CardItem[] = [];

    selected.forEach((item, index) => {
      deck.push({ id: index * 2, pairId: item.pairId, label: item.label, emoji: item.emoji, isFlipped: false, isMatched: false });
      deck.push({ id: index * 2 + 1, pairId: item.pairId, label: item.label, emoji: item.emoji, isFlipped: false, isMatched: false });
    });

    const shuffled = deck.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setSelectedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsGameFinished(false);
    setStartTime(Date.now());
    lastFlipTimeRef.current = Date.now();
    flipsRef.current = 0;
    mismatchesRef.current = 0;
    matchedRef.current = 0;
    reactionTimesRef.current = [];

    speakPrompt('Find the matching pairs. Tap a card to turn it over.', (i18n.language || 'en') as any);
  };

  useEffect(() => {
    initGame();
  }, [pairCount]);

  const handleCardPress = (index: number) => {
    if (selectedCards.length === 2 || cards[index].isFlipped || cards[index].isMatched) {
      return;
    }

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    const now = Date.now();
    reactionTimesRef.current.push(now - lastFlipTimeRef.current);
    lastFlipTimeRef.current = now;
    flipsRef.current++;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newSelected;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];

      if (firstCard.pairId === secondCard.pairId) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        setTimeout(() => {
          newCards[firstIdx].isMatched = true;
          newCards[secondIdx].isMatched = true;
          setCards([...newCards]);
          setSelectedCards([]);
          matchedRef.current += 1;
          setMatchedPairs(matchedRef.current);

          if (matchedRef.current === pairCount) {
            handleGameOver();
          }
        }, 400);
      } else {
        mismatchesRef.current++;
        setTimeout(() => {
          newCards[firstIdx].isFlipped = false;
          newCards[secondIdx].isFlipped = false;
          setCards([...newCards]);
          setSelectedCards([]);
        }, 900);
      }
    }
  };

  const handleGameOver = async () => {
    setIsGameFinished(true);
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const totalTrials = moves + 1;
    const accuracy = Math.round((pairCount / Math.max(pairCount, totalTrials)) * 100);
    const avgReaction = reactionTimesRef.current.length > 0 
      ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
      : 2000;

    speakPrompt('Wonderful job! You found all the matching pairs!', (i18n.language || 'en') as any);

    await recordGameSession({
      gameType: 'memory_match',
      difficultyTier: currentTier,
      score: accuracy * 10,
      accuracy,
      averageReactionTimeMs: avgReaction,
      hesitationCount: mismatchesRef.current,
      totalTrials,
      successfulTrials: pairCount,
      durationSeconds,
    });

    const adaptResult = await calculateAdaptiveTier('memory_match', currentTier, usePatientStore.getState().recentSessions);
    if (adaptResult.suggestedTier !== currentTier) {
      updateDifficultyTier('memory_match', adaptResult.suggestedTier);
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
            className="text-[#4A5568] font-bold ml-1.5 text-lg"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Back
          </Text>
        </TouchableOpacity>

        <View className="bg-[#EBF4EE] border border-[#CDE3D5] px-3.5 py-1 rounded-full">
          <Text 
            className="text-[#2C503A] text-lg font-bold uppercase tracking-wider"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Level: {currentTier}
          </Text>
        </View>
      </View>

      {/* Hero Card */}
      <View 
        className="bg-[#EBF4EE] rounded-[32px] p-6 border border-[#CDE3D5] mb-6"
        style={{
          shadowColor: '#3D6C4E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <Text 
          className="text-4xl text-[#2C503A] text-center"
          style={{ fontFamily: 'PatrickHand' }}
        >
          {t('game_memory')}
        </Text>
        <Text 
          className="text-[#4A7C59] text-center text-xl font-semibold mt-1"
          style={{ fontFamily: 'Nunito-SemiBold' }}
        >
          Find matching picture pairs of Assam heritage & wildlife.
        </Text>
      </View>

      {/* Game Finished Card */}
      {isGameFinished ? (
        <View 
          className="bg-white border-2 border-[#CDE3D5] rounded-[32px] p-8 items-center mb-6"
          style={{
            shadowColor: '#3D6C4E',
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
            className="text-4xl text-[#2C503A] mt-2 text-center"
            style={{ fontFamily: 'PatrickHand' }}
          >
            {t('well_done')}
          </Text>
          <Text 
            className="text-[#597362] text-xl font-semibold mt-1"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            Solved in {moves} moves!
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
        /* Game Grid */
        <View className="flex-row flex-wrap justify-between gap-y-4 mb-6">
          {cards.map((card, idx) => (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.85}
              onPress={() => handleCardPress(idx)}
              style={{
                shadowColor: '#6B5E4F',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.07,
                shadowRadius: 10,
                elevation: 2,
              }}
              className={card.isMatched ? 'w-[48%] h-40 rounded-[28px] border-2 items-center justify-center bg-[#EBF4EE] border-[#4A7C59]' : card.isFlipped ? 'w-[48%] h-40 rounded-[28px] border-2 items-center justify-center bg-white border-[#4A7C59]' : 'w-[48%] h-40 rounded-[28px] border-2 items-center justify-center bg-white border-[#E8E2D8]'}
            >
              {card.isFlipped || card.isMatched ? (
                <View className="items-center">
                  <Text className="text-5xl">{card.emoji}</Text>
                  <Text 
                    className="text-[#2C503A] text-xl mt-2 font-bold"
                    style={{ fontFamily: 'PatrickHand' }}
                  >
                    {card.label}
                  </Text>
                </View>
              ) : (
                <View className="items-center">
                  <View className="w-14 h-14 rounded-full bg-[#FAF7F2] border border-[#E8E2D8] items-center justify-center">
                    <Text className="text-3xl font-bold text-[#8C8274]">?</Text>
                  </View>
                  <Text 
                    className="text-[#8C8274] text-lg font-bold mt-2"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    Tap to Turn
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Voice Assistant */}
      <View className="items-center">
        <VoiceButton
          textToSpeak="Tap on any card to turn it over, then find another card with the exact same picture."
          label={t('voice_assist')}
        />
      </View>
    </ScrollView>
  );
}
