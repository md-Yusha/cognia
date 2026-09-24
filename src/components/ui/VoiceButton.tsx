import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Volume2, X } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { speakPrompt } from '../../services/ttsService';
import * as Haptics from 'expo-haptics';
import { LanguageCode } from '../../types';

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
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('Tap play to hear this aloud.');

  const speak = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setOpen(true);
    setStatus('Speaking… if the ringer is off, turn it up.');
    speakPrompt(textToSpeak, language);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={speak}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#E3EFE7',
          borderColor: '#C5DCCB',
          borderWidth: 1,
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderRadius: 999,
          minHeight: 56,
        }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#59936E', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <Volume2 size={20} color="#FFFFFF" />
        </View>
        <Text style={{ color: '#274733', fontFamily: 'Nunito-Bold', fontSize: 18 }}>{label}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 22 }}>
          <View style={{ backgroundColor: '#FAF7F2', borderRadius: 28, padding: 22 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'PatrickHand', fontSize: 32, color: '#2B3A30' }}>Voice Help</Text>
              <TouchableOpacity onPress={() => { Speech.stop(); setOpen(false); }} style={{ padding: 8 }}>
                <X size={22} color="#4A5568" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Nunito-SemiBold', fontSize: 22, color: '#2C503A', marginTop: 12, lineHeight: 30 }}>
              {textToSpeak}
            </Text>
            <Text style={{ fontFamily: 'Nunito-SemiBold', fontSize: 16, color: '#597362', marginTop: 12 }}>{status}</Text>
            <TouchableOpacity onPress={speak} style={{ marginTop: 16, backgroundColor: '#3D6C4E', borderRadius: 999, minHeight: 56, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontFamily: 'Nunito-Bold', fontSize: 18 }}>Play again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};
