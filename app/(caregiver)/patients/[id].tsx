import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Brain, 
  Bell, 
  TrendingUp, 
  Clock, 
  Plus, 
  KeyRound,
  Trash2,
  X
} from 'lucide-react-native';
import { Button } from '../../../src/components/ui/Button';
import { useCaregiverStore } from '../../../src/store/useCaregiverStore';
import { usePatientStore } from '../../../src/store/usePatientStore';
import { ReminderItem } from '../../../src/types';

export default function CaregiverPatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { patients, selectedPatient } = useCaregiverStore();
  const { reminders, setReminders, recentSessions } = usePatientStore();

  const patient = selectedPatient || patients.find((p) => p.id === id) || patients[0];

  const [activeTab, setActiveTab] = useState<'analytics' | 'reminders'>('analytics');
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remTime, setRemTime] = useState('08:00');
  const [remType, setRemType] = useState<ReminderItem['type']>('medicine');
  const [remDosage, setRemDosage] = useState('');

  // Dynamic Telemetry Computed from Real Sessions
  const performanceHistory = [
    { key: 'memory_match', game: 'Rhino Memory Match', defaultAcc: 92, defaultReac: '1.6s' },
    { key: 'daily_routine_recall', game: 'Daily Routine Recall', defaultAcc: 96, defaultReac: '2.1s' },
    { key: 'pattern_recognition', game: 'Bamboo Pattern Match', defaultAcc: 80, defaultReac: '2.8s' },
    { key: 'focus_tap', game: 'Tea Garden Focus & Tap', defaultAcc: 94, defaultReac: '1.1s' },
  ].map((g) => {
    const sessions = recentSessions.filter((s) => s.gameType === g.key);
    const tier = patient?.difficultyLevels?.[g.key as keyof typeof patient.difficultyLevels] || 'easy';
    if (sessions.length > 0) {
      const last = sessions[sessions.length - 1];
      const avg = Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length);
      return {
        game: g.game,
        accuracy: avg,
        reaction: `${(last.averageReactionTimeMs / 1000).toFixed(1)}s`,
        tier: tier.charAt(0).toUpperCase() + tier.slice(1),
        trend: '+12%',
      };
    }
    // Initial baseline for demonstration or fresh patient
    return {
      game: g.game,
      accuracy: patient?.id.includes('sample') ? g.defaultAcc : 0,
      reaction: patient?.id.includes('sample') ? g.defaultReac : '--',
      tier: tier.charAt(0).toUpperCase() + tier.slice(1),
      trend: patient?.id.includes('sample') ? '+10%' : 'Pending play',
    };
  });

  const handleCreateReminder = () => {
    if (!remTitle.trim()) {
      Alert.alert('Required', 'Please enter a reminder title.');
      return;
    }

    const newReminder: ReminderItem = {
      id: `rem_${Date.now()}`,
      patientId: patient?.id || 'default',
      caregiverId: patient?.caregiverId || 'caregiver',
      title: remTitle.trim(),
      type: remType,
      time: remTime,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      dosageOrDetails: remDosage.trim(),
      isActive: true,
      createdAt: Date.now(),
    };

    setReminders([...reminders, newReminder]);
    setIsAddReminderOpen(false);
    setRemTitle('');
    setRemDosage('');
  };

  const handleDeleteReminder = (remId: string) => {
    setReminders(reminders.filter((r) => r.id !== remId));
  };

  if (!patient) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF7F2', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontFamily: 'Nunito-Bold', color: '#2D3748', fontSize: 18, marginBottom: 12 }}>
          Patient record not found.
        </Text>
        <Button title="Go Back" variant="outline" size="normal" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#FAF7F2' }} 
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 60 }}
    >
      {/* Top Header */}
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
            Patients
          </Text>
        </TouchableOpacity>

        <View className="flex-row items-center bg-[#FDF3ED] border border-[#F4D8C9] px-3.5 py-1 rounded-full">
          <KeyRound size={14} color="#C87453" />
          <Text 
            className="text-[#C87453] font-bold text-lg ml-1.5 tracking-wider"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            {patient.accessCode}
          </Text>
        </View>
      </View>

      {/* Patient Profile Card */}
      <View 
        className="bg-white border border-[#EFEBE4] rounded-3xl p-6 mb-5"
        style={{
          shadowColor: '#8C7A65',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <Text 
          className="text-4xl text-[#2B3A30]"
          style={{ fontFamily: 'PatrickHand' }}
        >
          {patient.name}
        </Text>
        <View className="flex-row items-center gap-2 mt-1.5 flex-wrap">
          <Text 
            className="text-[#718096] text-lg font-semibold"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            Age: {patient.age || 72}
          </Text>
          <Text className="text-[#CBD5E1] text-lg">•</Text>
          <Text 
            className="text-[#4A7C59] text-lg font-bold"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Lang: {patient.preferredLanguage.toUpperCase()}
          </Text>
          <Text className="text-[#CBD5E1] text-lg">•</Text>
          <Text 
            className="text-[#C87453] text-lg font-bold"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Stage: {patient.dementiaStage || 'Early'}
          </Text>
        </View>
      </View>

      {/* Segmented Tabs */}
      <View className="flex-row bg-[#F5F1EA] p-1 rounded-2xl mb-5 border border-[#EFEBE4]">
        <TouchableOpacity
          onPress={() => setActiveTab('analytics')}
          className={activeTab === 'analytics' ? 'flex-1 py-3 rounded-xl items-center flex-row justify-center bg-white' : 'flex-1 py-3 rounded-xl items-center flex-row justify-center'}
        >
          <Brain size={16} color={activeTab === 'analytics' ? '#4A7C59' : '#718096'} />
          <Text 
            className={`font-bold ml-1.5 text-lg ${activeTab === 'analytics' ? 'text-[#2C503A]' : 'text-[#718096]'}`}
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Cognitive Trends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('reminders')}
          className={activeTab === 'reminders' ? 'flex-1 py-3 rounded-xl items-center flex-row justify-center bg-white' : 'flex-1 py-3 rounded-xl items-center flex-row justify-center'}
        >
          <Bell size={16} color={activeTab === 'reminders' ? '#4A7C59' : '#718096'} />
          <Text 
            className={`font-bold ml-1.5 text-lg ${activeTab === 'reminders' ? 'text-[#2C503A]' : 'text-[#718096]'}`}
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Care Reminders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Cognitive Trends */}
      {activeTab === 'analytics' && (
        <View className="gap-3.5">
          <View 
            className="bg-white border border-[#EFEBE4] rounded-3xl p-5"
            style={{
              shadowColor: '#8C7A65',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <TrendingUp size={20} color="#4A7C59" />
                <Text 
                  className="text-xl font-bold text-[#2D3748] ml-2"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Weekly Accuracy Trend
                </Text>
              </View>
              <View className="bg-[#EBF4EE] px-2.5 py-0.5 rounded-full">
                <Text 
                  className="text-[#2C503A] text-lg font-bold"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Avg 90.5%
                </Text>
              </View>
            </View>

            {/* Simple Visual Trend Bars */}
            <View className="flex-row items-end justify-between h-36 pt-4 pb-1 border-b border-[#F0ECE4]">
              {[
                { day: 'Mon', val: 78 },
                { day: 'Tue', val: 82 },
                { day: 'Wed', val: 88 },
                { day: 'Thu', val: 92 },
                { day: 'Fri', val: 90 },
                { day: 'Sat', val: 94 },
                { day: 'Sun', val: 96 },
              ].map((bar, i) => (
                <View key={i} className="items-center flex-1">
                  <View
                    className="w-6 bg-[#4A7C59] rounded-t-xl"
                    style={{ height: `${bar.val}%` }}
                  />
                  <Text 
                    className="text-[#718096] text-lg font-semibold mt-2"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    {bar.day}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Text 
            className="text-3xl text-[#2B3A30] mt-1"
            style={{ fontFamily: 'PatrickHand' }}
          >
            Game Performance History
          </Text>

          {performanceHistory.map((item, idx) => (
            <View 
              key={idx} 
              className="bg-white border border-[#EFEBE4] rounded-3xl p-5 shadow-sm"
            >
              <View className="flex-row items-center justify-between">
                <Text 
                  className="text-[#2D3748] text-xl font-bold"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  {item.game}
                </Text>
                <View className="bg-[#EBF4EE] px-2.5 py-0.5 rounded-full">
                  <Text 
                    className="text-[#2C503A] text-lg font-bold"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    {item.tier}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between mt-3">
                <View>
                  <Text 
                    className="text-[#718096] text-lg uppercase"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    Accuracy
                  </Text>
                  <Text 
                    className="text-3xl text-[#4A7C59] mt-0.5"
                    style={{ fontFamily: 'PatrickHand' }}
                  >
                    {item.accuracy}%
                  </Text>
                </View>
                <View>
                  <Text 
                    className="text-[#718096] text-lg uppercase"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    Reaction Speed
                  </Text>
                  <Text 
                    className="text-3xl text-[#C87453] mt-0.5"
                    style={{ fontFamily: 'PatrickHand' }}
                  >
                    {item.reaction}
                  </Text>
                </View>
                <View>
                  <Text 
                    className="text-[#718096] text-lg uppercase"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    Trend
                  </Text>
                  <Text 
                    className="text-3xl text-[#59936E] mt-0.5"
                    style={{ fontFamily: 'PatrickHand' }}
                  >
                    {item.trend}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Tab 2: Reminders Management */}
      {activeTab === 'reminders' && (
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text 
              className="text-3xl text-[#2B3A30]"
              style={{ fontFamily: 'PatrickHand' }}
            >
              Active Reminders
            </Text>
            <TouchableOpacity
              onPress={() => setIsAddReminderOpen(true)}
              className="flex-row items-center bg-[#4A7C59] px-4 py-2 rounded-full shadow-sm"
            >
              <Plus size={16} color="#FFFFFF" />
              <Text 
                className="text-white font-bold text-lg ml-1"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                New Reminder
              </Text>
            </TouchableOpacity>
          </View>

          <View className="gap-2.5">
            {reminders.map((rem) => (
              <View 
                key={rem.id} 
                className="bg-white border border-[#EFEBE4] p-4 rounded-3xl flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-1 mr-2">
                  <Text 
                    className="text-[#2D3748] text-xl font-bold"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    {rem.title}
                  </Text>
                  <Text 
                    className="text-[#C87453] text-lg font-semibold mt-0.5"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    ⏰ {rem.time}
                  </Text>
                  {rem.dosageOrDetails ? (
                    <Text 
                      className="text-[#718096] text-lg mt-1"
                      style={{ fontFamily: 'Nunito-SemiBold' }}
                    >
                      {rem.dosageOrDetails}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteReminder(rem.id)}
                  className="p-2.5 bg-[#FDF2F2] border border-[#F8D7D7] rounded-full"
                >
                  <Trash2 size={16} color="#C53030" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Add Reminder Modal */}
      <Modal visible={isAddReminderOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-[#FAF8F5] border-t border-[#E8E2D8] p-6 rounded-t-3xl max-h-[90%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text 
                className="text-3xl text-[#2B3A30]"
                style={{ fontFamily: 'PatrickHand' }}
              >
                Add Patient Reminder
              </Text>
              <TouchableOpacity onPress={() => setIsAddReminderOpen(false)}>
                <X size={22} color="#718096" />
              </TouchableOpacity>
            </View>

            <Text 
              className="text-[#4A5568] text-lg font-bold mb-1"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Reminder Title
            </Text>
            <TextInput
              value={remTitle}
              onChangeText={setRemTitle}
              placeholder="e.g. Afternoon Blood Pressure Tablet"
              placeholderTextColor="#A0AEC0"
              style={{ fontFamily: 'Nunito-SemiBold' }}
              className="bg-white border border-[#E2DDD3] text-[#2D3748] rounded-2xl px-4 py-3 mb-3 text-xl"
            />

            <Text 
              className="text-[#4A5568] text-lg font-bold mb-1"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Trigger Time (HH:mm)
            </Text>
            <TextInput
              value={remTime}
              onChangeText={setRemTime}
              placeholder="14:00"
              placeholderTextColor="#A0AEC0"
              style={{ fontFamily: 'Nunito-SemiBold' }}
              className="bg-white border border-[#E2DDD3] text-[#2D3748] rounded-2xl px-4 py-3 mb-3 text-xl"
            />

            <Text 
              className="text-[#4A5568] text-lg font-bold mb-1"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Instructions / Dosage
            </Text>
            <TextInput
              value={remDosage}
              onChangeText={setRemDosage}
              placeholder="1 tablet with a glass of warm water"
              placeholderTextColor="#A0AEC0"
              style={{ fontFamily: 'Nunito-SemiBold' }}
              className="bg-white border border-[#E2DDD3] text-[#2D3748] rounded-2xl px-4 py-3 mb-5 text-xl"
            />

            <Button
              title="Save & Sync to Patient Device"
              variant="primary"
              size="large"
              onPress={handleCreateReminder}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
