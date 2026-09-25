import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bell, CheckCircle2, Volume2, Pill, Droplets, Calendar, Clock } from 'lucide-react-native';
import { Button } from '../../src/components/ui/Button';
import { VoiceButton } from '../../src/components/ui/VoiceButton';
import { ResponsiveContainer } from '../../src/components/ui/ResponsiveContainer';
import { Card } from '../../src/components/ui/Card';
import { usePatientStore } from '../../src/store/usePatientStore';
import { speakPrompt } from '../../src/services/ttsService';
import * as Haptics from 'expo-haptics';

export default function PatientRemindersScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { reminders, acknowledgeReminder } = usePatientStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'medicine':
        return <Pill size={24} color="#16704A" />;
      case 'hydration':
        return <Droplets size={24} color="#0284C7" />;
      case 'appointment':
        return <Calendar size={24} color="#7C3AED" />;
      default:
        return <Clock size={24} color="#D96B27" />;
    }
  };

  const handleDone = (id: string, title: string) => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    acknowledgeReminder(id);
    speakPrompt(`Great job! We marked ${title} as completed.`, (i18n.language || 'en') as any);
  };

  const handleSnooze = (title: string) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    speakPrompt(`We will remind you again about ${title} in 15 minutes.`, (i18n.language || 'en') as any);
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#FAF7F2' }} 
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 64 }}
    >
      <ResponsiveContainer maxWidth="md">
        {/* Header */}
        <View className="flex-row items-center justify-between pt-4 mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.82}
            className="flex-row items-center bg-white border border-[#CBD5E1] px-3.5 py-1.5 rounded-full"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <ArrowLeft size={15} color="#475569" />
            <Text 
              className="text-[#475569] font-bold ml-1.5 text-sm"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              {t('back')}
            </Text>
          </TouchableOpacity>

          <VoiceButton
            compact
            textToSpeak={t('reminders_subtitle')}
            label={t('voice_help')}
          />
        </View>

        {/* Title Card */}
        <View 
          className="bg-[#FFF8F3] border-2 border-[#FBDCC8] rounded-[28px] p-5 mb-5"
          style={{
            shadowColor: '#9A431D',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.07,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-center mb-1">
            <Bell size={20} color="#D96B27" />
            <Text 
              className="text-2xl text-[#9A431D] font-bold ml-2"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              {t('reminders_title')}
            </Text>
          </View>
          <Text 
            className="text-[#B95217] text-center text-sm font-semibold mt-1"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            {t('reminders_subtitle')}
          </Text>
        </View>

        {/* Reminders List */}
        <View className="gap-3.5 mb-6">
          {reminders.length === 0 ? (
            <View 
              className="bg-white border-2 border-[#EDE7DD] p-8 rounded-[30px] items-center text-center"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text className="text-4xl mb-2">🌸</Text>
              <Text 
                className="text-2xl text-[#1E293B] font-bold text-center"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                {t('all_caught_up')}
              </Text>
              <Text 
                className="text-[#64748B] text-sm text-center mt-1 font-semibold"
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                {t('no_pending_reminders')}
              </Text>
            </View>
          ) : (
            reminders.map((rem) => {
              const isDoneToday = !!rem.lastAcknowledgedAt;

              return (
                <View
                  key={rem.id}
                  className={`p-5 rounded-[26px] border-2 ${
                    isDoneToday 
                      ? 'bg-[#F0FDF4] border-[#BBF7D0]' 
                      : 'bg-white border-[#EDE7DD]'
                  }`}
                  style={{
                    shadowColor: '#3A3226',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 border ${
                        isDoneToday ? 'bg-white border-[#86EFAC]' : 'bg-[#FAF8F5] border-[#CBD5E1]'
                      }`}>
                        {getIcon(rem.type)}
                      </View>
                      <View className="flex-1">
                        <Text 
                          className={`text-lg font-bold ${isDoneToday ? 'text-[#166534]' : 'text-[#1E293B]'}`}
                          style={{ fontFamily: 'Nunito-Bold' }}
                        >
                          {rem.title}
                        </Text>
                        <Text 
                          className="text-[#D96B27] font-bold text-sm mt-0.5"
                          style={{ fontFamily: 'Nunito-Bold' }}
                        >
                          ⏰ {rem.time}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => speakPrompt(`${rem.title}. ${rem.dosageOrDetails}`, (i18n.language || 'en') as any)}
                      className="w-9 h-9 bg-[#FAF8F5] rounded-full border border-[#CBD5E1] items-center justify-center"
                    >
                      <Volume2 size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  {rem.dosageOrDetails ? (
                    <Text 
                      className={`text-sm mb-4 p-3 rounded-xl ${
                        isDoneToday 
                          ? 'bg-white/80 text-[#166534] font-semibold' 
                          : 'bg-[#FAF8F5] text-[#475569] border border-[#E2DDD5] font-semibold'
                      }`}
                      style={{ fontFamily: 'Nunito-SemiBold' }}
                    >
                      {rem.dosageOrDetails}
                    </Text>
                  ) : null}

                  {isDoneToday ? (
                    <View className="flex-row items-center justify-center bg-white border border-[#86EFAC] py-2.5 rounded-full">
                      <CheckCircle2 size={16} color="#16704A" />
                      <Text 
                        className="text-[#16704A] font-bold text-sm ml-1.5"
                        style={{ fontFamily: 'Nunito-Bold' }}
                      >
                        {t('done')}
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row gap-2.5">
                      <TouchableOpacity
                        onPress={() => handleDone(rem.id, rem.title)}
                        activeOpacity={0.84}
                        className="flex-1 bg-[#16704A] py-3 rounded-xl items-center justify-center flex-row"
                        style={{
                          shadowColor: '#16704A',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.15,
                          shadowRadius: 3,
                          elevation: 1,
                        }}
                      >
                        <CheckCircle2 size={16} color="#FFFFFF" />
                        <Text className="text-white font-bold ml-1.5 text-base" style={{ fontFamily: 'Nunito-Bold' }}>
                          {t('i_took_it')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleSnooze(rem.title)}
                        activeOpacity={0.8}
                        className="px-4 py-3 bg-[#FAF8F5] border border-[#CBD5E1] rounded-xl items-center justify-center"
                      >
                        <Text className="text-[#64748B] font-bold text-sm" style={{ fontFamily: 'Nunito-Bold' }}>
                          {t('remind_later')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ResponsiveContainer>
    </ScrollView>
  );
}
