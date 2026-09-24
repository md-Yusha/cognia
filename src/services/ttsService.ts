import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { LanguageCode } from '../types';

let audioReady = false;

async function prepareAudio() {
  if (audioReady) return;
  try {
    const { Audio } = await import('expo-av');
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
    audioReady = true;
  } catch {}
}

export async function speakPrompt(text: string, _language: LanguageCode = 'en'): Promise<void> {
  if (!text.trim()) return;
  await prepareAudio();
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
