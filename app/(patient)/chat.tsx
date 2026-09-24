import React from 'react';
import { CareChat } from '../../src/components/CareChat';
import { usePatientStore } from '../../src/store/usePatientStore';

export default function PatientChatScreen() {
  const patient = usePatientStore((state) => state.patient);
  return <CareChat patientId={patient?.id || 'local_family'} role="patient" title="Family chat" />;
}
