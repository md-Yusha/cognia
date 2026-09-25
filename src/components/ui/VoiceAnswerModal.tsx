import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform, TextInput } from 'react-native';
import { Mic, MicOff, Check, X, Volume2, Sparkles } from 'lucide-react-native';
import { speakPrompt } from '../../services/ttsService';
import * as Haptics from 'expo-haptics';

interface VoiceAnswerModalProps {
  visible: boolean;
  onClose: () => void;
  onAnswer: (transcript: string) => void;
  promptQuestion?: string;
  quickPhrases?: string[];
  language?: 'as' | 'kha' | 'bn' | 'en';
}

export const VoiceAnswerModal: React.FC<VoiceAnswerModalProps> = ({
  visible,
  onClose,
  onAnswer,
  promptQuestion = 'How are you feeling right now?',
  quickPhrases = ['Yes, I took it', 'I drank my water', 'I am doing well', 'I need help'],
  language = 'en',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [recognitionObj, setRecognitionObj] = useState<any>(null);

  useEffect(() => {
    if (!visible) {
      setIsListening(false);
      setSpokenText('');
      return;
    }

    // Speak initial prompt when opened
    speakPrompt(promptQuestion, language);

    // Initialize Web Speech Recognition if on web browser
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognizer = new SpeechRecognition();
          recognizer.continuous = false;
          recognizer.interimResults = false;
          recognizer.lang = language === 'as' ? 'as-IN' : language === 'bn' ? 'bn-IN' : 'en-IN';

          recognizer.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setSpokenText(transcript);
            setIsListening(false);
          };

          recognizer.onerror = () => {
            setIsListening(false);
          };

          recognizer.onend = () => {
            setIsListening(false);
          };

          setRecognitionObj(recognizer);
        } catch {}
      }
    }
  }, [visible, promptQuestion, language]);

  const toggleListening = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    if (isListening) {
      setIsListening(false);
      if (recognitionObj) {
        try { recognitionObj.stop(); } catch {}
      }
    } else {
      setIsListening(true);
      if (recognitionObj) {
        try { recognitionObj.start(); } catch {}
      } else {
        // Fallback simulate voice pulse for native
        setTimeout(() => {
          setIsListening(false);
        }, 4000);
      }
    }
  };

  const handleSelectPhrase = (phrase: string) => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setSpokenText(phrase);
    onAnswer(phrase);
    speakPrompt(`Recorded: ${phrase}`, language);
    onClose();
  };

  const handleConfirmCustom = () => {
    if (!spokenText.trim()) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    onAnswer(spokenText.trim());
    speakPrompt(`Recorded: ${spokenText.trim()}`, language);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View 
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#FAF8F5',
            borderTopLeftRadius: 36,
            borderTopRightRadius: 36,
            padding: 24,
            paddingBottom: 40,
            borderWidth: 2,
            borderColor: '#CCEAD7',
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#EBF7F0', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Sparkles size={18} color="#16704A" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#16704A', fontFamily: 'Nunito-Bold' }}>
                Voice Assistant
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <X size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Question text with listen button */}
          <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', fontFamily: 'Nunito-Bold', marginBottom: 6 }}>
              {promptQuestion}
            </Text>
            <TouchableOpacity 
              onPress={() => speakPrompt(promptQuestion, language)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Volume2 size={16} color="#16704A" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#16704A', marginLeft: 6, fontFamily: 'Nunito-SemiBold' }}>
                Tap to hear question again
              </Text>
            </TouchableOpacity>
          </View>

          {/* Big Elderly Microphone Button */}
          <View style={{ alignItems: 'center', marginVertical: 12 }}>
            <TouchableOpacity
              onPress={toggleListening}
              activeOpacity={0.85}
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: isListening ? '#DC2626' : '#16704A',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 4,
                borderColor: isListening ? '#FCA5A5' : '#86EFAC',
                shadowColor: isListening ? '#DC2626' : '#16704A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              {isListening ? <MicOff size={38} color="#FFFFFF" /> : <Mic size={38} color="#FFFFFF" />}
            </TouchableOpacity>
            <Text style={{ fontSize: 14, fontWeight: '700', color: isListening ? '#DC2626' : '#475569', marginTop: 10, fontFamily: 'Nunito-Bold' }}>
              {isListening ? '🎙️ Listening... speak clearly now' : 'Tap to speak your answer'}
            </Text>
          </View>

          {/* Spoken Text Display or Input */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#CBD5E1', padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              value={spokenText}
              onChangeText={setSpokenText}
              placeholder="Or type/verify spoken words..."
              placeholderTextColor="#94A3B8"
              style={{ flex: 1, fontSize: 16, color: '#1E293B', fontFamily: 'Nunito-SemiBold' }}
            />
            {spokenText.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleConfirmCustom}
                style={{ backgroundColor: '#16704A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}
              >
                <Check size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Voice Answer Pills for Elderly Convenience */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Nunito-Bold' }}>
            Quick 1-Tap Answers
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {quickPhrases.map((phrase, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSelectPhrase(phrase)}
                activeOpacity={0.82}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', fontFamily: 'Nunito-Bold' }}>
                  🗣️ {phrase}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};
