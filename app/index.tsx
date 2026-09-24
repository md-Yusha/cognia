import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  KeyRound,
  ShieldCheck,
  Play,
  Heart,
  User,
  X
} from 'lucide-react-native';
import { Button } from '../src/components/ui/Button';
import { VoiceButton } from '../src/components/ui/VoiceButton';
import { OfflineBadge } from '../src/components/ui/OfflineBadge';
import { LanguageSelector } from '../src/components/ui/LanguageSelector';
import { resolvePatientCode, getStoredPatientSession } from '../src/services/codeService';
import { usePatientStore } from '../src/store/usePatientStore';
import { useCaregiverStore } from '../src/store/useCaregiverStore';
import { PatientProfile } from '../src/types';
import * as Haptics from 'expo-haptics';

export default function LaunchScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { setPatient } = usePatientStore();
  const { caregiver, patients } = useCaregiverStore();

  const [savedPatient, setSavedPatient] = useState<PatientProfile | null>(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check stored patient session on mount
  useEffect(() => {
    async function checkSavedSession() {
      const stored = await getStoredPatientSession();
      if (stored) {
        setSavedPatient(stored);
      } else if (patients.length > 0) {
        setSavedPatient(patients[0]);
      }
    }
    checkSavedSession();
  }, [patients]);

  // One-Tap Quick Start for Elderly Patients (Zero Password / Zero Code needed)
  const handleQuickStart = async (existingProfile?: PatientProfile) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setLoading(true);

    const profileToUse: PatientProfile = existingProfile || savedPatient || {
      id: `patient_guest_${Date.now()}`,
      caregiverId: 'local_family',
      name: i18n.language === 'as' ? 'আইতা / ককা' : i18n.language === 'bn' ? 'দাদু / দিদিমা' : 'Respected Elder',
      preferredLanguage: (i18n.language || 'as') as any,
      accessCode: 'CALM-01',
      createdAt: Date.now(),
      difficultyLevels: {
        memory_match: 'easy',
        daily_routine_recall: 'easy',
        pattern_recognition: 'easy',
        focus_tap: 'easy',
      },
    };

    await setPatient(profileToUse);
    setLoading(false);
    router.replace('/(patient)/home');
  };

  // Submit Caregiver-issued Access Code
  const handlePatientCodeSubmit = async () => {
    if (!code.trim()) {
      setErrorMessage(t('enter_patient_code'));
      return;
    }

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setLoading(true);
    setErrorMessage('');

    try {
      const cleanCode = code.trim().toUpperCase();
      const result = await resolvePatientCode(cleanCode);
      if (result && result.patient) {
        await setPatient(result.patient);
        setIsCodeModalOpen(false);
        router.replace('/(patient)/home');
      } else {
        // Safe offline session with code
        const fallbackPatient: PatientProfile = {
          id: `patient_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          caregiverId: 'caregiver_active',
          name: 'Respected Participant',
          preferredLanguage: (i18n.language || 'as') as any,
          accessCode: cleanCode,
          createdAt: Date.now(),
          difficultyLevels: {
            memory_match: 'easy',
            daily_routine_recall: 'easy',
            pattern_recognition: 'easy',
            focus_tap: 'easy',
          },
        };
        await setPatient(fallbackPatient);
        setIsCodeModalOpen(false);
        router.replace('/(patient)/home');
      }
    } catch (error) {
      setErrorMessage('Could not verify code. Starting safe local session.');
    } finally {
      setLoading(false);
    }
  };

  const handleCaregiverNav = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    if (caregiver) {
      router.push('/(caregiver)/dashboard');
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#FAF7F2' }}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ 
          flexGrow: 1, 
          paddingHorizontal: 22, 
          paddingTop: 12, 
          paddingBottom: 40, 
          justifyContent: 'space-between' 
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header */}
        <View className="pt-6 mb-2">
          <OfflineBadge />
        </View>

        {/* Hero Branding */}
        <View className="my-2 items-center">
          {/* Gentle Organic Icon Badge */}
          <View 
            className="w-20 h-20 rounded-full bg-[#EBF4EE] border border-[#CDE3D5] items-center justify-center mb-3"
            style={{
              shadowColor: '#3D6C4E',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <Text className="text-4xl">🌿</Text>
          </View>

          <Text 
            className="text-4xl text-[#2B3A30] text-center"
            style={{ fontFamily: 'PatrickHand' }}
          >
            Cognia
          </Text>

          <Text 
            className="text-[#4A7C59] text-center text-xl font-semibold mt-1 max-w-xs"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            Gentle memory & cognitive exercises for North East India
          </Text>

          {/* Regional Language Selector */}
          <View className="w-full mt-3 mb-2">
            <LanguageSelector />
          </View>

          {/* Quick Return Profile Card (if returning patient exists) */}
          {savedPatient && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleQuickStart(savedPatient)}
              className="w-full bg-[#FDF3ED] border border-[#F4D8C9] p-5 rounded-[28px] mb-4 flex-row items-center justify-between"
              style={{
                shadowColor: '#8A4226',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-12 h-12 bg-white rounded-full items-center justify-center mr-3 border border-[#F4D8C9]">
                  <Text className="text-3xl">🌸</Text>
                </View>
                <View className="flex-1">
                  <Text 
                    className="text-[#8A4226] text-lg font-bold uppercase tracking-wider"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    Welcome Back
                  </Text>
                  <Text 
                    className="text-3xl text-[#2D3748]"
                    style={{ fontFamily: 'PatrickHand' }}
                  >
                    {savedPatient.name}
                  </Text>
                </View>
              </View>

              <View className="bg-[#C87453] px-4 py-2.5 rounded-full flex-row items-center">
                <Text 
                  className="text-white text-lg font-bold mr-1"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Continue
                </Text>
                <ArrowRight size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}

          {/* Featured Primary Card: One-Tap Calming Exercises */}
          <View 
            className="w-full bg-white rounded-[32px] p-6 border border-[#EFEBE4] mt-1"
            style={{
              shadowColor: '#6B5E4F',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.07,
              shadowRadius: 18,
              elevation: 3,
            }}
          >
            <View className="items-center mb-4">
              <View className="bg-[#EBF4EE] px-3.5 py-1 rounded-full mb-2 border border-[#CDE3D5]">
                <Text 
                  className="text-[#2C503A] text-lg font-bold"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Daily Brain Exercise
                </Text>
              </View>
              <Text 
                className="text-4xl text-[#2B3A30] text-center"
                style={{ fontFamily: 'PatrickHand' }}
              >
                Today's Calming Journey
              </Text>
              <Text 
                className="text-[#597362] text-center text-xl mt-1 px-2"
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                No password required. Tap below to start today's relaxing memory activities.
              </Text>
            </View>

            {/* Big Relaxing Action Button */}
            <Button
              title="Start Calming Games ➔"
              variant="primary"
              size="elderly"
              loading={loading}
              onPress={() => handleQuickStart()}
            />

            {/* Secondary Option: Enter Family Caregiver Code */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setErrorMessage('');
                setIsCodeModalOpen(true);
              }}
              className="mt-4 py-3 items-center flex-row justify-center border-t border-[#F0ECE4]"
            >
              <KeyRound size={16} color="#8A4226" />
              <Text 
                className="text-[#8A4226] text-xl font-bold ml-2"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                Have a family code? Tap to enter
              </Text>
            </TouchableOpacity>

            {/* Voice Assistant */}
            <View className="items-center mt-3 pt-2">
              <VoiceButton
                textToSpeak="Welcome to Cognia. Tap the green button to begin your calming daily brain exercises."
                label={t('voice_assist')}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleCaregiverNav}
          className="w-full bg-white border border-[#CDE3D5] rounded-[28px] px-5 py-5 mt-4 flex-row items-center"
        >
          <ShieldCheck size={28} color="#3D6C4E" />
          <View className="flex-1 ml-3">
            <Text className="text-[#2C503A] text-3xl" style={{ fontFamily: 'PatrickHand' }}>
              {caregiver ? 'Open caregiver home' : 'Caregiver portal'}
            </Text>
            <Text className="text-[#597362] text-xl" style={{ fontFamily: 'Nunito-SemiBold' }}>
              Family helpers sign in here. This is not the patient start button.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <View className="items-center pt-3">
          <Text 
            className="text-[#8C8274] text-lg text-center"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            Assam • Meghalaya • Manipur • Tripura • Nagaland • Mizoram • Arunachal • Sikkim
          </Text>
        </View>
      </ScrollView>

      {/* Access Code Entry Modal */}
      <Modal visible={isCodeModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-[#FAF7F2] border-t border-[#E8E2D8] p-6 rounded-t-[32px] max-h-[85%]">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text 
                  className="text-4xl text-[#2B3A30]"
                  style={{ fontFamily: 'PatrickHand' }}
                >
                  Enter Access Code
                </Text>
                <Text 
                  className="text-[#597362] text-lg font-semibold mt-0.5"
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                >
                  Provided by your doctor or family caregiver
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsCodeModalOpen(false)}
                className="p-2 bg-white rounded-full border border-[#E8E2D8]"
              >
                <X size={20} color="#718096" />
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-3xl p-5 border border-[#EFEBE4] mb-4 shadow-sm">
              <TextInput
                value={code}
                onChangeText={(val) => {
                  setCode(val);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="e.g. TEA-204"
                placeholderTextColor="#A0AEC0"
                autoCapitalize="characters"
                autoCorrect={false}
                style={{
                  fontFamily: 'Nunito-Bold',
                  letterSpacing: 4,
                }}
                className="bg-[#FAF7F2] border-2 border-[#C2DEC8] text-[#2C503A] rounded-2xl px-5 py-4 text-center text-4xl font-black min-h-[68px]"
                accessibilityLabel="Access Code Input"
              />

              {errorMessage ? (
                <View className="flex-row items-center bg-[#FDF2F2] border border-[#F8D7D7] p-3 rounded-2xl mt-3">
                  <AlertCircle size={16} color="#C53030" />
                  <Text 
                    className="text-[#9B2C2C] text-lg font-bold ml-2 flex-1"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    {errorMessage}
                  </Text>
                </View>
              ) : null}
            </View>

            <Button
              title="Unlock My Activities"
              variant="primary"
              size="large"
              loading={loading}
              onPress={handlePatientCodeSubmit}
            />

            <View className="items-center mt-3">
              <VoiceButton
                textToSpeak="Type the 6-letter code given by your family helper and tap Unlock."
                label="Voice Help"
              />
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}
