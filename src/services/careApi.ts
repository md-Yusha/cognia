const API = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.7:3001';

export type CareMessage = {
  id: string;
  patientId: string;
  sender: 'patient' | 'caregiver';
  body: string;
  createdAt: number;
};

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!response.ok) throw new Error(`Care API ${response.status}`);
  return response.json();
}

export async function fetchMessages(patientId: string): Promise<CareMessage[]> {
  const data = await request(`/api/care/messages?patientId=${encodeURIComponent(patientId)}`);
  return data.messages || [];
}

export async function sendMessage(patientId: string, sender: 'patient' | 'caregiver', body: string) {
  const data = await request('/api/care/messages', {
    method: 'POST',
    body: JSON.stringify({ patientId, sender, body }),
  });
  return data.message as CareMessage;
}

export async function beatPresence(patientId: string, role: 'patient' | 'caregiver') {
  return request('/api/care/presence', {
    method: 'POST',
    body: JSON.stringify({ patientId, role }),
  }) as Promise<{ patientOnline: boolean; caregiverOnline: boolean }>;
}

export async function sendVoiceClip(patientId: string, role: 'patient' | 'caregiver', audioBase64: string) {
  await request('/api/care/voice', {
    method: 'POST',
    body: JSON.stringify({ patientId, role, audioBase64 }),
  });
}

export async function pollVoiceClip(patientId: string, role: 'patient' | 'caregiver') {
  return request(`/api/care/voice?patientId=${encodeURIComponent(patientId)}&role=${role}`) as Promise<{
    clip: { audioBase64: string; from: string; at: number } | null;
  }>;
}

export async function postStressAlert(payload: {
  patientId: string;
  level: string;
  reasons: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  await request('/api/care/alerts', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchStressAlerts(since: number) {
  const data = await request(`/api/care/alerts?since=${since}`);
  return (data.alerts || []) as Array<{
    id: string;
    patient_id: string;
    level: string;
    reasons: string;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
  }>;
}
