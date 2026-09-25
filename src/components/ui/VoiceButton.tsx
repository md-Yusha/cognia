import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View, Animated } from 'react-native';
import { Volume2, X, RotateCcw, Sparkles } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { speakPrompt } from '../../services/ttsService';
import * as Haptics from 'expo-haptics';
import { LanguageCode } from '../../types';

interface VoiceButtonProps {
  textToSpeak: string;
  language?: LanguageCode;
  label?: string;
  compact?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  textToSpeak,
  language = 'en',
  label = 'Voice Guidance',
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setOpen(true);
    setIsSpeaking(true);
    speakPrompt(textToSpeak, language);
    setTimeout(() => {
      setIsSpeaking(false);
    }, 4500);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={speak}
        accessibilityRole="button"
        accessibilityLabel={label}
        className={`flex-row items-center bg-[#EBF7F0] border border-[#C5E8D3] ${
          compact ? 'px-3 py-1.5 rounded-full' : 'px-4 py-2.5 rounded-full min-h-[50px]'
        }`}
        style={{
          shadowColor: '#16704A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 1,
        }}
      >
        <View className="w-7 h-7 rounded-full bg-[#16704A] items-center justify-center mr-2">
          <Volume2 size={15} color="#FFFFFF" />
        </View>
        <Text 
          className="text-[#145332] text-base font-bold"
          style={{ fontFamily: 'Nunito-Bold' }}
        >
          {label}
        </Text>
      </TouchableOpacity>

      <Modal 
        visible={open} 
        transparent 
        animationType="fade" 
        onRequestClose={() => {
          Speech.stop();
          setOpen(false);
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View 
            className="w-full max-w-sm bg-[#FAF8F5] rounded-[32px] p-6 border border-[#E8E2D6]"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.16,
              shadowRadius: 24,
              elevation: 6,
            }}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-full bg-[#EBF7F0] border border-[#BDE5CB] items-center justify-center mr-2.5">
                  <Volume2 size={18} color="#16704A" />
                </View>
                <Text 
                  className="text-2xl text-[#1E293B] font-bold"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Audio Assistant
                </Text>
              </View>

              <TouchableOpacity 
                onPress={() => { 
                  Speech.stop(); 
                  setOpen(false); 
                }}
                className="w-9 h-9 bg-white border border-[#CBD5E1] rounded-full items-center justify-center"
              >
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Read-Aloud Text Box */}
            <View className="bg-white rounded-2xl p-5 border border-[#EDE7DD] mb-4">
              <Text 
                className="text-[#1E293B] text-2xl leading-relaxed font-semibold text-center"
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                "{textToSpeak}"
              </Text>
            </View>

            {/* Speaking Status */}
            <View className="flex-row items-center justify-center mb-4">
              <View className={`w-2.5 h-2.5 rounded-full mr-2 ${isSpeaking ? 'bg-[#1F8A5D]' : 'bg-[#94A3B8]'}`} />
              <Text 
                className="text-sm font-semibold text-[#64748B]"
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                {isSpeaking ? 'Playing voice aloud…' : 'Tap below to listen again'}
              </Text>
            </View>

            {/* Play Again Button */}
            <TouchableOpacity 
              onPress={speak}
              activeOpacity={0.85}
              className="bg-[#16704A] py-3.5 rounded-2xl flex-row items-center justify-center min-h-[54px]"
            >
              <RotateCcw size={18} color="#FFFFFF" />
              <Text 
                className="text-white text-lg font-bold ml-2"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                Listen Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};
