import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle, 
  Mail, 
  Lock,
  ArrowRight,
  User,
  Phone,
  KeyRound,
  CheckCircle2,
  Users,
  Eye,
  EyeOff,
  Sparkles,
  Building2,
  Heart
} from 'lucide-react-native';
import { Button } from '../../src/components/ui/Button';
import { ResponsiveContainer } from '../../src/components/ui/ResponsiveContainer';
import { CogniaLogo } from '../../src/components/ui/CogniaLogo';
import { useCaregiverStore } from '../../src/store/useCaregiverStore';
import { 
  signInWithGoogleService, 
  signInWithEmailService,
  authenticateWithGoogleAccount,
  registerFamilyCaregiverWithCode,
  isAuthorizedCaregiver
} from '../../src/services/authService';
import { resolvePatientCode } from '../../src/services/codeService';
import { GoogleAccountChooserModal } from '../../src/components/ui/GoogleAccountChooserModal';
import * as Haptics from 'expo-haptics';

const COMMON_RELATIONSHIPS = ['Daughter', 'Son', 'Spouse', 'Grandchild', 'Sister/Brother', 'Guardian'];

export default function CaregiverLoginScreen() {
  const router = useRouter();
  const { setCaregiver, setActiveRole, setSelectedPatient } = useCaregiverStore();

  const [selectedRole, setSelectedRole] = useState<'family' | 'clinical'>('clinical');
  const [familyTab, setFamilyTab] = useState<'signup' | 'signin'>('signup');

  // Shared inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Family Sign Up specific fields
  const [patientCode, setPatientCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [phone, setPhone] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [matchedPatientInfo, setMatchedPatientInfo] = useState<{ name: string; city?: string } | null>(null);

  // Dynamic Patient Code Verification
  useEffect(() => {
    const trimmed = patientCode.trim().toUpperCase();
    if (trimmed.length < 4) {
      setMatchedPatientInfo(null);
      return;
    }

    let isMounted = true;
    setVerifyingCode(true);

    const timer = setTimeout(async () => {
      try {
        const res = await resolvePatientCode(trimmed);
        if (isMounted) {
          if (res?.patient) {
            setMatchedPatientInfo({
              name: res.patient.name,
              city: res.patient.city || 'Assam',
            });
            if (errorMessage) setErrorMessage('');
          } else {
            setMatchedPatientInfo(null);
          }
        }
      } catch {
        if (isMounted) setMatchedPatientInfo(null);
      } finally {
        if (isMounted) setVerifyingCode(false);
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [patientCode]);

  // Google Authentication Trigger (Only for Clinic / ASHA)
  const handleGoogleSignIn = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setErrorMessage('');

    if (Platform.OS !== 'web') {
      setShowGoogleModal(true);
      return;
    }

    setLoading(true);
    try {
      const profile = await signInWithGoogleService();
      if (profile) {
        profile.role = 'clinical';
        setCaregiver(profile);
        await setActiveRole('clinical');
        router.replace('/(caregiver)/dashboard');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('cancelled')) {
        return;
      }
      setShowGoogleModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Google Account Chooser selection
  const handleGoogleAccountSelected = async (selectedEmail: string, name: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const profile = await authenticateWithGoogleAccount(selectedEmail, name, 'clinical');
      if (profile) {
        setCaregiver(profile);
        await setActiveRole('clinical');
        setShowGoogleModal(false);
        router.replace('/(caregiver)/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate with Google account.');
    } finally {
      setLoading(false);
    }
  };

  // Clinic / ASHA Email Sign-In
  const handleClinicalSignIn = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setErrorMessage('Please enter your authorized clinic email and password.');
      return;
    }

    if (!isAuthorizedCaregiver(cleanEmail)) {
      setErrorMessage(`Access Denied: "${cleanEmail}" is not authorized for Clinic/ASHA access. Please contact your administrator.`);
      return;
    }

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setLoading(true);
    setErrorMessage('');

    try {
      const profile = await signInWithEmailService(cleanEmail, password, 'clinical');
      if (profile) {
        setCaregiver(profile);
        await setActiveRole('clinical');
        router.replace('/(caregiver)/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect clinical credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Family Caregiver Sign Up with Patient Code
  const handleFamilySignUp = async () => {
    const cleanCode = patientCode.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanCode) {
      setErrorMessage('Please enter the 6-character Patient Access Code (e.g. TEA-204).');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 7) {
      setErrorMessage('Please enter a valid phone number so clinic staff can reach you.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setErrorMessage('Please set a password with at least 6 characters.');
      return;
    }

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setLoading(true);
    setErrorMessage('');

    try {
      const { caregiver, patient } = await registerFamilyCaregiverWithCode({
        patientCode: cleanCode,
        name: cleanName,
        relationship: relationship.trim() || 'Family Member',
        phone: cleanPhone,
        email: cleanEmail,
        password: password.trim(),
      });

      setCaregiver(caregiver);
      await setActiveRole('family');
      setSelectedPatient(patient);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      router.replace('/(caregiver)/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register family caregiver. Please check the patient code.');
    } finally {
      setLoading(false);
    }
  };

  // Family Caregiver Returning Email Sign-In
  const handleFamilySignIn = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setErrorMessage('Please enter both your registered email and password.');
      return;
    }

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setLoading(true);
    setErrorMessage('');

    try {
      const profile = await signInWithEmailService(cleanEmail, password, 'family');
      if (profile) {
        setCaregiver(profile);
        await setActiveRole('family');
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        router.replace('/(caregiver)/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not sign in. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#FAF7F2' }}
    >
      <ScrollView 
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingVertical: 28, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <ResponsiveContainer maxWidth="sm">
          {/* Back to Patient Screen Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.82}
            className="flex-row items-center mb-5 self-start px-4 py-2 bg-white border border-[#CBD5E1] rounded-full"
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
              className="text-[#475569] ml-2 text-xs font-bold"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Back to Patient Screen
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View className="items-center mb-5">
            <View className="mb-2">
              <CogniaLogo size={64} />
            </View>

            <Text 
              className="text-3xl text-[#1E293B] font-bold text-center tracking-tight"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Caregiver Portal
            </Text>
            <Text 
              className="text-[#64748B] text-xs text-center mt-1.5 max-w-xs font-semibold leading-relaxed"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              Dedicated portal for family members & clinic/ASHA healthcare teams
            </Text>
          </View>

          {/* Main Card */}
          <View 
            className="bg-white rounded-[28px] p-6 border border-[#E7E2D8]"
            style={{
              shadowColor: '#473E35',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            {/* Role Selection Tabs */}
            <Text className="text-xs text-[#475569] font-bold mb-2 ml-0.5 uppercase tracking-wider" style={{ fontFamily: 'Nunito-Bold' }}>
              Select Caregiver Role:
            </Text>

            <View className="flex-row gap-2.5 mb-5">
              {/* Role 1: Clinic / ASHA Worker */}
              <TouchableOpacity
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setSelectedRole('clinical');
                  setErrorMessage('');
                }}
                activeOpacity={0.85}
                className={`flex-1 p-3.5 rounded-2xl border-2 ${
                  selectedRole === 'clinical' 
                    ? 'bg-[#F0FDF4] border-[#16704A]' 
                    : 'bg-[#FAF8F5] border-[#E2DDD5]'
                }`}
                style={{
                  shadowColor: selectedRole === 'clinical' ? '#16704A' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: selectedRole === 'clinical' ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: selectedRole === 'clinical' ? 1 : 0,
                }}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-2xl">🏥</Text>
                  {selectedRole === 'clinical' && (
                    <View className="bg-[#16704A] px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-white">ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text 
                  className={`text-sm font-bold ${selectedRole === 'clinical' ? 'text-[#166534]' : 'text-[#1E293B]'}`}
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Clinic / ASHA
                </Text>
                <Text 
                  className="text-[11px] text-[#64748B] mt-0.5 leading-snug font-semibold"
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                >
                  Google & Email login, GIS map, & patient rosters
                </Text>
              </TouchableOpacity>

              {/* Role 2: Family Caregiver */}
              <TouchableOpacity
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setSelectedRole('family');
                  setErrorMessage('');
                }}
                activeOpacity={0.85}
                className={`flex-1 p-3.5 rounded-2xl border-2 ${
                  selectedRole === 'family' 
                    ? 'bg-[#FFF8F3] border-[#D96B27]' 
                    : 'bg-[#FAF8F5] border-[#E2DDD5]'
                }`}
                style={{
                  shadowColor: selectedRole === 'family' ? '#D96B27' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: selectedRole === 'family' ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: selectedRole === 'family' ? 1 : 0,
                }}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-2xl">🏠</Text>
                  {selectedRole === 'family' && (
                    <View className="bg-[#D96B27] px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-white">ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text 
                  className={`text-sm font-bold ${selectedRole === 'family' ? 'text-[#9A431D]' : 'text-[#1E293B]'}`}
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Family Member
                </Text>
                <Text 
                  className="text-[11px] text-[#64748B] mt-0.5 leading-snug font-semibold"
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                >
                  Sign up with patient code, daily care & habits
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Callout */}
            {errorMessage ? (
              <View className="flex-row items-center bg-[#FFF1F2] border border-[#FECDD3] p-3.5 rounded-2xl mb-4">
                <AlertCircle size={18} color="#E11D48" />
                <Text 
                  className="text-[#BE123C] text-xs font-bold ml-2.5 flex-1 leading-snug"
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* ======================================================== */}
            {/* VIEW A: CLINIC / ASHA WORKER (GOOGLE + EMAIL LOGIN)       */}
            {/* ======================================================== */}
            {selectedRole === 'clinical' && (
              <View>
                {/* 1. Google Authentication Button */}
                <TouchableOpacity
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  activeOpacity={0.88}
                  className="flex-row items-center justify-center bg-white border-2 border-[#E2DDD5] py-3.5 px-4 rounded-2xl active:bg-[#F8F6F2] mb-1"
                  style={{
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.03,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <View className="w-6 h-6 rounded-full bg-[#EA4335] items-center justify-center mr-2.5">
                    <Text className="text-white text-xs font-black">G</Text>
                  </View>
                  <Text 
                    className="text-[#1E293B] text-base font-bold"
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View className="flex-row items-center my-4">
                  <View className="flex-1 h-[1px] bg-[#E7E2D8]" />
                  <View className="bg-[#FAF7F2] border border-[#E7E2D8] px-3 py-1 rounded-full mx-2">
                    <Text 
                      className="text-[#94A3B8] text-[10px] uppercase tracking-wider font-bold"
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      or clinic email sign in
                    </Text>
                  </View>
                  <View className="flex-1 h-[1px] bg-[#E7E2D8]" />
                </View>

                {/* Email Field */}
                <View className="mb-3.5">
                  <Text 
                    className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" 
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    Clinical / ASHA Email
                  </Text>
                  <View className="flex-row items-center bg-[#FAF8F5] border-2 border-[#CBD5E1] rounded-2xl px-3.5 py-3">
                    <Mail size={17} color="#64748B" />
                    <TextInput
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="asha.guwahati@cognia.org"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      className="flex-1 ml-2.5 text-base text-[#1E293B]"
                      style={{ fontFamily: 'Nunito-SemiBold' }}
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View className="mb-5">
                  <Text 
                    className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" 
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    Password
                  </Text>
                  <View className="flex-row items-center bg-[#FAF8F5] border-2 border-[#CBD5E1] rounded-2xl px-3.5 py-3">
                    <Lock size={17} color="#64748B" />
                    <TextInput
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="Enter clinical password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      className="flex-1 ml-2.5 text-base text-[#1E293B]"
                      style={{ fontFamily: 'Nunito-SemiBold' }}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                      {showPassword ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Primary Button */}
                <Button
                  title="Sign In to Clinic / ASHA Portal"
                  variant="primary"
                  size="large"
                  loading={loading}
                  icon={<ArrowRight size={17} color="#FFFFFF" />}
                  onPress={handleClinicalSignIn}
                />

                {/* Clinical Notice */}
                <View className="flex-row items-start mt-4 bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-xl">
                  <Building2 size={15} color="#64748B" style={{ marginTop: 2 }} />
                  <Text className="text-[11px] text-[#64748B] ml-2 flex-1 leading-relaxed font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                    Healthcare and ASHA personnel have access to patient registration codes, district maps, and clinical telemetry.
                  </Text>
                </View>
              </View>
            )}

            {/* ======================================================== */}
            {/* VIEW B: FAMILY CAREGIVER (NO GOOGLE; CODE SIGNUP & SIGNIN) */}
            {/* ======================================================== */}
            {selectedRole === 'family' && (
              <View>
                {/* Sub-tab Switcher: Sign Up with Patient Code vs. Email Sign In */}
                <View className="flex-row bg-[#FAF8F5] border border-[#E2DDD5] p-1 rounded-2xl mb-4">
                  <TouchableOpacity
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                      setFamilyTab('signup');
                      setErrorMessage('');
                    }}
                    activeOpacity={0.8}
                    className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
                      familyTab === 'signup' ? 'bg-[#D96B27]' : 'bg-transparent'
                    }`}
                  >
                    <KeyRound size={13} color={familyTab === 'signup' ? '#FFFFFF' : '#64748B'} />
                    <Text 
                      className={`text-xs font-bold ml-1.5 ${familyTab === 'signup' ? 'text-white' : 'text-[#64748B]'}`}
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      Sign Up with Patient Code
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                      setFamilyTab('signin');
                      setErrorMessage('');
                    }}
                    activeOpacity={0.8}
                    className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${
                      familyTab === 'signin' ? 'bg-[#D96B27]' : 'bg-transparent'
                    }`}
                  >
                    <Mail size={13} color={familyTab === 'signin' ? '#FFFFFF' : '#64748B'} />
                    <Text 
                      className={`text-xs font-bold ml-1.5 ${familyTab === 'signin' ? 'text-white' : 'text-[#64748B]'}`}
                      style={{ fontFamily: 'Nunito-Bold' }}
                    >
                      Returning Sign In
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 1. FAMILY SIGN UP WITH PATIENT CODE */}
                {familyTab === 'signup' && (
                  <View>
                    {/* Patient Code Field */}
                    <View className="mb-3.5">
                      <View className="flex-row items-center justify-between mb-1.5 ml-0.5">
                        <Text className="text-xs text-[#334155] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                          Patient Access Code <Text className="text-[#D96B27]">*</Text>
                        </Text>
                        <Text className="text-[10px] text-[#94A3B8] font-semibold">From Clinic or ASHA Worker</Text>
                      </View>

                      <View className="flex-row items-center bg-[#FAF8F5] border-2 border-[#D96B27] rounded-2xl px-3.5 py-3">
                        <KeyRound size={18} color="#D96B27" />
                        <TextInput
                          value={patientCode}
                          onChangeText={(val) => {
                            setPatientCode(val.toUpperCase());
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="e.g. TEA-204 or AS7294"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="characters"
                          className="flex-1 ml-2.5 text-base text-[#1E293B] font-bold tracking-wider"
                          style={{ fontFamily: 'Nunito-Bold' }}
                        />
                        {verifyingCode && <ActivityIndicator size="small" color="#D96B27" />}
                      </View>

                      {/* Verified Patient Feedback Badge */}
                      {matchedPatientInfo ? (
                        <View className="flex-row items-center bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-xl mt-2">
                          <CheckCircle2 size={14} color="#16A34A" />
                          <Text className="text-[#15803D] text-xs font-bold ml-1.5" style={{ fontFamily: 'Nunito-Bold' }}>
                            ✓ Connected to: {matchedPatientInfo.name} ({matchedPatientInfo.city})
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Family Member's Full Name */}
                    <View className="mb-3.5">
                      <Text className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Your Full Name <Text className="text-[#D96B27]">*</Text>
                      </Text>
                      <View className="flex-row items-center bg-[#FAF8F5] border-2 border-[#CBD5E1] rounded-2xl px-3.5 py-3">
                        <User size={17} color="#64748B" />
                        <TextInput
                          value={fullName}
                          onChangeText={(val) => {
                            setFullName(val);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="e.g. Priya Sharma"
                          placeholderTextColor="#94A3B8"
                          className="flex-1 ml-2.5 text-base text-[#1E293B]"
                          style={{ fontFamily: 'Nunito-SemiBold' }}
                        />
                      </View>
                    </View>

                    {/* Relationship Selection Pills */}
                    <View className="mb-3.5">
                      <Text className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Relationship to Patient
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-2">
                        {COMMON_RELATIONSHIPS.map((rel) => (
                          <TouchableOpacity
                            key={rel}
                            onPress={() => setRelationship(rel)}
                            activeOpacity={0.8}
                            className={`px-3 py-1.5 rounded-full border mr-1.5 ${
                              relationship === rel 
                                ? 'bg-[#FFF3EB] border-[#D96B27]' 
                                : 'bg-[#FAF8F5] border-[#CBD5E1]'
                            }`}
                          >
                            <Text 
                              className={`text-xs font-bold ${relationship === rel ? 'text-[#D96B27]' : 'text-[#64748B]'}`}
                              style={{ fontFamily: 'Nunito-Bold' }}
                            >
                              {rel}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Mobile Phone Number */}
                    <View className="mb-3.5">
                      <Text className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Your Mobile Phone Number <Text className="text-[#D96B27]">*</Text>
                      </Text>
                      <View className="flex-row items-center bg-[#FAF8F5] border-2 border-[#CBD5E1] rounded-2xl px-3.5 py-3">
                        <Phone size={17} color="#64748B" />
                        <TextInput
                          value={phone}
                          onChangeText={(val) => {
                            setPhone(val);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="+91 9876543210"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          className="flex-1 ml-2.5 text-base text-[#1E293B]"
                          style={{ fontFamily: 'Nunito-SemiBold' }}
                        />
                      </View>
                    </View>

                    {/* Email ID */}
                    <View className="mb-3.5">
                      <Text className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Your Email ID <Text className="text-[#D96B27]">*</Text>
                      </Text>
                      <View className="flex-row items-center bg-[#FAF8F5] border-2 border-[#CBD5E1] rounded-2xl px-3.5 py-3">
                        <Mail size={17} color="#64748B" />
                        <TextInput
                          value={email}
                          onChangeText={(val) => {
                            setEmail(val);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="priya@example.com"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          className="flex-1 ml-2.5 text-base text-[#1E293B]"
                          style={{ fontFamily: 'Nunito-SemiBold' }}
                        />
                      </View>
                    </View>

                    {/* Password */}
                    <View className="mb-5">
                      <Text className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Create Password (min 6 chars) <Text className="text-[#D96B27]">*</Text>
                      </Text>
                      <View className="flex-row items-center bg-[#FAF8F5] border-2 border-[#CBD5E1] rounded-2xl px-3.5 py-3">
                        <Lock size={17} color="#64748B" />
                        <TextInput
                          value={password}
                          onChangeText={(val) => {
                            setPassword(val);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="Enter your password"
                          placeholderTextColor="#94A3B8"
                          secureTextEntry={!showPassword}
                          className="flex-1 ml-2.5 text-base text-[#1E293B]"
                          style={{ fontFamily: 'Nunito-SemiBold' }}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                          {showPassword ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Submit Registration Button */}
                    <TouchableOpacity
                      onPress={handleFamilySignUp}
                      disabled={loading}
                      activeOpacity={0.88}
                      className="bg-[#D96B27] py-4 rounded-2xl flex-row items-center justify-center"
                      style={{
                        shadowColor: '#D96B27',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.25,
                        shadowRadius: 6,
                        elevation: 3,
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text className="text-white text-base font-bold mr-2" style={{ fontFamily: 'Nunito-Bold' }}>
                            Register & Connect to Patient
                          </Text>
                          <ArrowRight size={17} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Transparency Notice */}
                    <View className="flex-row items-start mt-4 bg-[#FFF8F3] border border-[#FAD0B6] p-3 rounded-xl">
                      <Users size={15} color="#D96B27" style={{ marginTop: 2 }} />
                      <Text className="text-[11px] text-[#9A431D] ml-2 flex-1 leading-relaxed font-semibold" style={{ fontFamily: 'Nunito-SemiBold' }}>
                        Your contact info (Name, Email & Phone) will be shared with the clinic / ASHA team so they can communicate health alerts with you.
                      </Text>
                    </View>
                  </View>
                )}

                {/* 2. FAMILY SIGN IN WITH EMAIL */}
                {familyTab === 'signin' && (
                  <View>
                    <View className="mb-3.5">
                      <Text className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Registered Family Email
                      </Text>
                      <View className="flex-row items-center bg-[#FAF8F5] border-2 border-[#CBD5E1] rounded-2xl px-3.5 py-3">
                        <Mail size={17} color="#64748B" />
                        <TextInput
                          value={email}
                          onChangeText={(val) => {
                            setEmail(val);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="family@example.com"
                          placeholderTextColor="#94A3B8"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          className="flex-1 ml-2.5 text-base text-[#1E293B]"
                          style={{ fontFamily: 'Nunito-SemiBold' }}
                        />
                      </View>
                    </View>

                    <View className="mb-5">
                      <Text className="text-xs text-[#334155] font-bold mb-1.5 ml-0.5" style={{ fontFamily: 'Nunito-Bold' }}>
                        Password
                      </Text>
                      <View className="flex-row items-center bg-[#FAF8F5] border-2 border-[#CBD5E1] rounded-2xl px-3.5 py-3">
                        <Lock size={17} color="#64748B" />
                        <TextInput
                          value={password}
                          onChangeText={(val) => {
                            setPassword(val);
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="Enter your password"
                          placeholderTextColor="#94A3B8"
                          secureTextEntry={!showPassword}
                          className="flex-1 ml-2.5 text-base text-[#1E293B]"
                          style={{ fontFamily: 'Nunito-SemiBold' }}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                          {showPassword ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={handleFamilySignIn}
                      disabled={loading}
                      activeOpacity={0.88}
                      className="bg-[#D96B27] py-4 rounded-2xl flex-row items-center justify-center"
                      style={{
                        shadowColor: '#D96B27',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.25,
                        shadowRadius: 6,
                        elevation: 3,
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text className="text-white text-base font-bold mr-2" style={{ fontFamily: 'Nunito-Bold' }}>
                            Sign In to Family Portal
                          </Text>
                          <ArrowRight size={17} color="#FFFFFF" />
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setFamilyTab('signup')}
                      className="mt-4 items-center"
                    >
                      <Text className="text-xs text-[#D96B27] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
                        Don't have a linked account yet? <Text className="underline">Sign up with Patient Code</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </ResponsiveContainer>
      </ScrollView>

      {/* Google Account Chooser Bottom Sheet (Clinical only) */}
      <GoogleAccountChooserModal
        visible={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleGoogleAccountSelected}
        loading={loading}
      />
    </KeyboardAvoidingView>
  );
}
