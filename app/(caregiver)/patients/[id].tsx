import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Share, Image, Linking } from 'react-native';
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
  X,
  Copy,
  Check,
  Share2,
  Calendar,
  Sparkles,
  CheckCircle2,
  Activity,
  Droplets,
  Coffee,
  Pill,
  Zap,
  Info,
  MapPin,
  MessageCircle,
  Filter,
  Heart,
  FileText,
  Stethoscope,
  Volume2,
  Phone,
  Mail,
  Users,
  User,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../../../src/components/ui/Button';
import { ResponsiveContainer } from '../../../src/components/ui/ResponsiveContainer';
import { useCaregiverStore } from '../../../src/store/useCaregiverStore';
import { ReminderItem, CognitiveGameType, DifficultyTier, GameSessionTelemetry, FamilyMemoryItem, FamilyCaregiverContact } from '../../../src/types';
import { 
  subscribeToPatientReminders, 
  saveReminderToFirestore, 
  removeReminderFromFirestore, 
  formatDisplayTime 
} from '../../../src/services/reminderService';
import { 
  subscribeToFamilyMemories, 
  addFamilyMemory, 
  deleteFamilyMemory 
} from '../../../src/services/familyMemoryService';
import { generateClinicalAiAssessment } from '../../../src/services/clinicalAiService';
import { shareClinicalReport, generateClinicalReportHtml } from '../../../src/services/reportService';
import { speakPrompt } from '../../../src/services/ttsService';
import { subscribeToPatientFamilyCaregivers } from '../../../src/services/authService';
import { 
  DailyActivityItem, 
  subscribeToPatientActivities, 
  getLocalDateString 
} from '../../../src/services/activityService';
import { db } from '../../../src/services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';

