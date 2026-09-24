import React, { useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { usePatientStore } from '../store/usePatientStore';
import { postStressAlert } from '../services/careApi';
import { recordScreenTouch, reassuranceLine, startStressWatch, StressReading } from '../services/stressMonitor';
import { speakPrompt } from '../services/ttsService';

export function StressHost({ children }: { children: React.ReactNode }) {
  const patient = usePatientStore((state) => state.patient);
  const [reading, setReading] = useState<StressReading | null>(null);

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

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        recordScreenTouch();
        return false;
      }}
    >
      {children}
      <Modal visible={!!reading} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(43,58,48,0.55)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#F4EFE6', borderRadius: 32, padding: 28 }}>
            <Text style={{ fontFamily: 'PatrickHand', fontSize: 40, color: '#2C503A', textAlign: 'center' }}>You are safe</Text>
            <Text style={{ fontFamily: 'Nunito-SemiBold', fontSize: 24, color: '#2B3A30', textAlign: 'center', marginTop: 12, lineHeight: 34 }}>
              {reassuranceLine()}
            </Text>
            <Text
              onPress={() => setReading(null)}
              style={{ marginTop: 22, textAlign: 'center', backgroundColor: '#3D6C4E', color: 'white', overflow: 'hidden', borderRadius: 999, paddingVertical: 16, fontFamily: 'Nunito-Bold', fontSize: 20 }}
            >
              I am okay
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
