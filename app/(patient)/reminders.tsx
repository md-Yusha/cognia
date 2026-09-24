import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bell, CheckCircle, Volume2, Pill, Droplet, Calendar, Clock } from 'lucide-react-native';
import { Button } from '../../src/components/ui/Button';
import { VoiceButton } from '../../src/components/ui/VoiceButton';
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
        return <Pill size={28} color="#4A7C59" />;
      case 'hydration':
        return <Droplet size={28} color="#529DB1" />;
      case 'appointment':
        return <Calendar size={28} color="#836EA1" />;
      default:
        return <Clock size={28} color="#C87453" />;
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
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 50 }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between pt-6 mb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center bg-white border border-[#E8E2D8] px-4 py-2 rounded-full shadow-sm"
        >
          <ArrowLeft size={16} color="#4A5568" />
          <Text 
            className="text-[#4A5568] font-bold ml-1.5 text-lg"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Back
          </Text>
        </TouchableOpacity>

        <VoiceButton
          textToSpeak="Here are your daily medicine and water reminders. Tap the green button when you take them."
          label={t('voice_assist')}
        />
      </View>

      {/* Title Card */}
      <View 
        className="bg-[#FDF3ED] border border-[#F4D8C9] rounded-[32px] p-6 mb-6"
        style={{
          shadowColor: '#8A4226',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-center mb-1">
          <Bell size={24} color="#864127" />
          <Text 
            className="text-4xl text-[#864127] ml-2"
            style={{ fontFamily: 'PatrickHand' }}
          >
            {t('reminders_title')}
          </Text>
        </View>
        <Text 
          className="text-[#A95838] text-center text-xl font-semibold mt-1"
          style={{ fontFamily: 'Nunito-SemiBold' }}
        >
          Daily care schedule set by your caregiver.
        </Text>
      </View>

      {/* Reminders List */}
      <View className="gap-3.5 mb-6">
        {reminders.length === 0 ? (
          <View 
            className="bg-white border border-[#EFEBE4] p-8 rounded-[32px] items-center text-center shadow-sm"
          >
            <Text className="text-4xl mb-2">🌸</Text>
            <Text 
              className="text-4xl text-[#2B3A30] text-center"
              style={{ fontFamily: 'PatrickHand' }}
            >
              All Caught Up!
            </Text>
            <Text 
              className="text-[#597362] text-xl text-center mt-1"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              You have no pending medicine or water reminders for right now.
            </Text>
          </View>
        ) : (
          reminders.map((rem) => {
            const isDoneToday = !!rem.lastAcknowledgedAt;

          return (
            <View
              key={rem.id}
              className={isDoneToday ? 'p-6 rounded-3xl border bg-[#EBF4EE] border-[#CDE3D5]' : 'p-6 rounded-3xl border bg-white border-[#EFEBE4]'}
              style={{
                shadowColor: '#7A6855',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-row items-center flex-1">
                  <View className="w-14 h-14 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D8] items-center justify-center mr-3">
                    {getIcon(rem.type)}
                  </View>
                  <View className="flex-1">
                    <Text 
                      className={`text-2xl font-bold ${isDoneToday ? 'text-[#2C503A]' : 'text-[#2D3748]'}`}
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      {rem.title}
                    </Text>
                    <Text 
                      className="text-[#C87453] font-bold text-xl mt-0.5"
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      ⏰ {rem.time}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => speakPrompt(`${rem.title}. ${rem.dosageOrDetails}`, (i18n.language || 'en') as any)}
                  className="p-2.5 bg-[#FAF8F5] rounded-full border border-[#E8E2D8]"
                >
                  <Volume2 size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {rem.dosageOrDetails && (
                <Text 
                  className={isDoneToday ? 'text-xl mb-4 p-3.5 rounded-2xl bg-white/80 text-[#2C503A]' : 'text-xl mb-4 p-3.5 rounded-2xl bg-[#FAF8F5] text-[#4A5568] border border-[#EFEBE4]'}
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                >
                  {rem.dosageOrDetails}
                </Text>
              )}

              {isDoneToday ? (
                <View className="flex-row items-center justify-center bg-white border border-[#CDE3D5] py-3 rounded-full">
                  <CheckCircle size={18} color="#4A7C59" />
                  <Text 
                    className="text-[#2C503A] font-bold text-xl ml-2"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    Completed for Today
                  </Text>
                </View>
              ) : (
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      title={t('acknowledge')}
                      variant="primary"
                      size="large"
                      icon={<CheckCircle size={18} color="#FFFFFF" />}
                      onPress={() => handleDone(rem.id, rem.title)}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      title="Snooze"
                      variant="outline"
                      size="large"
                      onPress={() => handleSnooze(rem.title)}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        }))}
      </View>
    </ScrollView>
  );
}