export default function CaregiverPatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { patients, selectedPatient } = useCaregiverStore();

  const patient = selectedPatient || patients.find((p) => p.id === id) || patients[0];

  const [activeTab, setActiveTab] = useState<'timeline' | 'family' | 'reminders' | 'performance' | 'memories' | 'clinical'>('timeline');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'all'>('today');
  
  // Realtime Firestore Data
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [activities, setActivities] = useState<DailyActivityItem[]>([]);
  const [patientSessions, setPatientSessions] = useState<GameSessionTelemetry[]>([]);

  // Family Memories (Reminiscence Album) State
  const [familyMemories, setFamilyMemories] = useState<FamilyMemoryItem[]>([]);
  const [isAddMemoryOpen, setIsAddMemoryOpen] = useState(false);
  const [memPhotoTitle, setMemPhotoTitle] = useState('');
  const [memRelationship, setMemRelationship] = useState('Granddaughter');
  const [memClue, setMemClue] = useState('');
  const [memImageUrl, setMemImageUrl] = useState('');

  // Registered Family Caregivers Monitoring This Patient
  const [familyCaregivers, setFamilyCaregivers] = useState<FamilyCaregiverContact[]>(patient?.familyCaregivers || []);
  const [isFamilySectionExpanded, setIsFamilySectionExpanded] = useState(true);

  // Subscribe to registered family caregivers
  useEffect(() => {
    if (!patient?.id) return;
    const unsub = subscribeToPatientFamilyCaregivers(patient.id, (list) => {
      setFamilyCaregivers(list);
    });
    return () => unsub();
  }, [patient?.id]);

  // Clinical Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Compute AI Clinical Assessment
  const aiAssessment = useMemo(() => {
    if (!patient) return null;
    return generateClinicalAiAssessment(patient, patientSessions, activities);
  }, [patient, patientSessions, activities]);

  // Subscribe to family memories
  useEffect(() => {
    if (!patient?.id) return;
    const unsub = subscribeToFamilyMemories(patient.id, (list) => {
      setFamilyMemories(list);
    });
    return () => unsub();
  }, [patient?.id]);

  const handleCreateMemory = async () => {
    if (!memPhotoTitle.trim()) {
      Alert.alert('Required', 'Please enter a name or title for this photo memory.');
      return;
    }
    if (!patient?.id) return;

    try {
      await addFamilyMemory(patient.id, {
        title: memPhotoTitle.trim(),
        relationship: memRelationship,
        clue: memClue.trim() || 'A loving family memory.',
        imageUrl: memImageUrl.trim() || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        dateYear: 'Family Moment',
      });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setMemPhotoTitle('');
      setMemClue('');
      setMemImageUrl('');
      setIsAddMemoryOpen(false);
    } catch {
      Alert.alert('Error', 'Could not save memory photo.');
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!patient?.id) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    await deleteFamilyMemory(patient.id, memoryId);
  };

  const handleShareReport = async () => {
    if (!patient || !aiAssessment) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    await shareClinicalReport(patient, aiAssessment, patientSessions);
  };

  // Add Reminder Modal State with AM/PM
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remType, setRemType] = useState<ReminderItem['type']>('medicine');
  const [remDosage, setRemDosage] = useState('');
  const [remHour, setRemHour] = useState<number>(8);
  const [remMinute, setRemMinute] = useState<number>(0);
  const [remAmPm, setRemAmPm] = useState<'AM' | 'PM'>('AM');

  const [copiedCode, setCopiedCode] = useState(false);

  // 1. Subscribe to patient reminders in realtime
  useEffect(() => {
    if (!patient?.id) return;
    const unsub = subscribeToPatientReminders(patient.id, (rems) => {
      setReminders(rems);
    });
    return () => unsub();
  }, [patient?.id]);

  // 2. Subscribe to patient activities in realtime (Water, Tea, Reminders Done, Games)
  useEffect(() => {
    if (!patient?.id) return;
    const unsub = subscribeToPatientActivities(patient.id, (acts) => {
      setActivities(acts);
    });
    return () => unsub();
  }, [patient?.id]);

  // 3. Subscribe to patient cognitive game sessions in realtime
  useEffect(() => {
    if (!patient?.id) return;
    try {
      const sessRef = collection(db, 'patients', patient.id, 'sessions');
      const q = query(sessRef, orderBy('timestamp', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const list: GameSessionTelemetry[] = [];
        snap.forEach((d) => {
          list.push(d.data() as GameSessionTelemetry);
        });
        setPatientSessions(list);
      }, (err) => {
        console.warn('Caregiver sessions onSnapshot error:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Could not listen to sessions:', e);
    }
  }, [patient?.id]);

  // Copy code with feedback
  const handleCopyCode = async () => {
    if (!patient) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    await Clipboard.setStringAsync(patient.accessCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Share code
  const handleShareCode = async () => {
    if (!patient) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    try {
      await Share.share({
        title: `Cognia Access Code for ${patient.name}`,
        message: `Hello! Here is the Cognia login code for ${patient.name}: ${patient.accessCode}\n\nEnter this code in the Cognia app to access personalized daily cognitive activities.`,
      });
    } catch {}
  };

  // Date filtering logic
  const todayStr = getLocalDateString(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const selectedDateStr = dateFilter === 'today' ? todayStr : dateFilter === 'yesterday' ? yesterdayStr : null;

  const filteredActivities = activities.filter((a) => {
    if (!selectedDateStr) return true;
    return a.dateStr === selectedDateStr;
  });

  const filteredSessions = patientSessions.filter((s) => {
    if (!selectedDateStr) return true;
    return getLocalDateString(new Date(s.timestamp)) === selectedDateStr;
  });

  // Daily Habits Metrics for the selected date
  const hasHydration = filteredActivities.some((a) => a.type === 'hydration');
  const hydrationItem = filteredActivities.find((a) => a.type === 'hydration');
  const hasTea = filteredActivities.some((a) => a.type === 'tea');
  const teaItem = filteredActivities.find((a) => a.type === 'tea');
  const remindersDoneCount = filteredActivities.filter((a) => a.type === 'reminder_done').length;

  // Cognitive Domain Performance Breakdown
  const cognitiveDomains = [
    {
      key: 'memory_match' as CognitiveGameType,
      name: 'Rhino Memory Match',
      domain: 'Visual & Working Memory',
      description: 'Ability to temporarily store and manipulate visual positions.',
      sessions: patientSessions.filter((s) => s.gameType === 'memory_match'),
      currentTier: (patient?.difficultyLevels?.memory_match || 'easy') as DifficultyTier,
    },
    {
      key: 'daily_routine_recall' as CognitiveGameType,
      name: 'Daily Routine Recall',
      domain: 'Executive Function & Sequencing',
      description: 'Ability to plan and recall the logical steps of daily habits.',
      sessions: patientSessions.filter((s) => s.gameType === 'daily_routine_recall'),
      currentTier: (patient?.difficultyLevels?.daily_routine_recall || 'easy') as DifficultyTier,
    },
    {
      key: 'pattern_recognition' as CognitiveGameType,
      name: 'Bamboo Pattern Match',
      domain: 'Pattern Recognition & Working Memory',
      description: 'Ability to complete symmetrical Northeast handloom motifs.',
      sessions: patientSessions.filter((s) => s.gameType === 'pattern_recognition'),
      currentTier: (patient?.difficultyLevels?.pattern_recognition || 'easy') as DifficultyTier,
    },
    {
      key: 'focus_tap' as CognitiveGameType,
      name: 'Tea Garden Focus & Tap',
      domain: 'Sustained Attention & Motor Reaction',
      description: 'Speed and inhibitory control when tapping stimuli.',
      sessions: patientSessions.filter((s) => s.gameType === 'focus_tap'),
      currentTier: (patient?.difficultyLevels?.focus_tap || 'easy') as DifficultyTier,
    },
  ].map((cd) => {
    const count = cd.sessions.length;
    const avgAccuracy = count > 0 ? Math.round(cd.sessions.reduce((a, s) => a + s.accuracy, 0) / count) : null;
    const avgSpeed = count > 0 ? (cd.sessions.reduce((a, s) => a + s.averageReactionTimeMs, 0) / count / 1000).toFixed(1) + 's' : null;
    return {
      ...cd,
      sessionCount: count,
      accuracy: avgAccuracy,
      reactionSpeed: avgSpeed,
    };
  });

  const handleTierChange = async (gameKey: CognitiveGameType, newTier: DifficultyTier) => {
    if (!patient) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    try {
      patient.difficultyLevels[gameKey] = newTier;
      const pRef = doc(db, 'patients', patient.id);
      await updateDoc(pRef, {
        [`difficultyLevels.${gameKey}`]: newTier,
      });
    } catch (e) {
      console.warn('Could not update difficulty in Firestore:', e);
    }
  };

  const handleCreateReminder = async () => {
    if (!remTitle.trim()) {
      Alert.alert('Required', 'Please enter a reminder title.');
      return;
    }

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    const formattedTime = formatDisplayTime(remHour, remMinute, remAmPm);

    const newReminder: ReminderItem = {
      id: `rem_${Date.now()}`,
      patientId: patient?.id || 'default',
      caregiverId: patient?.caregiverId || 'caregiver',
      title: remTitle.trim(),
      type: remType,
      time: formattedTime,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      dosageOrDetails: remDosage.trim(),
      isActive: true,
      createdAt: Date.now(),
    };

    // Save to Firestore and schedule notification
    await saveReminderToFirestore(newReminder);

    setIsAddReminderOpen(false);
    setRemTitle('');
    setRemDosage('');
  };

  const handleDeleteReminder = async (remId: string) => {
    if (!patient) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    await removeReminderFromFirestore(patient.id, remId);
  };

  if (!patient) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF7F2', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontFamily: 'Nunito-Bold', color: '#1E293B', fontSize: 18, marginBottom: 12 }}>
          Patient record not found.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-[#16704A] px-5 py-2.5 rounded-full"
        >
          <Text className="text-white font-bold">Return to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FAF7F2' }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 64 }}
      keyboardShouldPersistTaps="handled"
    >
      <ResponsiveContainer maxWidth="md">
        {/* Top Header */}
        <View className="flex-row items-center justify-between pt-4 mb-4 flex-wrap gap-2">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.82}
            className="flex-row items-center bg-white border border-[#CBD5E1] px-4 py-2 rounded-full"
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
              className="text-[#475569] font-bold ml-1.5 text-xs"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              All Patients
            </Text>
          </TouchableOpacity>

          {/* Access Code Pill with Copy & Share */}
          <View className="flex-row items-center bg-[#FFF8F3] border-2 border-[#FBDCC8] px-3.5 py-1.5 rounded-full">
            <KeyRound size={14} color="#D96B27" />
            <Text 
              className="text-[#D96B27] font-black text-sm ml-1.5 mr-2 tracking-wider"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              {patient.accessCode}
            </Text>

            <TouchableOpacity 
              onPress={handleCopyCode}
              activeOpacity={0.75}
              className="p-1 bg-white border border-[#FAD0B6] rounded-full mr-1.5"
            >
              {copiedCode ? <Check size={12} color="#16704A" /> : <Copy size={12} color="#D96B27" />}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleShareCode}
              activeOpacity={0.75}
              className="p-1 bg-white border border-[#FAD0B6] rounded-full"
            >
              <Share2 size={12} color="#D96B27" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Patient Profile Header Card */}
        <View 
          className="bg-white border-2 border-[#EDE7DD] p-5 rounded-[26px] mb-4"
          style={{
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 mr-2 min-w-0">
              <Text 
                className="text-2xl text-[#1E293B] font-bold"
                style={{ fontFamily: 'Nunito-Bold' }}
                numberOfLines={1}
              >
                {patient.name}
              </Text>
              <Text 
                className="text-[#64748B] text-xs font-semibold mt-0.5"
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                {patient.age ? `${patient.age} yrs • ` : ''}Stage: <Text className="capitalize font-bold text-[#16704A]">{patient.dementiaStage}</Text> • City: {patient.city || 'Assam'}
              </Text>
            </View>

            {/* Direct Chat Button */}
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => router.push(`/(caregiver)/chat/${patient.id}`)}
              className="bg-[#16704A] px-3.5 py-2 rounded-2xl flex-row items-center"
              style={{
                shadowColor: '#16704A',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <MessageCircle size={15} color="#FFFFFF" />
              <Text className="text-white text-xs font-bold ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                Chat
              </Text>
            </TouchableOpacity>
          </View>

          {/* Location Badge */}
          {patient.latitude && patient.longitude ? (
            <View className="flex-row items-center bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-xl self-start mt-1">
              <MapPin size={13} color="#16A34A" />
              <Text className="text-[#15803D] text-xs font-bold ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                Live GPS Active: {patient.latitude.toFixed(3)}, {patient.longitude.toFixed(3)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Family Caregivers Quick Header Bar */}
        <TouchableOpacity
          onPress={() => setActiveTab('family')}
          activeOpacity={0.88}
          className="bg-[#FFF8F3] border-2 border-[#FBDCC8] p-3 rounded-2xl mb-4 flex-row items-center justify-between"
          style={{
            shadowColor: '#D96B27',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-8 h-8 rounded-full bg-[#D96B27] items-center justify-center mr-2.5">
              <Users size={15} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-[#1E293B]" style={{ fontFamily: 'Nunito-Bold' }}>
                Family Caregivers Monitoring
              </Text>
              <Text className="text-[11px] text-[#9A431D] font-semibold mt-0.5" style={{ fontFamily: 'Nunito-SemiBold' }}>
                {familyCaregivers.length > 0 
                  ? `${familyCaregivers.length} family member${familyCaregivers.length > 1 ? 's' : ''} registered (Tap to view Name, Phone & Email)`
                  : `No family linked yet • Tap to share Patient Code ${patient.accessCode}`}
              </Text>
            </View>
          </View>
          <View className="bg-white border border-[#FAD0B6] px-2.5 py-1 rounded-full">
            <Text className="text-[11px] font-bold text-[#D96B27]" style={{ fontFamily: 'Nunito-Bold' }}>
              {familyCaregivers.length > 0 ? `${familyCaregivers.length} Active` : 'Share Code'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 6 Clear Segmented Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="mb-4"
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
        >
          {[
            { id: 'timeline' as const, label: 'Why & When', icon: <Clock size={14} color={activeTab === 'timeline' ? '#16704A' : '#64748B'} /> },
            { id: 'family' as const, label: `Family (${familyCaregivers.length})`, icon: <Users size={14} color={activeTab === 'family' ? '#D96B27' : '#64748B'} /> },
            { id: 'reminders' as const, label: 'Reminders', icon: <Bell size={14} color={activeTab === 'reminders' ? '#16704A' : '#64748B'} /> },
            { id: 'performance' as const, label: 'Brain Analytics', icon: <Brain size={14} color={activeTab === 'performance' ? '#16704A' : '#64748B'} /> },
            { id: 'memories' as const, label: 'Family Album', icon: <Heart size={14} color={activeTab === 'memories' ? '#E11D48' : '#64748B'} /> },
            { id: 'clinical' as const, label: 'AI Medical Report', icon: <Stethoscope size={14} color={activeTab === 'clinical' ? '#16704A' : '#64748B'} /> },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-row items-center px-4 py-2.5 rounded-xl border ${
                activeTab === tab.id
                  ? 'bg-white border-[#16704A]'
                  : 'bg-[#F1EBE1] border-transparent'
              }`}
              style={{
                shadowColor: activeTab === tab.id ? '#000000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: activeTab === tab.id ? 0.08 : 0,
                shadowRadius: 2,
                elevation: activeTab === tab.id ? 1 : 0,
              }}
            >
              {tab.icon}
              <Text 
                className={`font-bold ml-1.5 text-xs ${
                  activeTab === tab.id 
                    ? tab.id === 'memories' ? 'text-[#E11D48]' : tab.id === 'family' ? 'text-[#D96B27]' : 'text-[#16704A]' 
                    : 'text-[#64748B]'
                }`}
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* TAB 1: WHY & WHEN ACTIVITY TIMELINE WITH DATE FILTER */}
        {activeTab === 'timeline' && (
          <View className="gap-3.5">
            {/* Date Filter Bar */}
            <View className="bg-white border border-[#E2DDD5] p-2.5 rounded-2xl flex-row items-center justify-between">
              <View className="flex-row items-center ml-1">
                <Filter size={14} color="#64748B" />
                <Text className="text-xs font-bold text-[#475569] ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                  Filter Day:
                </Text>
              </View>

              <View className="flex-row gap-1.5">
                {(['today', 'yesterday', 'all'] as const).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setDateFilter(filter)}
                    activeOpacity={0.8}
                    className={`px-3 py-1.5 rounded-xl border ${
                      dateFilter === filter 
                        ? 'bg-[#16704A] border-[#115438]' 
                        : 'bg-[#FAF8F5] border-[#CBD5E1]'
                    }`}
                  >
                    <Text 
                      className={`text-xs font-bold capitalize ${dateFilter === filter ? 'text-white' : 'text-[#475569]'}`}
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      {filter === 'all' ? 'All History' : filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Daily Habits & Adherence Dashboard Summary */}
            <View className="flex-row gap-2.5 flex-wrap">
              {/* Hydration Card */}
              <View 
                className="flex-1 min-w-[46%] bg-white border border-[#EDE7DD] p-3.5 rounded-2xl"
                style={{
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-2xl">💧</Text>
                  <View className={`px-2 py-0.5 rounded-full ${hasHydration ? 'bg-[#DCFCE7]' : 'bg-[#FFF1F2]'}`}>
                    <Text className={`text-[10px] font-bold ${hasHydration ? 'text-[#16A34A]' : 'text-[#E11D48]'}`}>
                      {hasHydration ? 'Logged' : 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
                  Water Adherence
                </Text>
                <Text className="text-sm font-bold text-[#1E293B] mt-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                  {hasHydration ? `Drank at ${hydrationItem?.timeStr}` : 'No water logged yet'}
                </Text>
              </View>

              {/* Tea / Routine Card */}
              <View 
                className="flex-1 min-w-[46%] bg-white border border-[#EDE7DD] p-3.5 rounded-2xl"
                style={{
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-2xl">☕</Text>
                  <View className={`px-2 py-0.5 rounded-full ${hasTea ? 'bg-[#DCFCE7]' : 'bg-[#FFF8F3]'}`}>
                    <Text className={`text-[10px] font-bold ${hasTea ? 'text-[#16A34A]' : 'text-[#D96B27]'}`}>
                      {hasTea ? 'Logged' : 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
                  Tea Habit
                </Text>
                <Text className="text-sm font-bold text-[#1E293B] mt-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                  {hasTea ? `Enjoyed at ${teaItem?.timeStr}` : 'No tea logged yet'}
                </Text>
              </View>

              {/* Reminders Taken Card */}
              <View 
                className="flex-1 min-w-[46%] bg-white border border-[#EDE7DD] p-3.5 rounded-2xl"
                style={{
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-2xl">💊</Text>
                  <Text className="text-base text-[#16704A] font-black" style={{ fontFamily: 'Nunito-Bold' }}>
                    {remindersDoneCount} Taken
                  </Text>
                </View>
                <Text className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
                  Reminders Acknowledged
                </Text>
                <Text className="text-sm font-bold text-[#1E293B] mt-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                  {reminders.length} Daily Scheduled
                </Text>
              </View>

              {/* Cognitive Games Card */}
              <View 
                className="flex-1 min-w-[46%] bg-white border border-[#EDE7DD] p-3.5 rounded-2xl"
                style={{
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-2xl">🧠</Text>
                  <Text className="text-base text-[#2563EB] font-black" style={{ fontFamily: 'Nunito-Bold' }}>
                    {filteredSessions.length} Played
                  </Text>
                </View>
                <Text className="text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
                  Brain Exercises
                </Text>
                <Text className="text-sm font-bold text-[#1E293B] mt-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                  {filteredSessions.length > 0 
                    ? `${Math.round(filteredSessions.reduce((a, b) => a + b.accuracy, 0) / filteredSessions.length)}% Avg Accuracy` 
                    : 'Awaiting play'}
                </Text>
              </View>
            </View>

            {/* Clinical Banner */}
            <View className="bg-[#EAF7EE] border border-[#BDE5CB] p-3.5 rounded-2xl flex-row items-center">
              <CheckCircle2 size={16} color="#16704A" />
              <Text className="text-[#145332] text-xs font-bold ml-2 flex-1" style={{ fontFamily: 'Nunito-Bold' }}>
                Complete visibility: Every recorded action with clinical reasoning ("Why") and timestamp ("When").
              </Text>
            </View>

            {/* Chronological Activity Feed */}
            {filteredActivities.length === 0 ? (
              <View 
                className="bg-white border-2 border-[#EDE7DD] p-8 rounded-[28px] items-center text-center"
                style={{
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="w-14 h-14 rounded-2xl bg-[#EAF7EE] border border-[#BDE5CB] items-center justify-center mb-3">
                  <Clock size={28} color="#16704A" />
                </View>
                <Text className="text-xl text-[#1E293B] font-bold text-center" style={{ fontFamily: 'Nunito-Bold' }}>
                  No Activity For {dateFilter.toUpperCase()}
                </Text>
                <Text className="text-[#64748B] text-center text-xs mt-1.5 max-w-sm leading-relaxed" style={{ fontFamily: 'Nunito-SemiBold' }}>
                  When {patient.name} confirms water/tea, completes reminders, or plays games, real-time activity events populate here automatically.
                </Text>
              </View>
            ) : (
              filteredActivities.map((act) => (
                <View 
                  key={act.id}
                  className="bg-white border-2 border-[#EDE7DD] p-4 rounded-2xl"
                  style={{
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  {/* Event Header: Icon, Title, Status, Timestamp */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1 mr-2">
                      <Text className="text-2xl mr-2.5">{act.icon}</Text>
                      <View className="flex-1">
                        <Text className="text-base text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                          {act.title}
                        </Text>
                        <Text className="text-[#D96B27] text-xs font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                          🕒 {act.timeStr} • {act.dateStr}
                        </Text>
                      </View>
                    </View>

                    <View className="bg-[#FAF8F5] border border-[#CBD5E1] px-2.5 py-1 rounded-full">
                      <Text className="text-[#16704A] text-xs font-bold uppercase" style={{ fontFamily: 'Nunito-Bold' }}>
                        {act.type.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  {/* Clinical "Why" Explanation */}
                  {act.whyClinical ? (
                    <View className="bg-[#F8FBF9] border border-[#D1EADB] p-3 rounded-xl mt-1">
                      <Text className="text-[#145332] text-xs font-bold mb-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Why this occurred:
                      </Text>
                      <Text className="text-[#334155] text-xs leading-relaxed font-medium" style={{ fontFamily: 'Nunito-SemiBold' }}>
                        {act.whyClinical}
                      </Text>
                    </View>
                  ) : null}

                  {/* Additional Details */}
                  {act.details ? (
                    <Text className="text-[#64748B] text-xs font-semibold mt-2 ml-1" style={{ fontFamily: 'Nunito-SemiBold' }}>
                      Detail: {act.details}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB: REGISTERED FAMILY CAREGIVERS */}
        {activeTab === 'family' && (
          <View className="gap-3.5">
            {/* Header Description Card */}
            <View 
              className="bg-white border-2 border-[#EDE7DD] p-5 rounded-[26px]"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-2xl bg-[#FFF3EB] border border-[#FAD0B6] items-center justify-center mr-3">
                    <Text style={{ fontSize: 20 }}>👨‍👩‍👧</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                      Registered Family Caregivers
                    </Text>
                    <Text className="text-xs text-[#64748B] font-semibold mt-0.5" style={{ fontFamily: 'Nunito-SemiBold' }}>
                      Family members registered with Patient Code to monitor {patient.name}
                    </Text>
                  </View>
                </View>

                <View className="bg-[#FFF3EB] border border-[#FAD0B6] px-3 py-1.5 rounded-full">
                  <Text className="text-xs font-bold text-[#D96B27]" style={{ fontFamily: 'Nunito-Bold' }}>
                    {familyCaregivers.length} Active
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-[#64748B] leading-relaxed mt-1" style={{ fontFamily: 'Nunito-SemiBold' }}>
                Clinic and ASHA teams can view the contact information (Name, Email ID, Phone Number) of family members who have connected to this patient for home care coordination.
              </Text>
            </View>

            {/* List of Registered Family Caregivers */}
            {familyCaregivers.length > 0 ? (
              <View className="gap-3">
                {familyCaregivers.map((fc, index) => (
                  <View 
                    key={fc.uid || index}
                    className="bg-white border-2 border-[#EDE7DD] p-4 rounded-[24px]"
                    style={{
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    {/* Top Identity Row */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="w-11 h-11 rounded-2xl bg-[#D96B27] items-center justify-center mr-3">
                          <Text className="text-white text-base font-black">
                            {fc.name ? fc.name.charAt(0).toUpperCase() : 'F'}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center flex-wrap gap-2">
                            <Text className="text-base font-bold text-[#1E293B]" style={{ fontFamily: 'Nunito-Bold' }}>
                              {fc.name}
                            </Text>
                            <View className="bg-[#FFF3EB] border border-[#FAD0B6] px-2.5 py-0.5 rounded-full">
                              <Text className="text-[11px] font-bold text-[#D96B27]" style={{ fontFamily: 'Nunito-Bold' }}>
                                {fc.relationship || 'Family Member'}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-[11px] text-[#94A3B8] font-semibold mt-0.5">
                            Connected: {fc.registeredAt ? new Date(fc.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Active'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Email and Phone Contact Detail Blocks */}
                    <View className="bg-[#FAF8F5] border border-[#E2DDD5] p-3 rounded-2xl gap-2.5">
                      {/* Name Row */}
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 mr-2">
                          <User size={15} color="#64748B" />
                          <Text className="text-xs text-[#64748B] font-bold ml-2" style={{ fontFamily: 'Nunito-Bold' }}>
                            Full Name:
                          </Text>
                          <Text className="text-xs text-[#1E293B] font-bold ml-1.5 flex-1" style={{ fontFamily: 'Nunito-Bold' }}>
                            {fc.name}
                          </Text>
                        </View>
                      </View>

                      {/* Email Row */}
                      <View className="flex-row items-center justify-between pt-2 border-t border-[#EDE7DD]">
                        <View className="flex-row items-center flex-1 mr-2">
                          <Mail size={15} color="#D96B27" />
                          <Text className="text-xs text-[#64748B] font-bold ml-2" style={{ fontFamily: 'Nunito-Bold' }}>
                            Email ID:
                          </Text>
                          <Text 
                            className="text-xs text-[#1E293B] font-bold ml-1.5 flex-1" 
                            style={{ fontFamily: 'Nunito-Bold' }}
                            numberOfLines={1}
                          >
                            {fc.email}
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            if (fc.email) Linking.openURL(`mailto:${fc.email}`);
                          }}
                          className="bg-white border border-[#CBD5E1] px-3 py-1 rounded-xl flex-row items-center"
                        >
                          <Mail size={12} color="#D96B27" />
                          <Text className="text-[11px] font-bold text-[#D96B27] ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                            Email
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Phone Row */}
                      <View className="flex-row items-center justify-between pt-2 border-t border-[#EDE7DD]">
                        <View className="flex-row items-center flex-1 mr-2">
                          <Phone size={15} color="#16704A" />
                          <Text className="text-xs text-[#64748B] font-bold ml-2" style={{ fontFamily: 'Nunito-Bold' }}>
                            Phone Number:
                          </Text>
                          <Text 
                            className="text-xs text-[#16704A] font-black ml-1.5" 
                            style={{ fontFamily: 'Nunito-Bold' }}
                          >
                            {fc.phone}
                          </Text>
                        </View>

                        <View className="flex-row gap-1.5">
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                              if (fc.phone) Linking.openURL(`tel:${fc.phone}`);
                            }}
                            className="bg-[#16704A] px-3 py-1 rounded-xl flex-row items-center"
                          >
                            <Phone size={12} color="#FFFFFF" />
                            <Text className="text-[11px] font-bold text-white ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                              Call
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                              if (fc.phone) Linking.openURL(`sms:${fc.phone}`);
                            }}
                            className="bg-white border border-[#CBD5E1] px-2.5 py-1 rounded-xl flex-row items-center"
                          >
                            <MessageCircle size={12} color="#475569" />
                            <Text className="text-[11px] font-bold text-[#475569] ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                              SMS
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              /* Empty state */
              <View 
                className="bg-white border-2 border-[#EDE7DD] p-6 rounded-[26px] items-center text-center"
                style={{
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="w-14 h-14 rounded-2xl bg-[#FFF3EB] border border-[#FAD0B6] items-center justify-center mb-3">
                  <Users size={26} color="#D96B27" />
                </View>
                <Text className="text-base text-[#1E293B] font-bold text-center" style={{ fontFamily: 'Nunito-Bold' }}>
                  No Family Caregivers Connected Yet
                </Text>
                <Text className="text-xs text-[#64748B] text-center mt-1.5 mb-4 max-w-xs font-semibold leading-relaxed" style={{ fontFamily: 'Nunito-SemiBold' }}>
                  Share the access code below with {patient.name}'s family members. When they register in the Cognia app with this code, their Name, Email, and Phone Number will appear here.
                </Text>

                <View className="flex-row items-center bg-[#FAF8F5] border-2 border-[#D96B27] px-4 py-2.5 rounded-2xl mb-4">
                  <KeyRound size={17} color="#D96B27" />
                  <Text className="text-base font-black text-[#D96B27] ml-2 tracking-wider" style={{ fontFamily: 'Nunito-Bold' }}>
                    {patient.accessCode}
                  </Text>
                </View>

                <View className="flex-row gap-2.5 w-full">
                  <TouchableOpacity
                    onPress={handleCopyCode}
                    activeOpacity={0.8}
                    className="flex-1 bg-white border border-[#CBD5E1] py-2.5 rounded-xl items-center flex-row justify-center"
                  >
                    {copiedCode ? <Check size={14} color="#16704A" /> : <Copy size={14} color="#475569" />}
                    <Text className="text-xs font-bold text-[#475569] ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                      {copiedCode ? 'Copied' : 'Copy Code'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleShareCode}
                    activeOpacity={0.8}
                    className="flex-1 bg-[#D96B27] py-2.5 rounded-xl items-center flex-row justify-center"
                  >
                    <Share2 size={14} color="#FFFFFF" />
                    <Text className="text-xs font-bold text-white ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                      Share with Family
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Patient Code Sharing Card */}
            <View className="bg-[#FAF8F5] border border-[#E2DDD5] p-4 rounded-2xl">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-xs text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                    Patient Access Code: {patient.accessCode}
                  </Text>
                  <Text className="text-[11px] text-[#64748B] font-semibold mt-0.5" style={{ fontFamily: 'Nunito-SemiBold' }}>
                    Give this code to sons, daughters, spouses or relatives to connect.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleShareCode}
                  activeOpacity={0.8}
                  className="bg-[#16704A] px-3 py-2 rounded-xl flex-row items-center"
                >
                  <Share2 size={13} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                    Share
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: BRAIN DOMAINS & DIFFICULTY OVERRIDE */}
        {activeTab === 'performance' && (
          <View className="gap-3.5">
            {patientSessions.length === 0 ? (
              <View 
                className="bg-white border-2 border-[#CCEAD7] p-6 rounded-[26px] items-center text-center"
                style={{
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="w-12 h-12 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] items-center justify-center mb-2.5">
                  <Brain size={24} color="#D97706" />
                </View>
                <Text className="text-lg text-[#1E293B] font-bold text-center" style={{ fontFamily: 'Nunito-Bold' }}>
                  Awaiting Patient Brain Sessions
                </Text>
                <Text className="text-[#64748B] text-center text-xs mt-1 leading-relaxed max-w-xs" style={{ fontFamily: 'Nunito-SemiBold' }}>
                  Weekly accuracy charts and reaction speeds will appear once {patient.name} completes their first exercises. You can still set difficulty tiers below.
                </Text>
              </View>
            ) : (
              <View 
                className="bg-white border-2 border-[#CCEAD7] p-5 rounded-2xl"
                style={{
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <TrendingUp size={18} color="#16704A" />
                    <Text className="text-base font-bold text-[#1E293B] ml-2" style={{ fontFamily: 'Nunito-Bold' }}>
                      Weekly Composite Accuracy
                    </Text>
                  </View>
                  <View className="bg-[#EAF7EE] px-2.5 py-0.5 rounded-full border border-[#BDE5CB]">
                    <Text className="text-[#145332] text-xs font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                      {Math.round(patientSessions.reduce((a, b) => a + b.accuracy, 0) / patientSessions.length)}% Overall
                    </Text>
                  </View>
                </View>

                <Text className="text-xs text-[#64748B] font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                  Calculated from {patientSessions.length} total cognitive exercise session(s).
                </Text>
              </View>
            )}

            <Text className="text-base text-[#1E293B] font-bold px-1" style={{ fontFamily: 'Nunito-Bold' }}>
              Cognitive Domains & Caregiver Tier Overrides
            </Text>

            {cognitiveDomains.map((cd) => (
              <View 
                key={cd.key}
                className="bg-white border-2 border-[#EDE7DD] p-4 rounded-2xl"
                style={{
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[#1E293B] text-base font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                    {cd.name}
                  </Text>
                  <Text className={`font-bold text-xs ${cd.accuracy !== null ? 'text-[#16704A]' : 'text-[#64748B]'}`} style={{ fontFamily: 'Nunito-Bold' }}>
                    {cd.accuracy !== null ? `${cd.accuracy}% Accuracy (${cd.sessionCount} plays)` : 'Pending first session'}
                  </Text>
                </View>

                <Text className="text-[#16704A] text-xs font-bold mb-1" style={{ fontFamily: 'Nunito-Bold' }}>
                  Domain: {cd.domain}
                </Text>
                <Text className="text-[#64748B] text-xs font-semibold leading-relaxed mb-3" style={{ fontFamily: 'Nunito-SemiBold' }}>
                  {cd.description}
                </Text>

                {/* Difficulty Tier Selector (Easy / Medium / Hard) */}
                <View className="bg-[#FAF8F5] border border-[#E7E2D8] p-2.5 rounded-xl">
                  <Text className="text-[#475569] text-[11px] font-bold mb-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                    Set Difficulty Tier for this game:
                  </Text>
                  <View className="flex-row gap-2">
                    {(['easy', 'medium', 'hard'] as const).map((tier) => (
                      <TouchableOpacity
                        key={tier}
                        onPress={() => handleTierChange(cd.key, tier)}
                        className={`flex-1 py-1.5 rounded-lg border items-center ${
                          cd.currentTier === tier 
                            ? 'bg-[#16704A] border-[#115438]' 
                            : 'bg-white border-[#CBD5E1]'
                        }`}
                      >
                        <Text 
                          className={`text-xs font-bold capitalize ${cd.currentTier === tier ? 'text-white' : 'text-[#475569]'}`}
                          style={{ fontFamily: 'Nunito-Bold' }}
                        >
                          {tier}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: CARE REMINDERS */}
        {activeTab === 'reminders' && (
          <View>
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-base text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                Active Daily Schedule
              </Text>
              <TouchableOpacity
                onPress={() => setIsAddReminderOpen(true)}
                activeOpacity={0.85}
                className="flex-row items-center bg-[#16704A] px-3.5 py-1.5 rounded-full"
                style={{
                  shadowColor: '#16704A',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text className="text-white font-bold text-xs ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                  New Reminder
                </Text>
              </TouchableOpacity>
            </View>

            <View className="gap-2.5">
              {reminders.length === 0 ? (
                <View 
                  className="bg-white border-2 border-[#EDE7DD] p-7 rounded-[26px] items-center text-center"
                  style={{
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  <Bell size={32} color="#D96B27" />
                  <Text className="text-lg font-bold text-[#1E293B] mt-2 mb-1" style={{ fontFamily: 'Nunito-Bold' }}>
                    No Scheduled Reminders
                  </Text>
                  <Text className="text-xs text-[#64748B] text-center font-semibold max-w-xs leading-relaxed" style={{ fontFamily: 'Nunito-SemiBold' }}>
                    Set medication, hydration, and nutrition reminders with exact AM/PM timing. They will automatically notify the patient.
                  </Text>
                </View>
              ) : (
                reminders.map((rem) => (
                  <View 
                    key={rem.id} 
                    className="bg-white border-2 border-[#EDE7DD] p-4 rounded-2xl flex-row items-center justify-between"
                    style={{
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-[#1E293B] text-base font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                        {rem.title}
                      </Text>
                      <Text className="text-[#D96B27] text-xs font-bold mt-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        ⏰ {rem.time} • Daily
                      </Text>
                      {rem.dosageOrDetails ? (
                        <Text className="text-[#64748B] text-xs font-semibold mt-1" style={{ fontFamily: 'Nunito-SemiBold' }}>
                          {rem.dosageOrDetails}
                        </Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDeleteReminder(rem.id)}
                      className="p-2 bg-[#FFF1F2] border border-[#FECDD3] rounded-full"
                    >
                      <Trash2 size={14} color="#E11D48" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* TAB 4: FAMILY PHOTO MEMORY ALBUM (REMINISCENCE) */}
        {activeTab === 'memories' && (
          <View>
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View className="flex-1 mr-2">
                <Text className="text-base text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                  Family Memory Album
                </Text>
                <Text className="text-xs text-[#64748B] font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                  Photos used in {patient.name}'s Reminiscence recall game
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddMemoryOpen(true)}
                activeOpacity={0.85}
                className="flex-row items-center bg-[#E11D48] px-3.5 py-1.5 rounded-full"
                style={{
                  shadowColor: '#E11D48',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text className="text-white font-bold text-xs ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                  Add Photo
                </Text>
              </TouchableOpacity>
            </View>

            {/* List of family memories */}
            <View className="gap-3 mb-6">
              {familyMemories.length === 0 ? (
                <View 
                  className="bg-white border-2 border-[#EDE7DD] p-7 rounded-[26px] items-center text-center"
                  style={{
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  <Heart size={32} color="#FDA4AF" />
                  <Text className="text-lg font-bold text-[#1E293B] mt-2 mb-1" style={{ fontFamily: 'Nunito-Bold' }}>
                    No Custom Family Photos Yet
                  </Text>
                  <Text className="text-xs text-[#64748B] text-center font-semibold max-w-xs leading-relaxed" style={{ fontFamily: 'Nunito-SemiBold' }}>
                    Add photos of grandchildren, children, old houses, or festival days. Familiar faces stimulate positive emotional memory in dementia patients.
                  </Text>
                </View>
              ) : (
                familyMemories.map((mem) => (
                  <View
                    key={mem.id}
                    className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-4 flex-row items-start justify-between"
                    style={{
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <Image
                      source={{ uri: mem.imageUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' }}
                      style={{ width: 64, height: 64, borderRadius: 14, marginRight: 12 }}
                    />
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center gap-2 mb-0.5">
                        <Text className="text-base font-bold text-[#1E293B]" style={{ fontFamily: 'Nunito-Bold' }}>
                          {mem.title}
                        </Text>
                        <View className="bg-[#FFF1F2] border border-[#FECDD3] px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-[#BE123C]">{mem.relationship}</Text>
                        </View>
                      </View>
                      <Text className="text-xs text-[#475569] font-semibold mt-1" style={{ fontFamily: 'Nunito-SemiBold' }}>
                        💡 {mem.clue}
                      </Text>
                      <TouchableOpacity
                        onPress={() => speakPrompt(`Clue: ${mem.clue}`, 'en')}
                        className="flex-row items-center mt-2 self-start bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E2DDD5]"
                      >
                        <Volume2 size={12} color="#16704A" />
                        <Text className="text-[11px] font-bold text-[#16704A] ml-1">Hear Clue</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteMemory(mem.id)}
                      className="p-2"
                    >
                      <Trash2 size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* TAB 5: AI COGNITIVE TRAJECTORY & CLINICAL REPORT */}
        {activeTab === 'clinical' && aiAssessment && (
          <View className="gap-4 mb-6">
            {/* Action Bar for Clinical Export */}
            <View 
              className="bg-[#EAF7EE] border-2 border-[#86EFAC] p-4 rounded-2xl flex-row items-center justify-between"
              style={{
                shadowColor: '#16704A',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="flex-1 mr-3">
                <Text className="text-xs uppercase font-bold text-[#166534] tracking-wider" style={{ fontFamily: 'Nunito-Bold' }}>
                  Visiting Doctor / PHC Telehealth
                </Text>
                <Text className="text-sm font-bold text-[#145332] mt-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                  Clinical Assessment & MMSE Summary
                </Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleShareReport}
                  activeOpacity={0.82}
                  className="bg-[#16704A] px-3.5 py-2 rounded-xl flex-row items-center"
                >
                  <Share2 size={14} color="#FFFFFF" />
                  <Text className="text-white text-xs font-bold ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                    Share Report
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsReportModalOpen(true)}
                  activeOpacity={0.82}
                  className="bg-white border border-[#16704A] px-3 py-2 rounded-xl flex-row items-center"
                >
                  <FileText size={14} color="#16704A" />
                  <Text className="text-[#16704A] text-xs font-bold ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                    View
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* AI Cognitive Stability Index Gauge */}
            <View 
              className="bg-white border-2 border-[#EDE7DD] p-5 rounded-[26px]"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1 mr-3">
                  <Text className="text-xs uppercase font-bold text-[#64748B] tracking-wider" style={{ fontFamily: 'Nunito-Bold' }}>
                    AI Cognitive Stability Index
                  </Text>
                  <Text className="text-lg font-bold text-[#1E293B] mt-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                    {aiAssessment.summaryHeadline}
                  </Text>
                </View>
                <View className="w-16 h-16 rounded-2xl bg-[#F0FDF4] border-2 border-[#86EFAC] items-center justify-center">
                  <Text className="text-2xl font-black text-[#166534]">
                    {aiAssessment.cognitiveStabilityIndex}
                  </Text>
                  <Text className="text-[10px] font-bold text-[#15803D]">/100</Text>
                </View>
              </View>

              {/* Badges Grid */}
              <View className="flex-row flex-wrap gap-2 pt-2 border-t border-[#F1EBE1]">
                <View className="bg-[#FAF8F5] border border-[#E2DDD5] px-3 py-1.5 rounded-xl flex-row items-center">
                  <Text className="text-xs font-bold text-[#64748B]">Trend: </Text>
                  <Text className="text-xs font-black capitalize text-[#16704A]">{aiAssessment.trend}</Text>
                </View>

                <View className={`border px-3 py-1.5 rounded-xl flex-row items-center ${
                  aiAssessment.sundowningRisk === 'high' 
                    ? 'bg-[#FEF2F2] border-[#FCA5A5]' 
                    : aiAssessment.sundowningRisk === 'moderate'
                    ? 'bg-[#FFFBEB] border-[#FDE68A]'
                    : 'bg-[#F0FDF4] border-[#86EFAC]'
                }`}>
                  <Text className="text-xs font-bold text-[#64748B]">Evening Sundowning: </Text>
                  <Text className={`text-xs font-black uppercase ${
                    aiAssessment.sundowningRisk === 'high' 
                      ? 'text-[#DC2626]' 
                      : aiAssessment.sundowningRisk === 'moderate'
                      ? 'text-[#D97706]'
                      : 'text-[#16A34A]'
                  }`}>
                    {aiAssessment.sundowningRisk}
                  </Text>
                </View>

                <View className="bg-[#FAF8F5] border border-[#E2DDD5] px-3 py-1.5 rounded-xl flex-row items-center">
                  <Text className="text-xs font-bold text-[#64748B]">Reaction Time: </Text>
                  <Text className="text-xs font-black text-[#1E293B]">{aiAssessment.reactionTimeAvgMs} ms</Text>
                </View>

                <View className="bg-[#FAF8F5] border border-[#E2DDD5] px-3 py-1.5 rounded-xl flex-row items-center">
                  <Text className="text-xs font-bold text-[#64748B]">Routine Adherence: </Text>
                  <Text className="text-xs font-black text-[#16704A]">{aiAssessment.adherenceRate}%</Text>
                </View>
              </View>
            </View>

            {/* Clinical Observations Card */}
            <View 
              className="bg-white border-2 border-[#EDE7DD] p-5 rounded-[26px]"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <Text className="text-xs uppercase font-bold text-[#16704A] tracking-wider mb-2" style={{ fontFamily: 'Nunito-Bold' }}>
                Clinical Telemetry & Behavioral Observations
              </Text>
              <View className="gap-2">
                {aiAssessment.clinicalObservations.map((obs, idx) => (
                  <View key={idx} className="flex-row items-start">
                    <Text className="text-[#16704A] mr-2 font-bold">•</Text>
                    <Text className="flex-1 text-sm text-[#334155] font-semibold leading-relaxed" style={{ fontFamily: 'Nunito-SemiBold' }}>
                      {obs}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Actionable Recommendations Card */}
            <View 
              className="bg-[#FFF9F5] border-2 border-[#FDE6D2] p-5 rounded-[26px]"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <Text className="text-xs uppercase font-bold text-[#D96B27] tracking-wider mb-2" style={{ fontFamily: 'Nunito-Bold' }}>
                Actionable Recommendations for Caregiver
              </Text>
              <View className="gap-2">
                {aiAssessment.actionableRecommendations.map((rec, idx) => (
                  <View key={idx} className="flex-row items-start">
                    <Text className="text-[#D96B27] mr-2 font-bold">•</Text>
                    <Text className="flex-1 text-sm text-[#7C2D12] font-semibold leading-relaxed" style={{ fontFamily: 'Nunito-SemiBold' }}>
                      {rec}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ResponsiveContainer>

      {/* Add Reminder Modal with Intuitive AM/PM Selector */}
      <Modal visible={isAddReminderOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#FAF8F5] border-t border-[#E2DDD5] p-6 rounded-t-[36px] max-h-[90%]">
            <ResponsiveContainer maxWidth="md">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                  Add Patient Reminder
                </Text>
                <TouchableOpacity 
                  onPress={() => setIsAddReminderOpen(false)}
                  className="w-9 h-9 bg-white rounded-full border border-[#CBD5E1] items-center justify-center"
                >
                  <X size={17} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text className="text-xs text-[#475569] font-bold mb-1 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                Reminder Title *
              </Text>
              <TextInput
                value={remTitle}
                onChangeText={setRemTitle}
                placeholder="e.g. Afternoon Blood Pressure Tablet"
                placeholderTextColor="#94A3B8"
                style={{ fontFamily: 'Nunito-SemiBold' }}
                className="bg-white border-2 border-[#CBD5E1] text-[#1E293B] rounded-2xl px-4 py-3 mb-3 text-base"
              />

              {/* Reminder Type Chips */}
              <Text className="text-xs text-[#475569] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                Reminder Type
              </Text>
              <View className="flex-row gap-2 mb-3">
                {[
                  { type: 'medicine' as const, label: '💊 Medicine' },
                  { type: 'hydration' as const, label: '💧 Water' },
                  { type: 'daily_activity' as const, label: '☕ Tea / Habit' },
                  { type: 'appointment' as const, label: '📅 Appt' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    onPress={() => setRemType(item.type)}
                    className={`px-3 py-2 rounded-xl border ${
                      remType === item.type
                        ? 'bg-[#16704A] border-[#115438]'
                        : 'bg-white border-[#CBD5E1]'
                    }`}
                  >
                    <Text 
                      className={`text-xs font-bold ${remType === item.type ? 'text-white' : 'text-[#334155]'}`}
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* AM / PM Time Selector Box */}
              <View className="bg-white border-2 border-[#CBD5E1] p-4 rounded-2xl mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs text-[#475569] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                    Scheduled Time:
                  </Text>
                  <View className="bg-[#EAF7EE] px-3 py-1 rounded-full border border-[#BDE5CB]">
                    <Text className="text-[#16704A] text-sm font-black" style={{ fontFamily: 'Nunito-Bold' }}>
                      {formatDisplayTime(remHour, remMinute, remAmPm)}
                    </Text>
                  </View>
                </View>

                {/* Period Selector (AM / PM) */}
                <View className="flex-row gap-2 mb-3">
                  <TouchableOpacity
                    onPress={() => setRemAmPm('AM')}
                    className={`flex-1 py-2 rounded-xl items-center border ${
                      remAmPm === 'AM' ? 'bg-[#16704A] border-[#115438]' : 'bg-[#FAF8F5] border-[#CBD5E1]'
                    }`}
                  >
                    <Text className={`font-bold text-sm ${remAmPm === 'AM' ? 'text-white' : 'text-[#475569]'}`}>
                      AM (Morning)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setRemAmPm('PM')}
                    className={`flex-1 py-2 rounded-xl items-center border ${
                      remAmPm === 'PM' ? 'bg-[#16704A] border-[#115438]' : 'bg-[#FAF8F5] border-[#CBD5E1]'
                    }`}
                  >
                    <Text className={`font-bold text-sm ${remAmPm === 'PM' ? 'text-white' : 'text-[#475569]'}`}>
                      PM (Afternoon / Night)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Hour Selector (1 - 12) */}
                <Text className="text-[11px] text-[#64748B] font-bold mb-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                  Select Hour:
                </Text>
                <View className="flex-row flex-wrap gap-1.5 mb-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                    <TouchableOpacity
                      key={h}
                      onPress={() => setRemHour(h)}
                      className={`w-10 h-9 rounded-lg items-center justify-center border ${
                        remHour === h ? 'bg-[#16704A] border-[#115438]' : 'bg-[#FAF8F5] border-[#E2DDD5]'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${remHour === h ? 'text-white' : 'text-[#334155]'}`}>
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Minute Selector */}
                <Text className="text-[11px] text-[#64748B] font-bold mb-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                  Select Minute:
                </Text>
                <View className="flex-row gap-2">
                  {[0, 15, 30, 45].map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setRemMinute(m)}
                      className={`flex-1 py-2 rounded-xl items-center border ${
                        remMinute === m ? 'bg-[#16704A] border-[#115438]' : 'bg-[#FAF8F5] border-[#CBD5E1]'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${remMinute === m ? 'text-white' : 'text-[#334155]'}`}>
                        :{String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Instructions / Dosage */}
              <Text className="text-xs text-[#475569] font-bold mb-1 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                Instructions / Dosage (Optional)
              </Text>
              <TextInput
                value={remDosage}
                onChangeText={setRemDosage}
                placeholder="e.g. 1 tablet with warm water"
                placeholderTextColor="#94A3B8"
                style={{ fontFamily: 'Nunito-SemiBold' }}
                className="bg-white border-2 border-[#CBD5E1] text-[#1E293B] rounded-2xl px-4 py-3 mb-5 text-base"
              />

              <Button
                title="Save & Sync to Patient Device"
                variant="primary"
                size="large"
                onPress={handleCreateReminder}
              />
            </ResponsiveContainer>
          </View>
        </View>
      </Modal>

      {/* Add Family Memory Modal */}
      <Modal visible={isAddMemoryOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#FAF8F5] border-t border-[#E2DDD5] p-6 rounded-t-[36px] max-h-[90%]">
            <ResponsiveContainer maxWidth="md">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-xl text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                    Add Family Photo Memory
                  </Text>
                  <Text className="text-xs text-[#64748B] font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                    Used in {patient.name}'s Reminiscence recall game
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsAddMemoryOpen(false)}
                  className="w-9 h-9 bg-white rounded-full border border-[#CBD5E1] items-center justify-center"
                >
                  <X size={17} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Memory Name */}
              <Text className="text-xs text-[#475569] font-bold mb-1 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                Person or Memory Name *
              </Text>
              <TextInput
                value={memPhotoTitle}
                onChangeText={setMemPhotoTitle}
                placeholder="e.g. Granddaughter Priya"
                placeholderTextColor="#94A3B8"
                style={{ fontFamily: 'Nunito-SemiBold' }}
                className="bg-white border-2 border-[#CBD5E1] text-[#1E293B] rounded-2xl px-4 py-3 mb-3 text-base"
              />

              {/* Relationship Chips */}
              <Text className="text-xs text-[#475569] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                Relationship / Category
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {['Granddaughter', 'Son', 'Daughter', 'Spouse', 'Family Home', 'Festival'].map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    onPress={() => setMemRelationship(rel)}
                    className={`px-3 py-1.5 rounded-xl border ${
                      memRelationship === rel ? 'bg-[#E11D48] border-[#BE123C]' : 'bg-white border-[#CBD5E1]'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${memRelationship === rel ? 'text-white' : 'text-[#334155]'}`}>
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Memory Clue / Story */}
              <Text className="text-xs text-[#475569] font-bold mb-1 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                Story Clue / Voice Hint *
              </Text>
              <TextInput
                value={memClue}
                onChangeText={setMemClue}
                placeholder="e.g. She wore her golden Muga silk Mekhela Sador during Bihu."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                style={{ fontFamily: 'Nunito-SemiBold' }}
                className="bg-white border-2 border-[#CBD5E1] text-[#1E293B] rounded-2xl px-4 py-2.5 mb-3 text-sm"
              />

              {/* Photo Presets or URL */}
              <Text className="text-xs text-[#475569] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                Select Photo Preset (or paste image URL)
              </Text>
              <View className="flex-row gap-2 mb-5">
                {[
                  { label: 'Young Girl', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' },
                  { label: 'Tea Home', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80' },
                  { label: 'Eldest Son', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
                  { label: 'Family Outing', url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=400&q=80' },
                ].map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setMemImageUrl(item.url)}
                    className={`flex-1 p-2 rounded-xl border items-center ${
                      memImageUrl === item.url ? 'bg-[#FFF1F2] border-[#E11D48]' : 'bg-white border-[#CBD5E1]'
                    }`}
                  >
                    <Text className="text-[11px] font-bold text-[#1E293B] text-center" style={{ fontFamily: 'Nunito-Bold' }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="Save to Family Memory Album"
                variant="primary"
                size="large"
                onPress={handleCreateMemory}
              />
            </ResponsiveContainer>
          </View>
        </View>
      </Modal>

      {/* Clinical Medical Report View Modal */}
      <Modal visible={isReportModalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#FAF8F5] border-t border-[#E2DDD5] p-6 rounded-t-[36px] max-h-[92%]">
            <ResponsiveContainer maxWidth="md">
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-[#E2DDD5]">
                <View>
                  <Text className="text-xl text-[#115438] font-black" style={{ fontFamily: 'Nunito-Bold' }}>
                    Clinical Assessment Report
                  </Text>
                  <Text className="text-xs text-[#64748B] font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                    Standardized Telehealth Summary • MDoNER Platform
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsReportModalOpen(false)}
                  className="w-9 h-9 bg-white rounded-full border border-[#CBD5E1] items-center justify-center"
                >
                  <X size={17} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {aiAssessment && (
                  <View className="gap-3.5 mb-4">
                    {/* Patient Overview */}
                    <View className="bg-white border border-[#CBD5E1] p-4 rounded-2xl">
                      <Text className="text-xs font-bold text-[#64748B] uppercase mb-1">Patient Details</Text>
                      <Text className="text-base font-bold text-[#1E293B]">{patient.name}</Text>
                      <Text className="text-xs text-[#475569] mt-0.5">
                        {patient.age || 'Elder'} yrs • {patient.gender || 'Not specified'} • {patient.city || 'NER District'}
                      </Text>
                      <Text className="text-xs text-[#16704A] font-bold mt-1">
                        Dementia Stage: {patient.dementiaStage?.toUpperCase()} • Access Code: {patient.accessCode}
                      </Text>
                    </View>

                    {/* Stability Score Banner */}
                    <View className="bg-[#F0FDF4] border-2 border-[#86EFAC] p-4 rounded-2xl flex-row items-center justify-between">
                      <View className="flex-1 mr-2">
                        <Text className="text-xs font-bold text-[#166534] uppercase">Cognitive Stability Score</Text>
                        <Text className="text-xs text-[#15803D] font-semibold mt-0.5">{aiAssessment.summaryHeadline}</Text>
                      </View>
                      <Text className="text-3xl font-black text-[#166534]">{aiAssessment.cognitiveStabilityIndex}/100</Text>
                    </View>

                    {/* Clinical Observations */}
                    <View className="bg-white border border-[#CBD5E1] p-4 rounded-2xl">
                      <Text className="text-xs font-bold text-[#16704A] uppercase mb-2">Observations</Text>
                      {aiAssessment.clinicalObservations.map((obs, i) => (
                        <Text key={i} className="text-xs text-[#334155] font-semibold mb-1">• {obs}</Text>
                      ))}
                    </View>

                    {/* Recommendations */}
                    <View className="bg-[#FFF9F5] border border-[#FDE6D2] p-4 rounded-2xl">
                      <Text className="text-xs font-bold text-[#D96B27] uppercase mb-2">Clinical Recommendations</Text>
                      {aiAssessment.actionableRecommendations.map((rec, i) => (
                        <Text key={i} className="text-xs text-[#7C2D12] font-semibold mb-1">• {rec}</Text>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              <View className="flex-row gap-3 pt-2">
                <View className="flex-1">
                  <Button
                    title="Share with Doctor"
                    variant="primary"
                    size="normal"
                    icon={<Share2 size={16} color="#FFFFFF" />}
                    onPress={handleShareReport}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title="Done"
                    variant="outline"
                    size="normal"
                    onPress={() => setIsReportModalOpen(false)}
                  />
                </View>
              </View>
            </ResponsiveContainer>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
