import React, { useEffect, useState } from 'react';
import { Modal, Text, View, TouchableOpacity, Vibration } from 'react-native';
import { usePatientStore } from '../store/usePatientStore';
import { postStressAlert } from '../services/careApi';
import { recordScreenTouch, reassuranceLine, startStressWatch, StressReading } from '../services/stressMonitor';
import { speakPrompt } from '../services/ttsService';
import { Heart, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export function StressHost({ children }: { children?: React.ReactNode }) {
  const patient = usePatientStore((state) => state.patient);
  const [reading, setReading] = useState<StressReading | null>(null);

  useEffect(() => {
    if (!reading) {
      Vibration.cancel();
      return;
    }
    Vibration.vibrate([0, 600, 200, 600, 200, 900], true);
    return () => {
      Vibration.cancel();
    };
  }, [reading]);

  useEffect(() => {
    if (!patient) return;
    return startStressWatch(async (next) => {
      if (next.level !== 'high') return;
      setReading(next);
      const line = reassuranceLine();
      speakPrompt(line, (patient.preferredLanguage || 'en') as any);
      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const Location = await import('expo-location');
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        }
      } catch {}
      try {
        await postStressAlert({
          patientId: patient.id,
          level: next.level,
          reasons: next.reasons.join(', '),
          latitude,
          longitude,
        });
      } catch {}
    });
  }, [patient]);

  const handleDismiss = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setReading(null);
  };

  if (!patient || !reading) {
    return children ? <>{children}</> : null;
  }

  return (
    <>
      {children}
      <Modal visible={!!reading} transparent animationType="fade">
        <View className="flex-1 justify-center items-center p-6" style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}>
          <View 
            className="w-full max-w-sm bg-[#FAF8F5] rounded-[32px] p-7 items-center border-2 border-[#CCEAD7]"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 20,
              elevation: 6,
            }}
          >
            <View className="w-18 h-18 bg-[#EAF7EE] border-2 border-[#BDE5CB] rounded-3xl items-center justify-center mb-3">
              <Text className="text-4xl">💚</Text>
            </View>

            <Text 
              className="text-3xl text-[#143825] font-bold text-center"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              You are safe
            </Text>

            <Text 
              className="text-xl text-[#334155] text-center mt-2 mb-6 font-semibold leading-relaxed"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              {reassuranceLine()}
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleDismiss}
              className="w-full bg-[#16704A] py-4 rounded-2xl items-center justify-center min-h-[56px]"
              style={{
                shadowColor: '#16704A',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text 
                className="text-white text-xl font-bold"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                I am okay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
