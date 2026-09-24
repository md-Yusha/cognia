import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { CareChat } from '../../../src/components/CareChat';
import { useCaregiverStore } from '../../../src/store/useCaregiverStore';

export default function CaregiverChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patients = useCaregiverStore((state) => state.patients);
  const patient = patients.find((item) => item.id === id) || patients[0];
  return <CareChat patientId={patient?.id || id || 'local_family'} role="caregiver" title={patient?.name || 'Patient chat'} />;
}
