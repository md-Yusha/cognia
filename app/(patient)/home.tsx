import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, 
  Bell, 
  CheckCircle, 
  LogOut,
  Volume2,
  ChevronRight,
  Sun,
  Star,
  Heart
} from 'lucide-react-native';
import { OfflineBadge } from '../../src/components/ui/OfflineBadge';
import { LanguageSelector } from '../../src/components/ui/LanguageSelector';
import { VoiceButton } from '../../src/components/ui/VoiceButton';
import { CalmDay } from '../../src/components/CalmDay';
import { usePatientStore } from '../../src/store/usePatientStore';
import { speakPrompt } from '../../src/services/ttsService';
import * as Haptics from 'expo-haptics';

export default function PatientHomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { patient, reminders, acknowledgeReminder, recentSessions, logoutPatient } = usePatientStore();

  const patientName = patient?.name || (i18n.language === 'as' ? 'ককা / আইতা' : 'Friend');

  useEffect(() => {
    const welcomeMsg = `Welcome ${patientName}. Tap any of today's calming brain activities below.`;
    speakPrompt(welcomeMsg, (i18n.language || 'en') as any);
  }, [patientName]);

  const handleLogout = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    await logoutPatient();
    router.replace('/');
  };

  const activeReminders = reminders.filter((r) => r.isActive && !r.lastAcknowledgedAt);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const completedToday = new Set(
    recentSessions
      .filter((session) => session.timestamp >= startOfDay.getTime())
      .map((session) => session.gameType)
  ).size;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FAF7F2' }}
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 60 }}
    >
      {/* Top Bar */}
      <View className="flex-row items-center justify-between pt-6 mb-3">
        <OfflineBadge />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          className="flex-row items-center bg-white border border-[#E8E2D8] px-4 py-1.5 rounded-full shadow-sm"
        >
          <LogOut size={14} color="#64748B" />
          <Text 
            className="text-[#475569] font-bold ml-1.5 text-lg"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            {t('logout')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Serene Greeting Card */}
      <View 
        className="bg-[#EBF4EE] rounded-[32px] p-6 border border-[#CDE3D5] mb-4"
        style={{
          shadowColor: '#3D6C4E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 rounded-full bg-white/80 items-center justify-center mr-2.5 border border-[#CDE3D5]">
              <Sun size={24} color="#D97706" />
            </View>
            <Text 
              className="text-4xl text-[#2C503A] flex-1"
              style={{ fontFamily: 'PatrickHand' }}
            >
              {t('welcome', { name: patientName })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => speakPrompt(`Welcome ${patientName}. Tap any activity card below to start playing.`, i18n.language as any)}
            className="p-3 bg-white rounded-full border border-[#C2DEC8] shadow-sm"
          >
            <Volume2 size={20} color="#3D6C4E" />
          </TouchableOpacity>
        </View>

        <Text 
          className="text-[#4A7C59] text-xl font-semibold"
          style={{ fontFamily: 'Nunito-SemiBold' }}
        >
          {t('daily_activities')}
        </Text>

        {/* Today's Gentle Progress */}
        <View className="bg-white/80 rounded-2xl p-3 mt-3 flex-row items-center justify-between border border-[#CDE3D5]/60">
          <View className="flex-row items-center">
            <Star size={18} color="#D97706" />
            <Text 
              className="text-[#2C503A] font-bold text-lg ml-2"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Today's Gentle Progress: {completedToday} of 4 activities
            </Text>
          </View>
          <View className="w-16 h-2 bg-[#E2EEE5] rounded-full overflow-hidden">
            <View 
              className="h-full bg-[#4A7C59] rounded-full" 
              style={{ width: `${(completedToday / 4) * 100}%` }}
            />
          </View>
        </View>
      </View>

      <CalmDay patientName={patientName} />

      <TouchableOpacity
        onPress={() => router.push('/(patient)/chat')}
        className="bg-[#FDF3ED] border border-[#F4D8C9] rounded-[28px] p-5 mb-4"
      >
        <Text className="text-[#8A4226] text-4xl" style={{ fontFamily: 'PatrickHand' }}>Talk with family</Text>
        <Text className="text-[#597362] text-xl mt-1" style={{ fontFamily: 'Nunito-SemiBold' }}>
          Send a message. Voice opens when your caregiver is in the app.
        </Text>
      </TouchableOpacity>

      {/* Language Bar */}
      <View className="bg-white rounded-2xl p-2 border border-[#EFEBE4] shadow-sm mb-4">
        <LanguageSelector />
      </View>

      {/* Daily Reminders Card (if any active) */}
      {activeReminders.length > 0 && (
        <View 
          className="bg-[#FDF3ED] rounded-[30px] p-5 border border-[#F5D8C9] mb-6"
          style={{
            shadowColor: '#8A4226',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-9 h-9 bg-white rounded-full items-center justify-center mr-2 border border-[#F5D8C9]">
                <Bell size={18} color="#A95838" />
              </View>
              <Text 
                className="text-3xl text-[#864127]"
                style={{ fontFamily: 'PatrickHand' }}
              >
                {t('reminders_title')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(patient)/reminders')}>
              <Text 
                className="text-[#A95838] font-bold text-lg underline"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {activeReminders.slice(0, 2).map((item) => (
            <View
              key={item.id}
              className="bg-white border border-[#F4D8C9] p-4 rounded-2xl mb-2 flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-1 mr-3">
                <Text 
                  className="text-[#2D3748] text-xl font-bold"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  {item.title}
                </Text>
                <Text 
                  className="text-[#C87453] text-lg font-semibold mt-0.5"
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                >
                  ⏰ {item.time} • {item.dosageOrDetails}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
                  acknowledgeReminder(item.id);
                  speakPrompt("Thank you! Marked as done.", i18n.language as any);
                }}
                className="bg-[#4A7C59] px-4 py-2 rounded-full flex-row items-center shadow-sm"
              >
                <CheckCircle size={15} color="#FFFFFF" />
                <Text 
                  className="text-white font-bold ml-1.5 text-lg"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* 4 Cultural Cognitive Games Header */}
      <View className="flex-row items-center justify-between mb-3 mt-1">
        <Text 
          className="text-4xl text-[#2B3A30]"
          style={{ fontFamily: 'PatrickHand' }}
        >
          {t('games_title')}
        </Text>
        <Sparkles size={20} color="#4A7C59" />
      </View>

      <View className="gap-3.5">
        {/* Game 1: Rhino Memory Match */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            router.push('/(patient)/games/memory_match');
          }}
          className="bg-[#EBF4EE] border border-[#CDE3D5] rounded-[30px] p-5 shadow-sm flex-row items-center justify-between"
          style={{
            shadowColor: '#3D6C4E',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center mr-4 border border-[#C2DEC8] shadow-sm">
            <Text className="text-4xl">🦏</Text>
          </View>
          <View className="flex-1 mr-2">
            <View className="bg-white/80 self-start px-2 py-0.5 rounded-full mb-1 border border-[#C2DEC8]">
              <Text 
                className="text-[#2C503A] text-[10px] font-bold uppercase tracking-wider"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                Assam Wildlife
              </Text>
            </View>
            <Text 
              className="text-3xl text-[#274733]"
              style={{ fontFamily: 'PatrickHand' }}
            >
              {t('game_memory')}
            </Text>
            <Text 
              className="text-[#437756] text-lg mt-0.5 font-semibold"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              Find matching picture pairs of Kaziranga animals & tea pots.
            </Text>
          </View>
          <ChevronRight size={24} color="#335D43" />
        </TouchableOpacity>

        {/* Game 2: NER Daily Routine Recall */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            router.push('/(patient)/games/daily_routine');
          }}
          className="bg-[#FDF3ED] border border-[#F4D8C9] rounded-[30px] p-5 shadow-sm flex-row items-center justify-between"
          style={{
            shadowColor: '#8A4226',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center mr-4 border border-[#ECC0AC] shadow-sm">
            <Text className="text-4xl">☕</Text>
          </View>
          <View className="flex-1 mr-2">
            <View className="bg-white/80 self-start px-2 py-0.5 rounded-full mb-1 border border-[#ECC0AC]">
              <Text 
                className="text-[#864127] text-[10px] font-bold uppercase tracking-wider"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                Morning Schedule
              </Text>
            </View>
            <Text 
              className="text-3xl text-[#864127]"
              style={{ fontFamily: 'PatrickHand' }}
            >
              {t('game_routine')}
            </Text>
            <Text 
              className="text-[#A95838] text-lg mt-0.5 font-semibold"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              Arrange morning tea, medicine, and tasks in proper sequence.
            </Text>
          </View>
          <ChevronRight size={24} color="#864127" />
        </TouchableOpacity>

        {/* Game 3: Bamboo Pattern Match */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            router.push('/(patient)/games/pattern_match');
          }}
          className="bg-[#F5F0F8] border border-[#DDD3E7] rounded-[30px] p-5 shadow-sm flex-row items-center justify-between"
          style={{
            shadowColor: '#573D6E',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center mr-4 border border-[#C3B4D3] shadow-sm">
            <Text className="text-4xl">🎋</Text>
          </View>
          <View className="flex-1 mr-2">
            <View className="bg-white/80 self-start px-2 py-0.5 rounded-full mb-1 border border-[#C3B4D3]">
              <Text 
                className="text-[#503D68] text-[10px] font-bold uppercase tracking-wider"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                Handloom Patterns
              </Text>
            </View>
            <Text 
              className="text-3xl text-[#503D68]"
              style={{ fontFamily: 'PatrickHand' }}
            >
              {t('game_pattern')}
            </Text>
            <Text 
              className="text-[#675283] text-lg mt-0.5 font-semibold"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              Complete the missing traditional handloom motif.
            </Text>
          </View>
          <ChevronRight size={24} color="#503D68" />
        </TouchableOpacity>

        {/* Game 4: Tea Garden Focus & Tap */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            router.push('/(patient)/games/focus_tap');
          }}
          className="bg-[#EDF6F8] border border-[#C4E3EB] rounded-[30px] p-5 shadow-sm flex-row items-center justify-between"
          style={{
            shadowColor: '#2C5E6E',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center mr-4 border border-[#9ECFDA] shadow-sm">
            <Text className="text-4xl">🍃</Text>
          </View>
          <View className="flex-1 mr-2">
            <View className="bg-white/80 self-start px-2 py-0.5 rounded-full mb-1 border border-[#9ECFDA]">
              <Text 
                className="text-[#2C5E6E] text-[10px] font-bold uppercase tracking-wider"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                Focus & Concentration
              </Text>
            </View>
            <Text 
              className="text-3xl text-[#2C5E6E]"
              style={{ fontFamily: 'PatrickHand' }}
            >
              {t('game_focus')}
            </Text>
            <Text 
              className="text-[#43798A] text-lg mt-0.5 font-semibold"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              Tap the fresh green tea leaves as they appear in the garden.
            </Text>
          </View>
          <ChevronRight size={24} color="#2C5E6E" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
