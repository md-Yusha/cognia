import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePatientStore } from '../../store/usePatientStore';
import { Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const LANGUAGES = [
  { code: 'as', label: 'Assamese', native: 'অসমীয়া', region: 'Assam' },
  { code: 'kha', label: 'Khasi', native: 'Khasi', region: 'Meghalaya' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', region: 'Tripura / Barak' },
  { code: 'en', label: 'English', native: 'English', region: 'Universal' },
];

export const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { updateLanguage } = usePatientStore();

  const handleSelectLanguage = (code: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    i18n.changeLanguage(code);
    updateLanguage(code);
  };

  return (
    <View className="w-full my-1 items-center">
      <View className="flex-row items-center mb-2">
        <Globe size={13} color="#64748B" />
        <Text 
          className="text-[#64748B] text-xs font-bold uppercase tracking-wider ml-1.5"
          style={{ fontFamily: 'Nunito-Bold' }}
        >
          {t('select_language')}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2 justify-center w-full">
        {LANGUAGES.map((lang) => {
          const isSelected = i18n.language === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              activeOpacity={0.82}
              onPress={() => handleSelectLanguage(lang.code)}
              className={`px-4 py-2 rounded-full border flex-row items-center ${
                isSelected 
                  ? 'bg-[#16704A] border-[#115438]' 
                  : 'bg-white border-[#E2DDD5]'
              }`}
              style={{
                shadowColor: isSelected ? '#16704A' : '#736B5E',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected ? 0.18 : 0.04,
                shadowRadius: 6,
                elevation: isSelected ? 2 : 1,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Nunito-Bold',
                  color: isSelected ? '#FFFFFF' : '#334155',
                }}
                className="text-base"
              >
                {lang.native}
              </Text>
              {isSelected ? (
                <View className="w-1.5 h-1.5 rounded-full bg-white ml-2" />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
