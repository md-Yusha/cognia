import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  Bell, 
  CheckCircle2, 
  LogOut,
  ChevronRight, 
  MessageCircle,
  Heart,
  Mic,
} from 'lucide-react-native';
import { CalmDay } from '../../src/components/CalmDay';
import { VoiceButton } from '../../src/components/ui/VoiceButton';
import { VoiceAnswerModal } from '../../src/components/ui/VoiceAnswerModal';
import { ResponsiveContainer } from '../../src/components/ui/ResponsiveContainer';
import { usePatientStore } from '../../src/store/usePatientStore';
import { speakPrompt } from '../../src/services/ttsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export default function PatientHomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { patient, reminders, acknowledgeReminder, logoutPatient } = usePatientStore();

  const patientName = patient?.name || 'Friend';
  const [waterDone, setWaterDone] = useState(false);
  const [teaDone, setTeaDone] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const dateStrToday = new Date().toDateString();
  const waterKey = `cognia_water_${dateStrToday}`;
  const teaKey = `cognia_tea_${dateStrToday}`;

  const handleVoiceAnswer = (transcript: string) => {
    const lower = transcript.toLowerCase();
    if (lower.includes('water') || lower.includes('drank')) {
      markWater();
    } else if (lower.includes('tea')) {
      markTea();
    } else if (lower.includes('medicine') || lower.includes('took')) {
      if (activeReminders.length > 0) {
        acknowledgeReminder(activeReminders[0].id);
      }
    }
  };

  useEffect(() => {
    if (patient?.preferredLanguage && patient.preferredLanguage !== i18n.language) {
      i18n.changeLanguage(patient.preferredLanguage);
    }
  }, [patient?.preferredLanguage]);

  useEffect(() => {
    AsyncStorage.getItem(waterKey).then((v) => setWaterDone(v === 'yes'));
    AsyncStorage.getItem(teaKey).then((v) => setTeaDone(v === 'yes'));
    const welcomeMsg = t('welcome_speech', { name: patientName });
    speakPrompt(welcomeMsg, (i18n.language || 'en') as any);
  }, [patientName, i18n.language]);

  const markWater = async () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setWaterDone(true);
    await AsyncStorage.setItem(waterKey, 'yes');
    speakPrompt(t('water_speech'), (i18n.language || 'en') as any);

    if (patient) {
      const { logPatientActivity } = await import('../../src/services/activityService');
      logPatientActivity({
        patientId: patient.id,
        type: 'hydration',
        title: 'Drank Daily Water',
        details: 'Confirmed 1 fresh glass of water.',
        icon: '💧',
        whyClinical: 'Vital hydration: Drinking water promotes brain metabolic circulation and prevents dehydration-induced disorientation.',
      }).catch(() => {});
    }
  };

  const markTea = async () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setTeaDone(true);
    await AsyncStorage.setItem(teaKey, 'yes');
    speakPrompt('Wonderful! Enjoy your warm cup of Assam tea.', (i18n.language || 'en') as any);

    if (patient) {
      const { logPatientActivity } = await import('../../src/services/activityService');
      logPatientActivity({
        patientId: patient.id,
        type: 'tea',
        title: 'Enjoyed Daily Tea',
        details: 'Had warm cup of traditional tea.',
        icon: '☕',
        whyClinical: 'Sensory grounding & morning routine: Traditional tea ritual triggers positive emotional recall and daily calming.',
      }).catch(() => {});
    }
  };

  const handleLogout = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    await logoutPatient();
    router.replace('/');
  };

  const activeReminders = reminders.filter((r) => r.isActive && !r.lastAcknowledgedAt);
  const todayName = new Date().toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FAF7F2' }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 50 }}
      keyboardShouldPersistTaps="handled"
    >
      <ResponsiveContainer maxWidth="sm">
        {/* Top Minimal Bar */}
        <View className="flex-row items-center justify-end pt-4 mb-4">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogout}
            className="flex-row items-center bg-white border border-[#CBD5E1] px-3.5 py-1.5 rounded-full"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <LogOut size={13} color="#64748B" />
            <Text 
              className="text-[#64748B] font-bold ml-1.5 text-xs"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              {t('exit')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Minimal Greeting Header */}
        <View className="mb-4">
          <Text 
            className="text-xs text-[#16704A] font-bold uppercase tracking-wider mb-0.5"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            {todayName} • {t('safe_at_home')}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text 
              className="text-2xl text-[#1E293B] font-bold flex-1 mr-2"
              style={{ fontFamily: 'Nunito-Bold' }}
              numberOfLines={1}
            >
              {t('welcome', { name: patientName })}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <TouchableOpacity
                onPress={() => setIsVoiceModalOpen(true)}
                activeOpacity={0.82}
                className="flex-row items-center bg-[#EBF7F0] border border-[#86EFAC] px-3 py-1.5 rounded-full"
              >
                <Mic size={14} color="#16704A" />
                <Text className="text-xs font-bold text-[#16704A] ml-1">Speak</Text>
              </TouchableOpacity>
              <VoiceButton
                compact
                textToSpeak={t('welcome_speech', { name: patientName })}
                label={t('listen')}
              />
            </View>
          </View>
        </View>

        <CalmDay patientName={patientName} />

        {/* Daily Hydration Pill (Compact) */}
        <View 
          className={`p-3.5 rounded-2xl border mb-3 flex-row items-center justify-between ${
            waterDone ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FFF8F3] border-[#FBDCC8]'
          }`}
        >
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-2.5">{waterDone ? '💧' : '🫖'}</Text>
            <View className="flex-1">
              <Text className="text-[#1E293B] text-sm font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                {waterDone ? t('hydration_done') : t('hydration_question')}
              </Text>
              <Text className="text-[#64748B] text-xs font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                {waterDone ? t('hydration_done_sub') : t('hydration_subtitle')}
              </Text>
            </View>
          </View>

          {!waterDone ? (
            <TouchableOpacity
              onPress={markWater}
              activeOpacity={0.84}
              className="bg-[#16704A] px-3 py-1.5 rounded-full flex-row items-center"
            >
              <CheckCircle2 size={13} color="#FFFFFF" />
              <Text className="text-white text-xs font-bold ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                {t('i_drank')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="bg-[#DCFCE7] px-2.5 py-1 rounded-full border border-[#86EFAC] flex-row items-center">
              <CheckCircle2 size={12} color="#16A34A" />
              <Text className="text-[#15803D] text-xs font-bold ml-1">Drank</Text>
            </View>
          )}
        </View>

        {/* Daily Assam Tea Check-in Pill */}
        <View 
          className={`p-3.5 rounded-2xl border mb-4 flex-row items-center justify-between ${
            teaDone ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FFF9F5] border-[#FDE6D2]'
          }`}
        >
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-2xl mr-2.5">☕</Text>
            <View className="flex-1">
              <Text className="text-[#1E293B] text-sm font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                {teaDone ? 'Tea Time Enjoyed' : 'Have you had your warm tea today?'}
              </Text>
              <Text className="text-[#64748B] text-xs font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                {teaDone ? 'Traditional tea habit logged' : 'Relax with warm morning or afternoon tea'}
              </Text>
            </View>
          </View>

          {!teaDone ? (
            <TouchableOpacity
              onPress={markTea}
              activeOpacity={0.84}
              className="bg-[#D96B27] px-3 py-1.5 rounded-full flex-row items-center"
            >
              <CheckCircle2 size={13} color="#FFFFFF" />
              <Text className="text-white text-xs font-bold ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                Had Tea
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="bg-[#DCFCE7] px-2.5 py-1 rounded-full border border-[#86EFAC] flex-row items-center">
              <CheckCircle2 size={12} color="#16A34A" />
              <Text className="text-[#15803D] text-xs font-bold ml-1">Enjoyed</Text>
            </View>
          )}
        </View>

        {/* Active Reminder (if any) */}
        {activeReminders.length > 0 ? (
          <View 
            className="bg-white border-2 border-[#FBDCC8] p-3.5 rounded-2xl mb-4"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-full bg-[#FFF0E6] items-center justify-center mr-2.5">
                  <Bell size={15} color="#D96B27" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#1E293B] text-sm font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                    {activeReminders[0].title}
                  </Text>
                  <Text className="text-[#D96B27] text-xs font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                    ⏰ {activeReminders[0].time} • {activeReminders[0].dosageOrDetails}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
                  acknowledgeReminder(activeReminders[0].id);
                  speakPrompt(t('reminder_done_speech'), (i18n.language || 'en') as any);
                }}
                className="bg-[#16704A] px-3 py-1.5 rounded-full"
              >
                <Text className="text-white text-xs font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                  {t('done')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* 4 Cognitive Games (Core Focus) */}
        <Text 
          className="text-lg text-[#1E293B] font-bold mb-3 px-0.5"
          style={{ fontFamily: 'Nunito-Bold' }}
        >
          {t('daily_activities')}
        </Text>

        <View className="gap-3 mb-5">
          {/* Game 1: Rhino Memory Match */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/(patient)/games/memory_match');
            }}
            className="bg-white border-2 border-[#CCEAD7] rounded-2xl p-4 flex-row items-center justify-between"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="w-12 h-12 bg-[#F0F9F4] rounded-xl items-center justify-center mr-3 border border-[#BDE5CB] p-1.5">
              <Text className="text-3xl">🦏</Text>
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-base text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                {t('game_memory')}
              </Text>
              <Text className="text-[#64748B] text-xs mt-0.5 font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                {t('game_memory_desc')}
              </Text>
            </View>
            <ChevronRight size={18} color="#16704A" />
          </TouchableOpacity>

          {/* Game 2: Daily Routine */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/(patient)/games/daily_routine');
            }}
            className="bg-white border-2 border-[#FBDCC8] rounded-2xl p-4 flex-row items-center justify-between"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="w-12 h-12 bg-[#FFF8F3] rounded-xl items-center justify-center mr-3 border border-[#FAD0B6] p-1.5">
              <Text className="text-3xl">☕</Text>
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-base text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                {t('game_routine')}
              </Text>
              <Text className="text-[#64748B] text-xs mt-0.5 font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                {t('game_routine_desc')}
              </Text>
            </View>
            <ChevronRight size={18} color="#D96B27" />
          </TouchableOpacity>

          {/* Game 3: Pattern Match */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/(patient)/games/pattern_match');
            }}
            className="bg-white border-2 border-[#E3D7EE] rounded-2xl p-4 flex-row items-center justify-between"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="w-12 h-12 bg-[#F8F6FB] rounded-xl items-center justify-center mr-3 border border-[#DDD0E8] p-1.5">
              <Text className="text-3xl">🎋</Text>
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-base text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                {t('game_pattern')}
              </Text>
              <Text className="text-[#64748B] text-xs mt-0.5 font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                {t('game_pattern_desc')}
              </Text>
            </View>
            <ChevronRight size={18} color="#6A4690" />
          </TouchableOpacity>

          {/* Game 4: Focus & Tap */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/(patient)/games/focus_tap');
            }}
            className="bg-white border-2 border-[#CCE7EF] rounded-2xl p-4 flex-row items-center justify-between"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="w-12 h-12 bg-[#F1F8FA] rounded-xl items-center justify-center mr-3 border border-[#B8DFEA] p-1.5">
              <Text className="text-3xl">🍃</Text>
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-base text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                {t('game_focus')}
              </Text>
              <Text className="text-[#64748B] text-xs mt-0.5 font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                {t('game_focus_desc')}
              </Text>
            </View>
            <ChevronRight size={18} color="#216174" />
          </TouchableOpacity>

          {/* Game 5: Family Memory Album (Reminiscence) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/(patient)/games/reminiscence');
            }}
            className="bg-white border-2 border-[#FFE4E6] rounded-2xl p-4 flex-row items-center justify-between"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="w-12 h-12 bg-[#FFF1F2] rounded-xl items-center justify-center mr-3 border border-[#FECDD3] p-1.5">
              <Text className="text-3xl">🌸</Text>
            </View>
            <View className="flex-1 mr-2">
              <View className="flex-row items-center">
                <Text className="text-base text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                  Family Memory Album
                </Text>
                <View className="bg-[#FFE4E6] px-2 py-0.5 rounded-full ml-2">
                  <Text className="text-[10px] font-bold text-[#E11D48]">NEW</Text>
                </View>
              </View>
              <Text className="text-[#64748B] text-xs mt-0.5 font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                Look at familiar family photos and remember loving moments
              </Text>
            </View>
            <ChevronRight size={18} color="#BE123C" />
          </TouchableOpacity>
        </View>

        {/* Minimal Footer: Chat with Family */}
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => router.push('/(patient)/chat')}
          className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 flex-row items-center justify-between"
          style={{
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <View className="flex-row items-center">
            <MessageCircle size={18} color="#16704A" />
            <Text className="text-sm text-[#1E293B] font-bold ml-2" style={{ fontFamily: 'Nunito-Bold' }}>
              {t('message_family')}
            </Text>
          </View>
          <ChevronRight size={16} color="#94A3B8" />
        </TouchableOpacity>

        {/* Voice Answering Modal for Elder */}
        <VoiceAnswerModal
          visible={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onAnswer={handleVoiceAnswer}
          language={(patient?.preferredLanguage || 'en') as any}
          promptQuestion={`Hello ${patientName}, how are you feeling? Speak or tap to answer!`}
          quickPhrases={['Yes, I took medicine', 'I drank my water', 'I had warm Assam tea', 'I feel good today']}
        />
      </ResponsiveContainer>
    </ScrollView>
  );
}
