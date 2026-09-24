import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { speakPrompt } from '../../services/ttsService';
import { LanguageCode } from '../../types';
import * as Haptics from 'expo-haptics';

interface VoiceButtonProps {
  textToSpeak: string;
  language?: LanguageCode;
  label?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  textToSpeak,
  language = 'en',
  label = 'Voice Help',
}) => {
  const handleSpeak = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    speakPrompt(textToSpeak, language);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleSpeak}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Listen aloud: ${textToSpeak}`}
      className="flex-row items-center bg-[#E3EFE7] border border-[#C5DCCB] px-5 py-3 rounded-full shadow-sm"
    >
      <View className="w-8 h-8 rounded-full bg-[#59936E] items-center justify-center mr-2.5">
        <Volume2 size={18} color="#FFFFFF" />
      </View>
      <Text 
        className="text-[#274733] font-bold text-base"
        style={{ fontFamily: 'Nunito-Bold' }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};
