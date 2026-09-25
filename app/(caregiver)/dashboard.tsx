import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Vibration, Share, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  UserPlus, 
  ChevronRight, 
  KeyRound, 
  LogOut, 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageSquare, 
  ShieldCheck, 
  MapPin,
  Navigation,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../../src/components/ui/Button';
import { ResponsiveContainer } from '../../src/components/ui/ResponsiveContainer';
import { LeafletPatientMap } from '../../src/components/ui/LeafletPatientMap';
import { useCaregiverStore } from '../../src/store/useCaregiverStore';
import { registerPatientCode } from '../../src/services/codeService';
import { signOutCaregiver } from '../../src/services/authService';
import { getCurrentLiveLocation } from '../../src/services/locationService';
import { PatientProfile, CognitiveGameType, DifficultyTier } from '../../src/types';
import { fetchStressAlerts } from '../../src/services/careApi';
import * as Haptics from 'expo-haptics';

const COMMON_NER_CITIES = ['Guwahati', 'Shillong', 'Jorhat', 'Dibrugarh', 'Tezpur', 'Silchar', 'Tura'];

export default function CaregiverDashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { 
    caregiver, 
    activeRole,
    setActiveRole,
    patients, 
    addPatient, 
    setSelectedPatient, 
    logoutCaregiver,
    loadCaregiverPatients,
  } = useCaregiverStore();

  // Add Patient Modal Form State (Clean - No mock data)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientCity, setPatientCity] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [patientLatitude, setPatientLatitude] = useState<number | null>(null);
  const [patientLongitude, setPatientLongitude] = useState<number | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'female' | 'male' | 'other'>('female');
  const [patientStage, setPatientStage] = useState<'early' | 'mild' | 'moderate'>('mild');
  const [patientLang, setPatientLang] = useState<'as' | 'kha' | 'bn' | 'en'>('as');
  const [patientNotes, setPatientNotes] = useState('');

  // Generated Code Screen State
  const [createdPatient, setCreatedPatient] = useState<PatientProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showMapInFamilyMode, setShowMapInFamilyMode] = useState(false);

  const openAddPatientModal = () => {
    setCreatedPatient(null);
    setPatientName('');
    setPatientCity('');
    setPatientAddress('');
    setPatientLatitude(null);
    setPatientLongitude(null);
    setLocationStatusMessage(null);
    setPatientAge('');
    setPatientNotes('');
    setIsAddModalOpen(true);
  };

  // Live GPS Location Detection
  const handleGetLiveLocation = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setIsDetectingLocation(true);
    setLocationStatusMessage(null);

    try {
      const loc = await getCurrentLiveLocation();
      setPatientLatitude(loc.latitude);
      setPatientLongitude(loc.longitude);
      setPatientCity(loc.city);
      setPatientAddress(loc.address);
      setLocationStatusMessage(`Live GPS locked: ${loc.address}`);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (err: any) {
      setLocationStatusMessage(err.message || 'Could not fetch live location. Please enter city manually.');
      Alert.alert('Location Error', err.message || 'Could not acquire live GPS location.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Realtime Patient Sync
  useEffect(() => {
    if (caregiver?.uid) {
      loadCaregiverPatients(caregiver.uid);
    }
  }, [caregiver?.uid]);

  // Background Alert Monitoring
  useEffect(() => {
    let since = Date.now() - 15000;
    const id = setInterval(async () => {
      try {
        const stressAlerts = await fetchStressAlerts(since);
        if (stressAlerts.length) {
          since = Date.now();
          Vibration.vibrate([0, 300, 150, 300]);
        }
      } catch {}
    }, 10000);
    return () => clearInterval(id);
  }, []);

  // Handle Copy to Clipboard
  const handleCopyCode = async (code: string) => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((current) => (current === code ? null : current));
    }, 2500);
  };

  // Handle Native Share Sheet
  const handleShareCode = async (patient: PatientProfile) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    try {
      await Share.share({
        title: `Cognia Access Code for ${patient.name}`,
        message: `Hello! Here is the Cognia login code for ${patient.name}: ${patient.accessCode}\n\nEnter this code in the Cognia app to access personalized daily cognitive activities and reminders.`,
      });
    } catch {}
  };

  // Create Patient & Register Regional Code
  const handleCreatePatient = async () => {
    if (!patientName.trim()) {
      Alert.alert('Required', 'Please enter the patient’s full name.');
      return;
    }

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setIsCreating(true);
    const newPatientId = `patient_${Date.now()}`;
    const caregiverId = caregiver?.uid || 'caregiver_active';

    const defaultTiers: Record<CognitiveGameType, DifficultyTier> = {
      memory_match: 'easy',
      daily_routine_recall: 'easy',
      pattern_recognition: 'easy',
      focus_tap: 'easy',
      reminiscence_match: 'easy',
    };

    const parsedAge = parseInt(patientAge.trim(), 10);

    const newPatientData: Partial<PatientProfile> = {
      city: patientCity.trim() || undefined,
      latitude: patientLatitude !== null ? patientLatitude : undefined,
      longitude: patientLongitude !== null ? patientLongitude : undefined,
      locationAddress: patientAddress.trim() || undefined,
      age: !isNaN(parsedAge) && parsedAge > 0 ? parsedAge : undefined,
      gender: patientGender,
      dementiaStage: patientStage,
      notes: patientNotes.trim() || undefined,
    };

    const code = await registerPatientCode(
      newPatientId,
      caregiverId,
      patientName.trim(),
      patientLang,
      newPatientData
    );

    const newPatient: PatientProfile = {
      id: newPatientId,
      caregiverId,
      name: patientName.trim(),
      city: patientCity.trim() || undefined,
      latitude: patientLatitude !== null ? patientLatitude : undefined,
      longitude: patientLongitude !== null ? patientLongitude : undefined,
      locationAddress: patientAddress.trim() || undefined,
      age: !isNaN(parsedAge) && parsedAge > 0 ? parsedAge : undefined,
      gender: patientGender,
      preferredLanguage: patientLang,
      accessCode: code,
      dementiaStage: patientStage,
      notes: patientNotes.trim() || undefined,
      createdAt: Date.now(),
      difficultyLevels: defaultTiers,
    };

    addPatient(newPatient);
    setCreatedPatient(newPatient);
    setIsCreating(false);
  };

  const handleSelectPatient = (patient: PatientProfile) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setSelectedPatient(patient);
    router.push(`/(caregiver)/patients/${patient.id}`);
  };

  const handleLogout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signOutCaregiver();
    } catch {}
    logoutCaregiver();
    router.replace('/');
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#FAF7F2' }} 
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 64 }}
      keyboardShouldPersistTaps="handled"
    >
      <ResponsiveContainer maxWidth="md">
        {/* Top Header Row */}
        <View className="flex-row items-center justify-between pt-4 mb-5">
          <View>
            {/* Interactive Role Switcher */}
            <TouchableOpacity
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setActiveRole(activeRole === 'family' ? 'clinical' : 'family');
              }}
              activeOpacity={0.82}
              className="px-3 py-1.5 rounded-full self-start mb-2 flex-row items-center border"
              style={{
                backgroundColor: activeRole === 'family' ? '#FFF1F2' : '#EAF7EE',
                borderColor: activeRole === 'family' ? '#FECDD3' : '#BDE5CB',
              }}
            >
              <Text style={{ fontSize: 13, marginRight: 5 }}>
                {activeRole === 'family' ? '🏠' : '🏥'}
              </Text>
              <Text 
                style={{ 
                  color: activeRole === 'family' ? '#9F1239' : '#145332',
                  fontSize: 12,
                  fontWeight: '700',
                  fontFamily: 'Nunito-Bold'
                }}
              >
                {activeRole === 'family' ? 'Family Caregiver Mode' : 'Clinical / ASHA Mode'}
              </Text>
              <View 
                style={{
                  backgroundColor: activeRole === 'family' ? '#FFE4E6' : '#DCFCE7',
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 10,
                  marginLeft: 6,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '700', color: activeRole === 'family' ? '#E11D48' : '#15803D' }}>
                  SWITCH
                </Text>
              </View>
            </TouchableOpacity>

            <Text 
              className="text-3xl text-[#1E293B] font-bold tracking-tight"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              {caregiver?.name ? `Hello, ${caregiver.name}` : activeRole === 'family' ? 'Family Care Hub' : 'Clinical Command'}
            </Text>

            {caregiver?.email ? (
              <Text 
                className="text-[#64748B] text-xs font-semibold mt-0.5"
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                {caregiver.email}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            className="flex-row items-center bg-white border border-[#CBD5E1] px-3.5 py-2 rounded-full"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <LogOut size={14} color="#64748B" />
            <Text 
              className="text-[#64748B] font-bold text-xs ml-1.5"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Metrics Bar */}
        <View className="flex-row gap-3 mb-5">
          <View 
            className="flex-1 bg-white border border-[#EDE7DD] p-4 rounded-2xl"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <Text className="text-[#94A3B8] text-[10px] font-bold uppercase tracking-wider">
              Assigned Patients
            </Text>
            <Text className="text-2xl text-[#16704A] font-black mt-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
              {patients.length}
            </Text>
          </View>

          <View 
            className="flex-1 bg-white border border-[#EDE7DD] p-4 rounded-2xl"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <Text className="text-[#94A3B8] text-[10px] font-bold uppercase tracking-wider">
              Care Reminders
            </Text>
            <Text className="text-2xl text-[#D96B27] font-black mt-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
              Active
            </Text>
          </View>
        </View>

        {/* Family vs Clinical Mode Banner */}
        {activeRole === 'family' ? (
          <View 
            className="bg-[#FFF8F3] border-2 border-[#FBDCC8] p-4 rounded-2xl mb-5 flex-row items-center justify-between"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-[#9A431D]" style={{ fontFamily: 'Nunito-Bold' }}>
                🏠 Family Home Care
              </Text>
              <Text className="text-xs text-[#B95217] mt-0.5 font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                Manage daily routines, hydration, tea, and memory photos for your loved one.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowMapInFamilyMode(!showMapInFamilyMode)}
              className="bg-white border border-[#FBDCC8] px-3 py-1.5 rounded-xl"
            >
              <Text className="text-xs font-bold text-[#9A431D]">
                {showMapInFamilyMode ? 'Hide Map' : '📍 View Map'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Interactive Leaflet Regional Health Map with Pins & Popups */}
        {patients.length > 0 && (activeRole === 'clinical' || showMapInFamilyMode) ? (
          <LeafletPatientMap
            patients={patients}
            onSelectPatient={handleSelectPatient}
          />
        ) : null}

        {/* Registered Patients Header & Action */}
        <View className="flex-row items-center justify-between mb-3 px-1">
          <View className="flex-1 mr-2 min-w-0">
            <Text 
              className="text-xl text-[#1E293B] font-bold"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              {activeRole === 'family' ? 'My Family Members' : 'Registered Patients'}
            </Text>
            <Text 
              className="text-xs text-[#64748B] font-semibold"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              {activeRole === 'family' 
                ? 'Tap on an elder to view their daily schedule, reminders, & photo album' 
                : 'Monitor cognitive health and patient codes across NER districts'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openAddPatientModal}
            className="flex-row items-center bg-[#16704A] px-4 py-2.5 rounded-full shrink-0"
            style={{
              shadowColor: '#16704A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <UserPlus size={15} color="#FFFFFF" />
            <Text 
              className="text-white font-bold text-xs ml-1.5"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Add Patient
            </Text>
          </TouchableOpacity>
        </View>

        {/* Patient Cards List */}
        <View className="gap-3.5">
          {patients.length === 0 ? (
            <View 
              className="bg-white border border-[#EDE7DD] p-8 rounded-[28px] items-center text-center"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="w-16 h-16 rounded-2xl bg-[#EAF7EE] border border-[#BDE5CB] items-center justify-center mb-3">
                <Users size={28} color="#16704A" />
              </View>
              <Text 
                className="text-xl text-[#1E293B] font-bold text-center"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                No Patients Added Yet
              </Text>
              <Text 
                className="text-[#64748B] text-center text-xs mt-1.5 mb-5 max-w-xs leading-relaxed"
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                Register your family member to generate a personalized patient access code they can use to enter their daily activities.
              </Text>

              {/* Only Add Patient button (Clean start) */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openAddPatientModal}
                className="bg-[#16704A] px-6 py-3 rounded-full flex-row items-center"
                style={{
                  shadowColor: '#16704A',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <UserPlus size={16} color="#FFFFFF" />
                <Text className="text-white font-bold text-sm ml-2" style={{ fontFamily: 'Nunito-Bold' }}>
                  Add Patient
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            patients.map((p) => {
              const isCopied = copiedCode === p.accessCode;
              return (
                <View
                  key={p.id}
                  className="bg-white border-2 border-[#EDE7DD] p-4.5 rounded-[24px]"
                  style={{
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  {/* Top: Name, City, Age, Stage, Chat */}
                  <View className="flex-row items-start justify-between mb-3 gap-2">
                    <View className="flex-row items-start flex-1 min-w-0">
                      <View className="w-10 h-10 rounded-2xl bg-[#EAF7EE] border border-[#BDE5CB] items-center justify-center mr-2.5 shrink-0 mt-0.5">
                        <Text className="text-lg">🌿</Text>
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text 
                          className="text-[#1E293B] font-bold text-base"
                          style={{ fontFamily: 'Nunito-Bold' }}
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                        
                        {/* Responsive Badge Chips that wrap naturally */}
                        <View className="flex-row flex-wrap gap-1 mt-1.5">
                          {p.locationAddress || p.city ? (
                            <View className="bg-[#EBF5FB] px-2 py-0.5 rounded-md border border-[#D4E6F1] flex-row items-center">
                              <MapPin size={10} color="#1B4F72" />
                              <Text className="text-[#1B4F72] text-[10px] font-bold ml-1" numberOfLines={1}>
                                {p.locationAddress || p.city}
                              </Text>
                            </View>
                          ) : null}
                          {typeof p.latitude === 'number' && typeof p.longitude === 'number' ? (
                            <View className="bg-[#EAF7EE] px-2 py-0.5 rounded-md border border-[#BDE5CB] flex-row items-center">
                              <View className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mr-1" />
                              <Text className="text-[#145332] text-[10px] font-bold">
                                Live GPS ({p.latitude.toFixed(2)}°, {p.longitude.toFixed(2)}°)
                              </Text>
                            </View>
                          ) : null}
                          {p.age ? (
                            <View className="bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#EDE7DD]">
                              <Text className="text-[#475569] text-[10px] font-semibold">Age {p.age}</Text>
                            </View>
                          ) : null}
                          <View className="bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#EDE7DD]">
                            <Text className="text-[#475569] text-[10px] font-semibold uppercase">{p.dementiaStage || 'EARLY'}</Text>
                          </View>
                          <View className="bg-[#EAF7EE] px-2 py-0.5 rounded-md border border-[#BDE5CB]">
                            <Text className="text-[#145332] text-[10px] font-bold uppercase">{p.preferredLanguage}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => router.push(`/(caregiver)/chat/${p.id}`)}
                      className="bg-[#EAF7EE] border border-[#BDE5CB] px-3 py-1.5 rounded-full flex-row items-center shrink-0"
                    >
                      <MessageSquare size={13} color="#16704A" />
                      <Text className="text-[#145332] text-xs font-bold ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                        Chat
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Patient Login Code Box with Direct Copy & Share */}
                  <View className="bg-[#FFF8F3] border-2 border-[#FBDCC8] p-3.5 rounded-2xl mb-3">
                    <View className="flex-row items-center justify-between mb-2 flex-wrap gap-1.5">
                      <View className="flex-row items-center">
                        <KeyRound size={14} color="#D96B27" />
                        <Text className="text-[#9A431D] text-xs font-bold ml-1.5 uppercase tracking-wider">
                          Patient Access Code
                        </Text>
                      </View>

                      {/* Action buttons: Copy & Share */}
                      <View className="flex-row items-center gap-1.5">
                        <TouchableOpacity
                          onPress={() => handleCopyCode(p.accessCode)}
                          activeOpacity={0.78}
                          className={`flex-row items-center px-2.5 py-1 rounded-full border ${
                            isCopied 
                              ? 'bg-[#16704A] border-[#115438]' 
                              : 'bg-white border-[#FAD0B6]'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check size={12} color="#FFFFFF" />
                              <Text className="text-white text-xs font-bold ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                                Copied!
                              </Text>
                            </>
                          ) : (
                            <>
                              <Copy size={12} color="#D96B27" />
                              <Text className="text-[#D96B27] text-xs font-bold ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                                Copy
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleShareCode(p)}
                          activeOpacity={0.78}
                          className="flex-row items-center bg-white border border-[#FAD0B6] px-2.5 py-1 rounded-full"
                        >
                          <Share2 size={12} color="#D96B27" />
                          <Text className="text-[#D96B27] text-xs font-bold ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                            Share
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Prominent Code */}
                    <Text 
                      className="text-2xl text-[#D96B27] font-black tracking-widest text-center py-1 bg-white rounded-xl border border-[#FDE3D3]"
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      {p.accessCode}
                    </Text>
                  </View>

                  {/* View Details Link */}
                  <TouchableOpacity
                    onPress={() => handleSelectPatient(p)}
                    activeOpacity={0.85}
                    className="flex-row items-center justify-between bg-[#FAF8F5] border border-[#E7E2D8] px-4 py-2.5 rounded-xl"
                  >
                    <Text className="text-[#1E293B] text-xs font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                      View Full Clinical Records & Timelines
                    </Text>
                    <ChevronRight size={15} color="#16704A" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ResponsiveContainer>

      {/* Add Patient & Code Sharing Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#FAF8F5] border-t border-[#E2DDD5] p-6 rounded-t-[36px] max-h-[92%]">
            <ResponsiveContainer maxWidth="md">
              <View className="flex-row items-center justify-between mb-4">
                <Text 
                  className="text-xl text-[#1E293B] font-bold"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  {createdPatient ? 'Patient Access Code Ready!' : 'Register Patient Under You'}
                </Text>
                <TouchableOpacity 
                  onPress={() => setIsAddModalOpen(false)}
                  className="w-9 h-9 bg-white rounded-full border border-[#CBD5E1] items-center justify-center"
                >
                  <X size={17} color="#64748B" />
                </TouchableOpacity>
              </View>

              {createdPatient ? (
                /* Code Generated Success Screen */
                <View className="items-center py-2">
                  <View className="w-14 h-14 rounded-2xl bg-[#EAF7EE] border border-[#BDE5CB] items-center justify-center mb-3">
                    <Text className="text-2xl">🎉</Text>
                  </View>

                  <Text 
                    className="text-[#1E293B] text-xl font-bold text-center mb-1"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    {createdPatient.name} is Registered!
                  </Text>
                  <Text 
                    className="text-[#64748B] text-center text-xs mb-4 font-semibold leading-relaxed max-w-sm"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    Share this unique access code with {createdPatient.name}. They will type this code on the patient opening screen to immediately start their activities.
                  </Text>

                  {/* Code Box */}
                  <View 
                    className="bg-white border-2 border-[#16704A] p-5 rounded-2xl items-center w-full mb-4"
                    style={{
                      shadowColor: '#16704A',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    <Text 
                      className="text-[#16704A] text-[11px] font-bold uppercase tracking-wider mb-1"
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      Patient Login Code
                    </Text>
                    <Text 
                      className="text-4xl text-[#16704A] font-black tracking-widest my-1"
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      {createdPatient.accessCode}
                    </Text>
                  </View>

                  {/* Action Buttons: Copy & Share */}
                  <View className="flex-row gap-3 w-full mb-4">
                    <TouchableOpacity
                      onPress={() => handleCopyCode(createdPatient.accessCode)}
                      activeOpacity={0.85}
                      className={`flex-1 py-3 px-4 rounded-xl flex-row items-center justify-center border ${
                        copiedCode === createdPatient.accessCode
                          ? 'bg-[#16704A] border-[#115438]'
                          : 'bg-white border-[#CBD5E1]'
                      }`}
                    >
                      {copiedCode === createdPatient.accessCode ? (
                        <>
                          <Check size={16} color="#FFFFFF" />
                          <Text className="text-white font-bold text-sm ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                            Copied!
                          </Text>
                        </>
                      ) : (
                        <>
                          <Copy size={16} color="#1E293B" />
                          <Text className="text-[#1E293B] font-bold text-sm ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                            Copy Code
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleShareCode(createdPatient)}
                      activeOpacity={0.85}
                      className="flex-1 bg-[#16704A] py-3 px-4 rounded-xl flex-row items-center justify-center"
                      style={{
                        shadowColor: '#16704A',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.15,
                        shadowRadius: 3,
                        elevation: 1,
                      }}
                    >
                      <Share2 size={16} color="#FFFFFF" />
                      <Text className="text-white font-bold text-sm ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Share Code
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Done / View Patient Button */}
                  <Button
                    title="Done & View Patient Records"
                    variant="primary"
                    size="large"
                    style={{ width: '100%' }}
                    onPress={() => {
                      setIsAddModalOpen(false);
                      handleSelectPatient(createdPatient);
                    }}
                  />
                </View>
              ) : (
                /* Patient Registration Form */
                <ScrollView showsVerticalScrollIndicator={false} className="max-h-[500px]">
                  {/* Full Name */}
                  <Text className="text-xs text-[#334155] font-bold mb-1 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                    Patient Full Name *
                  </Text>
                  <TextInput
                    value={patientName}
                    onChangeText={setPatientName}
                    placeholder="e.g. Biren Gogoi"
                    placeholderTextColor="#94A3B8"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                    className="bg-white border-2 border-[#CBD5E1] text-[#1E293B] rounded-2xl px-4 py-3 mb-3 text-base"
                  />

                  {/* Live GPS Location Action Box */}
                  <View className="mb-4 bg-[#F0FDF4] border-2 border-[#BBF7D0] p-3.5 rounded-2xl">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="w-8 h-8 rounded-full bg-[#DCFCE7] items-center justify-center mr-2">
                          <Navigation size={15} color="#16A34A" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-[#145332]" style={{ fontFamily: 'Nunito-Bold' }}>
                            Patient Live GPS Location
                          </Text>
                          <Text className="text-[11px] text-[#166534]" style={{ fontFamily: 'Nunito-SemiBold' }}>
                            Pins exact neighborhood on caregiver map
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={handleGetLiveLocation}
                        disabled={isDetectingLocation}
                        activeOpacity={0.8}
                        className="bg-[#16704A] px-3 py-1.5 rounded-xl flex-row items-center"
                        style={{
                          shadowColor: '#16704A',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.15,
                          shadowRadius: 2,
                          elevation: 1,
                        }}
                      >
                        {isDetectingLocation ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <MapPin size={12} color="#FFFFFF" />
                            <Text className="text-white text-xs font-bold ml-1" style={{ fontFamily: 'Nunito-Bold' }}>
                              {patientLatitude !== null ? 'Re-detect' : 'Use Live GPS'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Live GPS Active Locked Box */}
                    {patientLatitude !== null && patientLongitude !== null ? (
                      <View className="bg-white border border-[#86EFAC] p-2.5 rounded-xl mt-1.5">
                        <View className="flex-row items-center justify-between mb-1">
                          <View className="flex-row items-center">
                            <View className="w-2 h-2 rounded-full bg-[#16A34A] mr-1.5" />
                            <Text className="text-xs font-bold text-[#145332]" style={{ fontFamily: 'Nunito-Bold' }}>
                              Live GPS Locked
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              setPatientLatitude(null);
                              setPatientLongitude(null);
                              setLocationStatusMessage(null);
                            }}
                          >
                            <Text className="text-[10px] text-[#DC2626] font-bold">Clear</Text>
                          </TouchableOpacity>
                        </View>
                        <Text className="text-xs text-[#1E293B] font-semibold">
                          📍 {patientAddress || patientCity}
                        </Text>
                        <Text className="text-[10px] text-[#64748B] font-mono mt-0.5">
                          {patientLatitude.toFixed(5)}° N, {patientLongitude.toFixed(5)}° E
                        </Text>
                      </View>
                    ) : locationStatusMessage ? (
                      <Text className="text-xs text-[#B91C1C] mt-1 font-semibold">{locationStatusMessage}</Text>
                    ) : (
                      <Text className="text-[10px] text-[#166534] mt-0.5">
                        Tap "Use Live GPS" to automatically fetch current coordinates & neighborhood.
                      </Text>
                    )}
                  </View>

                  {/* City / Town with NER Suggestions */}
                  <Text className="text-xs text-[#334155] font-bold mb-1 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                    City / Town (Northeast India) *
                  </Text>
                  <TextInput
                    value={patientCity}
                    onChangeText={setPatientCity}
                    placeholder="e.g. Guwahati, Shillong, Jorhat"
                    placeholderTextColor="#94A3B8"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                    className="bg-white border-2 border-[#CBD5E1] text-[#1E293B] rounded-2xl px-4 py-3 mb-2 text-base"
                  />
                  <View className="flex-row flex-wrap gap-1.5 mb-3">
                    {COMMON_NER_CITIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => {
                          setPatientCity(c);
                          if (!patientAddress) setPatientAddress(`${c} Central`);
                        }}
                        className={`px-2.5 py-1 rounded-full border ${
                          patientCity.toLowerCase() === c.toLowerCase()
                            ? 'bg-[#16704A] border-[#115438]'
                            : 'bg-white border-[#CBD5E1]'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            patientCity.toLowerCase() === c.toLowerCase() ? 'text-white' : 'text-[#475569]'
                          }`}
                          style={{ fontFamily: 'Nunito-Bold' }}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Neighborhood / Street Address */}
                  <Text className="text-xs text-[#334155] font-bold mb-1 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                    Neighborhood / Street Area
                  </Text>
                  <TextInput
                    value={patientAddress}
                    onChangeText={setPatientAddress}
                    placeholder="e.g. Beltola Tiniali, GS Road, Laitumkhrah"
                    placeholderTextColor="#94A3B8"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                    className="bg-white border-2 border-[#CBD5E1] text-[#1E293B] rounded-2xl px-4 py-3 mb-3 text-base"
                  />

                  {/* Age & Gender Row */}
                  <View className="flex-row gap-3 mb-3">
                    <View className="flex-1">
                      <Text className="text-xs text-[#334155] font-bold mb-1 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Age
                      </Text>
                      <TextInput
                        value={patientAge}
                        onChangeText={setPatientAge}
                        placeholder="72"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        style={{ fontFamily: 'Nunito-SemiBold' }}
                        className="bg-white border-2 border-[#CBD5E1] text-[#1E293B] rounded-2xl px-4 py-3 text-base"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-xs text-[#334155] font-bold mb-1 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Gender
                      </Text>
                      <View className="flex-row gap-1.5 mt-0.5">
                        {(['female', 'male'] as const).map((g) => (
                          <TouchableOpacity
                            key={g}
                            onPress={() => setPatientGender(g)}
                            className={`flex-1 py-2.5 rounded-xl border items-center ${
                              patientGender === g ? 'bg-[#16704A] border-[#115438]' : 'bg-white border-[#CBD5E1]'
                            }`}
                          >
                            <Text 
                              className={`text-xs font-bold capitalize ${patientGender === g ? 'text-white' : 'text-[#475569]'}`}
                              style={{ fontFamily: 'Nunito-Bold' }}
                            >
                              {g}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Dementia Stage (Determines Map Blink Color) */}
                  <Text className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                    Cognitive Stage (Determines Map Blink Color)
                  </Text>
                  <View className="flex-row gap-2 mb-3">
                    {[
                      { code: 'mild', label: '🟢 Mild (Stable)' },
                      { code: 'moderate', label: '🟡 Moderate' },
                      { code: 'early', label: '🔴 High Care' },
                    ].map((s) => (
                      <TouchableOpacity
                        key={s.code}
                        onPress={() => setPatientStage(s.code as any)}
                        className={`flex-1 py-2 rounded-xl border items-center ${
                          patientStage === s.code ? 'bg-[#16704A] border-[#115438]' : 'bg-white border-[#CBD5E1]'
                        }`}
                      >
                        <Text 
                          className={`text-xs font-bold ${patientStage === s.code ? 'text-white' : 'text-[#475569]'}`}
                          style={{ fontFamily: 'Nunito-Bold' }}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Preferred Language */}
                  <Text className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                    Preferred Patient Language
                  </Text>
                  <View className="flex-row gap-2 mb-3">
                    {[
                      { code: 'as', label: 'অসমীয়া' },
                      { code: 'kha', label: 'Khasi' },
                      { code: 'bn', label: 'বাংলা' },
                      { code: 'en', label: 'English' },
                    ].map((l) => (
                      <TouchableOpacity
                        key={l.code}
                        onPress={() => setPatientLang(l.code as any)}
                        className={`flex-1 py-2 rounded-xl border items-center ${
                          patientLang === l.code ? 'bg-[#16704A] border-[#115438]' : 'bg-white border-[#CBD5E1]'
                        }`}
                      >
                        <Text 
                          className={`text-xs font-bold ${patientLang === l.code ? 'text-white' : 'text-[#475569]'}`}
                          style={{ fontFamily: 'Nunito-Bold' }}
                        >
                          {l.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Clinical Notes */}
                  <Text className="text-xs text-[#334155] font-bold mb-1 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                    Care Notes (Optional)
                  </Text>
                  <TextInput
                    value={patientNotes}
                    onChangeText={setPatientNotes}
                    placeholder="e.g. Needs morning reminders for BP medication; prefers calm voice."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={2}
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                    className="bg-white border-2 border-[#CBD5E1] text-[#1E293B] rounded-2xl px-4 py-2.5 mb-4 text-sm min-h-[60px]"
                  />

                  {/* Submit Button */}
                  <Button
                    title="Generate Access Code & Register"
                    variant="primary"
                    size="large"
                    loading={isCreating}
                    onPress={handleCreatePatient}
                  />
                </ScrollView>
              )}
            </ResponsiveContainer>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
