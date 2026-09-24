import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  UserPlus, 
  AlertTriangle, 
  ChevronRight, 
  KeyRound, 
  LogOut, 
  X,
  Share2,
  Sparkles,
  HeartHandshake
} from 'lucide-react-native';
import { Button } from '../../src/components/ui/Button';
import { useCaregiverStore } from '../../src/store/useCaregiverStore';
import { registerPatientCode } from '../../src/services/codeService';
import { signOutCaregiver } from '../../src/services/authService';
import { PatientProfile } from '../../src/types';
import { fetchStressAlerts } from '../../src/services/careApi';

export default function CaregiverDashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { 
    caregiver, 
    patients, 
    addPatient, 
    alerts, 
    markAlertRead, 
    setSelectedPatient, 
    logoutCaregiver 
  } = useCaregiverStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientLang, setPatientLang] = useState<'en' | 'as' | 'kha' | 'bn'>('as');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [houseAlert, setHouseAlert] = useState('');

  useEffect(() => {
    let since = Date.now() - 15000;
    const id = setInterval(async () => {
      try {
        const alerts = await fetchStressAlerts(since);
        if (alerts.length) {
          since = Date.now();
          const latest = alerts[0];
          setHouseAlert(`${latest.reasons || 'Stress signal'} from the patient phone.`);
          Vibration.vibrate([0, 400, 200, 400, 200, 800]);
        }
      } catch {}
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const handleCreatePatient = async () => {
    if (!patientName.trim()) {
      Alert.alert('Required', 'Please enter the patient’s full name.');
      return;
    }

    setIsCreating(true);
    const newPatientId = `patient_${Date.now()}`;
    const caregiverId = caregiver?.uid || 'caregiver_active';

    const code = await registerPatientCode(
      newPatientId,
      caregiverId,
      patientName.trim(),
      patientLang
    );

    const newPatient: PatientProfile = {
      id: newPatientId,
      caregiverId,
      name: patientName.trim(),
      age: parseInt(patientAge, 10) || 70,
      preferredLanguage: patientLang,
      accessCode: code,
      createdAt: Date.now(),
      difficultyLevels: {
        memory_match: 'easy',
        daily_routine_recall: 'easy',
        pattern_recognition: 'easy',
        focus_tap: 'easy',
      }
    };

    addPatient(newPatient);
    setCreatedCode(code);
    setIsCreating(false);
  };

  const handleSelectPatient = (patient: PatientProfile) => {
    setSelectedPatient(patient);
    router.push(`/(caregiver)/patients/${patient.id}`);
  };

  const handleLogout = async () => {
    try {
      await signOutCaregiver();
    } catch {}
    logoutCaregiver();
    router.replace('/');
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#FAF7F2' }} 
      contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 60 }}
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between pt-6 mb-4">
        <View>
          <View className="bg-[#EBF4EE] border border-[#CDE3D5] px-3 py-0.5 rounded-full self-start mb-1">
            <Text 
              className="text-[#2C503A] text-lg font-bold"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Family & Healthcare Portal
            </Text>
          </View>
          <Text 
            className="text-4xl text-[#2B3A30]"
            style={{ fontFamily: 'PatrickHand' }}
          >
            {caregiver?.name ? `Hello, ${caregiver.name}` : 'Caregiver Dashboard'}
          </Text>
          {caregiver?.email ? (
            <Text 
              className="text-[#64748B] text-lg font-semibold"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              {caregiver.email}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="p-2.5 bg-white border border-[#E8E2D8] rounded-full shadow-sm"
        >
          <LogOut size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      {houseAlert ? (
        <View className="bg-[#FDF3ED] border border-[#F4D8C9] rounded-3xl p-4 mb-4">
          <Text className="text-[#8A4226] text-xl" style={{ fontFamily: 'Nunito-Bold' }}>{houseAlert}</Text>
        </View>
      ) : null}

      {/* Metrics Banner */}
      <View className="flex-row gap-3 mb-6">
        <View 
          className="flex-1 bg-[#EBF4EE] border border-[#CDE3D5] p-5 rounded-3xl"
          style={{
            shadowColor: '#3A5C45',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text 
              className="text-[#3D6C4E] text-lg font-bold uppercase tracking-wider"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Patients
            </Text>
            <Users size={16} color="#4A7C59" />
          </View>
          <Text 
            className="text-4xl text-[#2C503A] mt-1"
            style={{ fontFamily: 'PatrickHand' }}
          >
            {patients.length} Active
          </Text>
        </View>

        <View 
          className="flex-1 bg-[#FDF3ED] border border-[#F4D8C9] p-5 rounded-3xl"
          style={{
            shadowColor: '#8C5A40',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text 
              className="text-[#864127] text-lg font-bold uppercase tracking-wider"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Alerts
            </Text>
            <AlertTriangle size={16} color="#C87453" />
          </View>
          <Text 
            className="text-4xl text-[#864127] mt-1"
            style={{ fontFamily: 'PatrickHand' }}
          >
            {alerts.filter((a) => !a.isRead).length} Unread
          </Text>
        </View>
      </View>

      {/* Alert Feed */}
      {alerts.length > 0 && (
        <View className="mb-6">
          <Text 
            className="text-3xl text-[#2B3A30] mb-3"
            style={{ fontFamily: 'PatrickHand' }}
          >
            🔔 Patient Care Updates
          </Text>
          <View className="gap-2.5">
            {alerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                onPress={() => markAlertRead(alert.id)}
                className={
                  alert.severity === 'warning'
                    ? alert.isRead
                      ? 'p-4 rounded-3xl border bg-[#FDF3ED] border-[#F4D8C9] opacity-60'
                      : 'p-4 rounded-3xl border bg-[#FDF3ED] border-[#F4D8C9]'
                    : alert.isRead
                      ? 'p-4 rounded-3xl border bg-[#EBF4EE] border-[#CDE3D5] opacity-60'
                      : 'p-4 rounded-3xl border bg-[#EBF4EE] border-[#CDE3D5]'
                }
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text 
                    className="text-[#2D3748] font-bold text-xl"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    {alert.patientName}
                  </Text>
                  <Text 
                    className="text-[#718096] text-lg"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text 
                  className="text-[#4A5568] text-xl"
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                >
                  {alert.message}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Registered Patients Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text 
          className="text-3xl text-[#2B3A30]"
          style={{ fontFamily: 'PatrickHand' }}
        >
          Registered Patients
        </Text>
        <TouchableOpacity
          onPress={() => {
            setCreatedCode(null);
            setPatientName('');
            setPatientAge('');
            setIsAddModalOpen(true);
          }}
          className="flex-row items-center bg-[#4A7C59] px-4 py-2 rounded-full shadow-sm"
        >
          <UserPlus size={16} color="#FFFFFF" />
          <Text 
            className="text-white font-bold text-lg ml-1.5"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Add Patient
          </Text>
        </TouchableOpacity>
      </View>

      <View className="gap-3">
        {patients.length === 0 ? (
          <View 
            className="bg-white border border-[#EFEBE4] p-8 rounded-[32px] items-center text-center"
            style={{
              shadowColor: '#6B5E4F',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 14,
              elevation: 2,
            }}
          >
            <View className="w-16 h-16 rounded-full bg-[#EBF4EE] border border-[#CDE3D5] items-center justify-center mb-3">
              <Users size={28} color="#3D6C4E" />
            </View>
            <Text 
              className="text-3xl text-[#2B3A30] text-center"
              style={{ fontFamily: 'PatrickHand' }}
            >
              No Patients Added Yet
            </Text>
            <Text 
              className="text-[#64748B] text-center text-xl mt-1 mb-5 max-w-xs"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              Tap 'Add Patient' to create a memorable entry code for your family member, or load sample records to test the dashboard.
            </Text>

            <View className="flex-row gap-2.5">
              <TouchableOpacity
                onPress={() => {
                  setCreatedCode(null);
                  setPatientName('');
                  setPatientAge('');
                  setIsAddModalOpen(true);
                }}
                className="bg-[#3D6C4E] px-5 py-3 rounded-full flex-row items-center shadow-sm"
              >
                <UserPlus size={16} color="#FFFFFF" />
                <Text 
                  className="text-white font-bold text-lg ml-1.5"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Add Patient
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  useCaregiverStore.getState().loadSamplePatientsDemo();
                }}
                className="bg-[#F5F0F8] border border-[#DDD3E7] px-4 py-3 rounded-full flex-row items-center"
              >
                <Sparkles size={16} color="#675283" />
                <Text 
                  className="text-[#675283] font-bold text-lg ml-1.5"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Load Demo Data
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          patients.map((p) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.85}
              onPress={() => handleSelectPatient(p)}
              className="bg-white border border-[#EFEBE4] p-5 rounded-[28px] flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text 
                    className="text-[#2D3748] font-bold text-xl"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    {p.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push(`/(caregiver)/chat/${p.id}`)}
                    className="bg-[#EBF4EE] px-3 py-2 rounded-full ml-2"
                  >
                    <Text className="text-[#2C503A] text-xl" style={{ fontFamily: 'Nunito-Bold' }}>Chat</Text>
                  </TouchableOpacity>
                  <View className="bg-[#EBF4EE] border border-[#CDE3D5] px-2.5 py-0.5 rounded-full ml-2">
                    <Text 
                      className="text-[#2C503A] text-lg font-bold uppercase"
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      {p.preferredLanguage}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center mt-2">
                  <View className="flex-row items-center bg-[#FDF3ED] border border-[#F4D8C9] px-2.5 py-0.5 rounded-full mr-3">
                    <KeyRound size={12} color="#C87453" />
                    <Text 
                      className="text-[#C87453] font-black text-lg ml-1 tracking-wider"
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      {p.accessCode}
                    </Text>
                  </View>
                  <Text 
                    className="text-[#718096] text-lg font-semibold"
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    Age: {p.age || 70}
                  </Text>
                </View>
              </View>

              <ChevronRight size={20} color="#A0AEC0" />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Add Patient Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-[#FAF8F5] border-t border-[#E8E2D8] p-6 rounded-t-3xl max-h-[90%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text 
                className="text-3xl text-[#2B3A30]"
                style={{ fontFamily: 'PatrickHand' }}
              >
                {createdCode ? '🎉 Code Created!' : 'Register Patient'}
              </Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <X size={22} color="#718096" />
              </TouchableOpacity>
            </View>

            {createdCode ? (
              <View className="items-center py-3">
                <Text 
                  className="text-[#4A5568] text-center text-xl mb-3 font-semibold"
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                >
                  Share this code with {patientName}. They can enter it on the opening screen to jump straight into their personalized brain games.
                </Text>

                <View className="bg-white border-2 border-[#CDE3D5] p-5 rounded-3xl items-center w-full my-3 shadow-sm">
                  <Text 
                    className="text-[#4A7C59] text-lg font-bold uppercase tracking-wider"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    Patient Entry Code
                  </Text>
                  <Text 
                    className="text-4xl text-[#2C503A] tracking-widest mt-1"
                    style={{ fontFamily: 'PatrickHand' }}
                  >
                    {createdCode}
                  </Text>
                </View>

                <Button
                  title="Done & View Patients"
                  variant="primary"
                  size="large"
                  style={{ width: '100%', marginTop: 12 }}
                  onPress={() => setIsAddModalOpen(false)}
                />
              </View>
            ) : (
              <View>
                <Text 
                  className="text-[#4A5568] text-lg font-bold mb-1"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Patient Full Name
                </Text>
                <TextInput
                  value={patientName}
                  onChangeText={setPatientName}
                  placeholder="e.g. Biren Gogoi"
                  placeholderTextColor="#A0AEC0"
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                  className="bg-white border border-[#E2DDD3] text-[#2D3748] rounded-2xl px-4 py-3 mb-3 text-xl"
                />

                <Text 
                  className="text-[#4A5568] text-lg font-bold mb-1"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Age
                </Text>
                <TextInput
                  value={patientAge}
                  onChangeText={setPatientAge}
                  placeholder="e.g. 74"
                  placeholderTextColor="#A0AEC0"
                  keyboardType="numeric"
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                  className="bg-white border border-[#E2DDD3] text-[#2D3748] rounded-2xl px-4 py-3 mb-3 text-xl"
                />

                <Text 
                  className="text-[#4A5568] text-lg font-bold mb-2"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Preferred Language
                </Text>
                <View className="flex-row gap-2 mb-6">
                  {[
                    { code: 'as', label: 'Assamese' },
                    { code: 'kha', label: 'Khasi' },
                    { code: 'bn', label: 'Bengali' },
                    { code: 'en', label: 'English' },
                  ].map((l) => (
                    <TouchableOpacity
                      key={l.code}
                      onPress={() => setPatientLang(l.code as any)}
                      className={patientLang === l.code ? 'flex-1 py-2.5 rounded-2xl border items-center bg-[#4A7C59] border-[#3D6C4E]' : 'flex-1 py-2.5 rounded-2xl border items-center bg-white border-[#E2DDD3]'}
                    >
                      <Text 
                        className={`text-lg ${patientLang === l.code ? 'text-white font-bold' : 'text-[#718096]'}`}
                        style={{ fontFamily: 'Nunito-Bold' }}
                      >
                        {l.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button
                  title="Generate Code & Register"
                  variant="primary"
                  size="large"
                  loading={isCreating}
                  onPress={handleCreatePatient}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
