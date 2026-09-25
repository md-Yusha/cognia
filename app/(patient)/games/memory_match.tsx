import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RefreshCw, Trophy, Sparkles, Home } from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { VoiceButton } from '../../../src/components/ui/VoiceButton';
import { ResponsiveContainer } from '../../../src/components/ui/ResponsiveContainer';
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
  { pairId: 'rhino', label: 'One-Horn Rhino', emoji: '🦏' },
  { pairId: 'tea', label: 'Assam Tea Pot', emoji: '🫖' },
  { pairId: 'dhol', label: 'Bihu Drum', emoji: '🥁' },
  { pairId: 'bamboo', label: 'Bamboo Grove', emoji: '🎋' },
  { pairId: 'bird', label: 'Great Hornbill', emoji: '🦜' },
  { pairId: 'leaf', label: 'Fresh Tea Leaf', emoji: '🍃' },
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

          <View className="bg-[#EAF7EE] border border-[#BDE5CB] px-3.5 py-1 rounded-full">
            <Text 
              className="text-[#145332] text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Level: {currentTier}
            </Text>
          </View>
        </View>

        {/* Hero Card */}
        <View 
          className="bg-[#F0F9F4] rounded-[28px] p-5 border-2 border-[#CCEAD7] mb-5"
          style={{
            shadowColor: '#16704A',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <Text 
            className="text-2xl text-[#143825] font-bold text-center"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            {t('game_memory')}
          </Text>
          <Text 
            className="text-[#3D7351] text-center text-sm font-semibold mt-1"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            Find matching picture pairs of Assam heritage & wildlife.
          </Text>
        </View>

        {/* Game Finished Card */}
        {isGameFinished ? (
          <View 
            className="bg-white border-2 border-[#CCEAD7] rounded-[32px] p-7 items-center mb-6"
            style={{
              shadowColor: '#16704A',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            <View className="w-20 h-20 bg-[#FEF3C7] rounded-3xl items-center justify-center mb-3 border border-[#FDE68A]">
              <Trophy size={42} color="#D97706" />
            </View>

            <Text 
              className="text-3xl text-[#1E293B] font-bold text-center"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              {t('well_done')}
            </Text>

            <Text 
              className="text-[#64748B] text-base font-semibold mt-1"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              {t('solved_in', { count: moves })}
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
          /* Game Grid */
          <View 
            className="flex-row flex-wrap justify-between mb-6"
            style={{ rowGap: 14 }}
          >
            {cards.map((card, idx) => {
              const bgColor = card.isMatched ? '#F0FDF4' : card.isFlipped ? '#FFFFFF' : '#FFFFFF';
              const borderColor = card.isMatched ? '#86EFAC' : card.isFlipped ? '#16704A' : '#EDE7DD';
              return (
                <TouchableOpacity
                  key={card.id}
                  activeOpacity={0.84}
                  onPress={() => handleCardPress(idx)}
                  style={{
                    width: '48%',
                    height: 160,
                    borderRadius: 26,
                    borderWidth: 2,
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#3A3226',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  {card.isFlipped || card.isMatched ? (
                    <View className="items-center p-2">
                      <Text className="text-5xl">{card.emoji}</Text>
                      <Text 
                        className="text-[#145332] text-sm mt-2 font-bold text-center"
                        style={{ fontFamily: 'Nunito-Bold' }}
                      >
                        {card.label}
                      </Text>
                    </View>
                  ) : (
                    <View className="items-center">
                      <View 
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          backgroundColor: '#FAF8F5',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 8,
                        }}
                      >
                        <Text className="text-2xl font-black text-[#94A3B8]">?</Text>
                      </View>
                      <Text 
                        className="text-[#64748B] text-xs font-bold mt-2"
                        style={{ fontFamily: 'Nunito-Bold' }}
                      >
                        Tap to Flip
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Voice Assistant */}
        <View className="items-center">
          <VoiceButton
            compact
            textToSpeak="Tap on any card to turn it over, then find another card with the exact same picture."
            label={t('voice_assist')}
          />
        </View>
      </ResponsiveContainer>
    </ScrollView>
  );
}
