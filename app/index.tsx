import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  AlertCircle, 
  KeyRound,
  ShieldCheck,
  Play
} from 'lucide-react-native';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { VoiceButton } from '../src/components/ui/VoiceButton';
import { LanguageSelector } from '../src/components/ui/LanguageSelector';
import { ResponsiveContainer } from '../src/components/ui/ResponsiveContainer';
import { CogniaLogo } from '../src/components/ui/CogniaLogo';
import { resolvePatientCode } from '../src/services/codeService';
import { usePatientStore } from '../src/store/usePatientStore';
import { useCaregiverStore } from '../src/store/useCaregiverStore';
import * as Haptics from 'expo-haptics';

export default function LaunchScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { setPatient } = usePatientStore();
  const { caregiver } = useCaregiverStore();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Primary Action: Patient Code Entry
  const handleCodeSubmit = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage(t('error_empty_code'));
      return;
    }

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await resolvePatientCode(cleanCode);
      if (result && result.patient) {
        const activeLang = i18n.language && i18n.language !== 'en'
          ? i18n.language
          : (result.patient.preferredLanguage || i18n.language || 'en');
        if (i18n.language !== activeLang) {
          await i18n.changeLanguage(activeLang);
        }
        await setPatient({ ...result.patient, preferredLanguage: activeLang as any });
        router.replace('/(patient)/home');
      } else {
        setErrorMessage(t('error_invalid_code'));
      }
    } catch (error) {
      setErrorMessage(t('error_verify_failed'));
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
          paddingTop: 16, 
          paddingBottom: 40, 
          justifyContent: 'space-between' 
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ResponsiveContainer maxWidth="sm">
          {/* Top Bar: Caregiver Portal link */}
          <View className="flex-row items-center justify-end pt-4 mb-4">
            <TouchableOpacity
              onPress={handleCaregiverNav}
              activeOpacity={0.8}
              className="flex-row items-center bg-white border border-[#CBD5E1] px-4 py-2 rounded-full"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <ShieldCheck size={15} color="#16704A" />
              <Text 
                className="text-[#16704A] font-bold text-xs ml-1.5"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                {caregiver ? `${t('caregiver_portal')} ➔` : t('caregiver_signin')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Minimal Branding with Transparent Logo */}
          <View className="items-center mb-5">
            {/* Transparent Background Logo Component */}
            <View className="mb-2">
              <CogniaLogo size={68} />
            </View>

            <Text 
              className="text-3xl text-[#143825] font-bold tracking-tight"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              {t('app_title')}
            </Text>

            <Text 
              className="text-[#3D7351] text-sm font-semibold mt-0.5 text-center"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              {t('tagline')}
            </Text>

            {/* Language Selector */}
            <View className="w-full mt-3">
              <LanguageSelector />
            </View>
          </View>

          {/* Primary Patient Access Card */}
          <Card 
            variant="default" 
            className="p-6 mb-4 border-2 border-[#CCEAD7]"
            style={{
              shadowColor: '#16704A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View className="items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-[#FFF8F3] border border-[#FBDCC8] items-center justify-center mb-2">
                <KeyRound size={20} color="#D96B27" />
              </View>

              <Text 
                className="text-xl text-[#1E293B] font-bold text-center"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                {t('enter_patient_code')}
              </Text>

              <Text 
                className="text-[#64748B] text-xs font-semibold text-center mt-1"
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                {t('enter_code_desc')}
              </Text>
            </View>

            {/* Large Code Input */}
            <TextInput
              value={code}
              onChangeText={(val) => {
                setCode(val);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder={t('code_placeholder')}
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleCodeSubmit}
              style={{
                fontFamily: 'Nunito-Bold',
                letterSpacing: 3,
              }}
              className="bg-[#FAF8F5] border-2 border-[#CBD5E1] text-[#145332] rounded-2xl px-4 py-3.5 text-center text-2xl font-black min-h-[58px] mb-3"
              accessibilityLabel="Patient Access Code Input"
            />

            {errorMessage ? (
              <View className="flex-row items-center bg-[#FFF1F2] border border-[#FECDD3] p-3 rounded-xl mb-3">
                <AlertCircle size={15} color="#E11D48" />
                <Text 
                  className="text-[#BE123C] text-xs font-bold ml-2 flex-1"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <Button
              title={t('start_activities')}
              variant="primary"
              size="large"
              loading={loading}
              icon={<Play size={18} color="#FFFFFF" fill="#FFFFFF" />}
              onPress={handleCodeSubmit}
            />

            {/* Quick Voice Prompt */}
            <View className="items-center mt-3 pt-2 border-t border-[#F1EBE1]">
              <VoiceButton
                compact
                textToSpeak={t('voice_help_speech')}
                label={t('voice_help')}
              />
            </View>
          </Card>
        </ResponsiveContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
