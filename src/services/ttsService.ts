import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { LanguageCode } from '../types';

export async function speakPrompt(text: string, _language: LanguageCode = 'en'): Promise<void> {
  if (!text.trim()) return;
  try {
    Speech.stop();
  } catch {}
  Speech.speak(text, {
    language: Platform.OS === 'ios' ? 'en-US' : 'en-IN',
    rate: 0.85,
    pitch: 1,
  });
}

export async function stopSpeech(): Promise<void> {
  try {
    Speech.stop();
  } catch {}
}
