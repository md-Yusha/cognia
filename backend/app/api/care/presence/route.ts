import { NextResponse } from 'next/server';

type Presence = { patientOnline: number; caregiverOnline: number };
const rooms = new Map<string, Presence>();

function room(patientId: string) {
  const current = rooms.get(patientId) || { patientOnline: 0, caregiverOnline: 0 };
  rooms.set(patientId, current);
  return current;
}

export async function GET(request: Request) {
  const patientId = new URL(request.url).searchParams.get('patientId') || '';
  const current = rooms.get(patientId);
  const now = Date.now();
  return NextResponse.json({
    patientOnline: !!current && now - current.patientOnline < 20000,
    caregiverOnline: !!current && now - current.caregiverOnline < 20000,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const patientId = String(body.patientId || '').slice(0, 80);
  if (!patientId) return NextResponse.json({ error: 'Missing patient' }, { status: 400 });
  const current = room(patientId);
  const now = Date.now();
  if (body.role === 'caregiver') current.caregiverOnline = now;
  else current.patientOnline = now;
  return NextResponse.json({
    patientOnline: now - current.patientOnline < 20000,
    caregiverOnline: now - current.caregiverOnline < 20000,
  });
}
