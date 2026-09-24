import * as Speech from 'expo-speech';
import { LanguageCode } from '../types';

const LANGUAGE_VOICE_MAP: Record<LanguageCode, string> = {
  en: 'en-IN',
  as: 'as-IN',
  kha: 'en-IN', // Khasi fallback with gentle cadence
  bn: 'bn-IN',
};

/**
 * Speaks text using local offline TTS with elderly-friendly slow pacing and clear articulation
 */
export async function speakPrompt(text: string, language: LanguageCode = 'en'): Promise<void> {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
    }

    const voiceCode = LANGUAGE_VOICE_MAP[language] || 'en-IN';

    Speech.speak(text, {
      language: voiceCode,
      rate: 0.82, // Slower rate tailored for dementia patients and elderly listeners
      pitch: 1.0,
    });
  } catch (error) {
    console.warn('TTS playback issue (browser/device fallback):', error);
  }
}

export async function stopSpeech(): Promise<void> {
  try {
    await Speech.stop();
  } catch {}
}
