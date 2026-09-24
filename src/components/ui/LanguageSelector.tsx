import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePatientStore } from '../../store/usePatientStore';
import * as Haptics from 'expo-haptics';

const LANGUAGES = [
  { code: 'as', label: 'Assamese', native: 'অসমীয়া', bg: '#FDF6F2', border: '#F4D8C9', activeBg: '#C87453' },
  { code: 'kha', label: 'Khasi', native: 'Khasi', bg: '#F8F6FA', border: '#DDD3E7', activeBg: '#836EA1' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', bg: '#F2F8FA', border: '#C4E3EB', activeBg: '#336B7B' },
  { code: 'en', label: 'English', native: 'English', bg: '#F2F7F4', border: '#C7DECD', activeBg: '#3D6C4E' },
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const { updateLanguage } = usePatientStore();

  const handleSelectLanguage = (code: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    i18n.changeLanguage(code);
    updateLanguage(code);
  };

  return (
    <View className="my-2 items-center">
      <Text 
        className="text-[#5D5548] text-lg font-bold uppercase tracking-wider mb-2.5"
        style={{ fontFamily: 'Nunito-SemiBold' }}
      >
        Language • ভাষা • Ktien
      </Text>

      <View className="flex-row flex-wrap gap-2 justify-center">
        {LANGUAGES.map((lang) => {
          const isSelected = i18n.language === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage(lang.code)}
              style={{
                backgroundColor: isSelected ? lang.activeBg : '#FFFFFF',
                borderColor: isSelected ? lang.activeBg : '#E6E1D7',
              }}
              className="px-4 py-2 rounded-full border shadow-sm"
            >
              <Text
                style={{
                  fontFamily: isSelected ? 'Nunito-Bold' : 'Nunito-SemiBold',
                  color: isSelected ? '#FFFFFF' : '#475569',
                }}
                className="text-xl"
              >
                {lang.native}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
