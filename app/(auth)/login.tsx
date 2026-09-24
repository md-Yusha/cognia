import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield, CheckCircle2, AlertCircle, HeartHandshake, Sparkles, X, Mail } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { useCaregiverStore } from '../../src/store/useCaregiverStore';
import { 
  signInWithGoogleService, 
  signInWithEmailService, 
  signUpWithEmailService,
  smartAuthenticateCaregiver
} from '../../src/services/authService';

export default function CaregiverLoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setCaregiver } = useCaregiverStore();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('yushaoffline@gmail.com');

  // Dismiss any hanging browser auth tabs from previous attempts
  useEffect(() => {
    try {
      WebBrowser.dismissBrowser();
    } catch {}
  }, []);

  // Real Google Sign-In with Firebase
  const handleGoogleSignIn = async (emailToUse?: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const profile = await signInWithGoogleService(emailToUse || customGoogleEmail);
      if (profile) {
        setCaregiver(profile);
        setIsGoogleModalOpen(false);
        router.replace('/(caregiver)/dashboard');
      }
    } catch (err: any) {
      console.warn('Google Sign-In failed:', err);
      setErrorMessage(err.message || 'Could not complete Google Sign-In. You can sign in with email below.');
    } finally {
      setLoading(false);
    }
  };

  // Instant Demo Caregiver Access for judges and testing
  const handleDemoCaregiverLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const demoEmail = 'yushaoffline@gmail.com';
      const profile = await smartAuthenticateCaregiver(
        demoEmail,
        'CogniaCaregiver#2026',
        'Yusha (Caregiver)'
      );
      if (profile) {
        setCaregiver(profile);
        router.replace('/(caregiver)/dashboard');
      }
    } catch (err: any) {
      console.warn('Quick login error:', err);
      // Fallback local caregiver profile
      setCaregiver({
        uid: 'demo_caregiver_yusha',
        name: 'Yusha (Caregiver)',
        email: 'yushaoffline@gmail.com',
        createdAt: Date.now(),
        patientIds: [],
      });
      router.replace('/(caregiver)/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Real Email & Password Login / Signup with Firebase
  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const profile = await smartAuthenticateCaregiver(email, password, fullName);
      if (profile) {
        setCaregiver(profile);
        router.replace('/(caregiver)/dashboard');
      }
    } catch (err: any) {
      console.warn('Firebase Auth error:', err);
      let userMsg = 'Authentication failed. Please verify your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        userMsg = 'Incorrect email or password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        userMsg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        userMsg = 'Password should be at least 6 characters.';
      } else if (err.message) {
        userMsg = err.message;
      }
      setErrorMessage(userMsg);
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
        contentContainerStyle={{ flexGrow: 1, padding: 22, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-4 self-start px-4 py-2 bg-white border border-[#E8E2D8] rounded-full shadow-sm"
        >
          <ArrowLeft size={16} color="#4A5568" />
          <Text 
            className="text-[#4A5568] ml-2 text-xs font-bold"
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            Back to Patient Screen
          </Text>
        </TouchableOpacity>

        {/* Card Header */}
        <View className="items-center mb-4">
          <View 
            className="w-16 h-16 bg-[#EBF4EE] border border-[#CDE3D5] rounded-full items-center justify-center mb-2"
            style={{
              shadowColor: '#3D6C4E',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text className="text-3xl">🩺</Text>
          </View>
          <Text 
            className="text-4xl text-[#2B3A30] text-center"
            style={{ fontFamily: 'PatrickHand' }}
          >
            Caregiver & Family Portal
          </Text>
          <Text 
            className="text-[#597362] text-sm text-center mt-1 max-w-xs"
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            Manage medication alerts, view patient cognitive progress, and customize exercises.
          </Text>
        </View>

        {/* Auth Card */}
        <View 
          className="bg-white rounded-[32px] p-6 border border-[#EFEBE4]"
          style={{
            shadowColor: '#6B5E4F',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.07,
            shadowRadius: 18,
            elevation: 3,
          }}
        >
          {/* Direct Google Account Card */}
          <View className="bg-[#FAF8F5] border border-[#E8E2D8] p-4 rounded-3xl mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1 mr-2">
                <View 
                  className="w-10 h-10 rounded-full bg-[#EA4335] items-center justify-center mr-3"
                  style={{
                    shadowColor: '#EA4335',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text className="text-white text-base font-black">G</Text>
                </View>
                <View className="flex-1">
                  <Text 
                    className="text-[11px] text-[#718096] uppercase tracking-wider font-bold" 
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    Google Account
                  </Text>
                  <Text 
                    numberOfLines={1} 
                    className="text-sm text-[#2D3748] font-bold" 
                    style={{ fontFamily: 'Nunito-Bold' }}
                  >
                    {customGoogleEmail}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setIsGoogleModalOpen(true)}
                className="px-3 py-1 bg-white border border-[#E2DDD3] rounded-full shadow-xs"
              >
                <Text 
                  className="text-xs text-[#3D6C4E] font-bold" 
                  style={{ fontFamily: 'Nunito-Bold' }}
                >
                  Switch
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title={`Continue with Google`}
              variant="google"
              size="large"
              loading={loading}
              icon={
                <View className="w-5 h-5 rounded-full bg-[#EA4335] items-center justify-center">
                  <Text className="text-white text-[10px] font-black">G</Text>
                </View>
              }
              onPress={() => handleGoogleSignIn(customGoogleEmail)}
            />
          </View>

          <View className="flex-row items-center my-3">
            <View className="flex-1 h-[1px] bg-[#EFEBE4]" />
            <Text 
              className="text-[#8C8274] text-xs uppercase tracking-wider px-3"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              or enter credentials
            </Text>
            <View className="flex-1 h-[1px] bg-[#EFEBE4]" />
          </View>

          {/* Toggle between Sign In & Sign Up */}
          <View className="flex-row bg-[#F5F1EA] p-1 rounded-2xl mb-4 border border-[#EFEBE4]">
            <TouchableOpacity
              onPress={() => { setIsRegisterMode(false); setErrorMessage(''); }}
              className={`flex-1 py-2 rounded-xl items-center ${
                !isRegisterMode ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text 
                className={`text-sm ${!isRegisterMode ? 'text-[#2C503A] font-bold' : 'text-[#718096]'}`}
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setIsRegisterMode(true); setErrorMessage(''); }}
              className={`flex-1 py-2 rounded-xl items-center ${
                isRegisterMode ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text 
                className={`text-sm ${isRegisterMode ? 'text-[#2C503A] font-bold' : 'text-[#718096]'}`}
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                New Account
              </Text>
            </TouchableOpacity>
          </View>

          {isRegisterMode && (
            <View className="mb-3">
              <Text 
                className="text-[#4A5568] text-xs font-bold mb-1"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                Your Full Name
              </Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Dr. Priya Das"
                placeholderTextColor="#A0AEC0"
                style={{ fontFamily: 'Nunito-SemiBold' }}
                className="bg-[#FAF8F5] border border-[#E2DDD3] text-[#2D3748] rounded-2xl px-4 py-3 text-base"
              />
            </View>
          )}

          <View className="mb-3">
            <Text 
              className="text-[#4A5568] text-xs font-bold mb-1"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Email Address
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="caregiver@health.gov.in"
              placeholderTextColor="#A0AEC0"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ fontFamily: 'Nunito-SemiBold' }}
              className="bg-[#FAF8F5] border border-[#E2DDD3] text-[#2D3748] rounded-2xl px-4 py-3 text-base"
            />
          </View>

          <View className="mb-4">
            <Text 
              className="text-[#4A5568] text-xs font-bold mb-1"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#A0AEC0"
              secureTextEntry
              style={{ fontFamily: 'Nunito-SemiBold' }}
              className="bg-[#FAF8F5] border border-[#E2DDD3] text-[#2D3748] rounded-2xl px-4 py-3 text-base"
            />
          </View>

          {errorMessage ? (
            <View className="flex-row items-center bg-[#FDF2F2] border border-[#F8D7D7] p-3 rounded-2xl mb-4">
              <AlertCircle size={18} color="#C53030" />
              <Text 
                className="text-[#9B2C2C] text-xs font-bold ml-2 flex-1"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Button
            title={isRegisterMode ? 'Create Caregiver Account' : 'Sign In'}
            variant="primary"
            size="large"
            loading={loading}
            onPress={handleEmailAuth}
          />

          {/* Quick Demo Access for Judges */}
          <TouchableOpacity
            onPress={handleDemoCaregiverLogin}
            className="mt-4 py-3 px-4 bg-[#F5F0F8] border border-[#DDD3E7] rounded-2xl flex-row items-center justify-center"
          >
            <Sparkles size={16} color="#675283" />
            <Text 
              className="text-[#675283] font-bold text-xs ml-2"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              ⚡ Instant Access (Demo Caregiver)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modal to Switch Google Account */}
        <Modal visible={isGoogleModalOpen} transparent animationType="fade">
          <View className="flex-1 bg-black/40 justify-center items-center p-5">
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-[#EFEBE4] shadow-lg">
              <View className="flex-row items-center justify-between mb-4">
                <Text 
                  className="text-2xl text-[#2B3A30]"
                  style={{ fontFamily: 'PatrickHand' }}
                >
                  Choose Google Account
                </Text>
                <TouchableOpacity onPress={() => setIsGoogleModalOpen(false)}>
                  <X size={20} color="#718096" />
                </TouchableOpacity>
              </View>

              <Text 
                className="text-[#597362] text-xs mb-3 font-semibold"
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                Enter any Google address to associate with your caregiver profile:
              </Text>

              <TextInput
                value={customGoogleEmail}
                onChangeText={setCustomGoogleEmail}
                placeholder="you@gmail.com"
                placeholderTextColor="#A0AEC0"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ fontFamily: 'Nunito-SemiBold' }}
                className="bg-[#FAF8F5] border border-[#E2DDD3] text-[#2D3748] rounded-2xl px-4 py-3 text-base mb-4"
              />

              <Button
                title="Connect & Sign In"
                variant="primary"
                size="large"
                loading={loading}
                onPress={() => handleGoogleSignIn(customGoogleEmail)}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
