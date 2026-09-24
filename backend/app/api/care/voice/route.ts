import { NextResponse } from 'next/server';

type Clip = { from: string; audioBase64: string; mime: string; at: number };
const clips = new Map<string, Clip>();

export async function GET(request: Request) {
  const patientId = new URL(request.url).searchParams.get('patientId') || '';
  const role = new URL(request.url).searchParams.get('role') || 'patient';
  const clip = clips.get(patientId);
  if (!clip || Date.now() - clip.at > 20000 || clip.from === role) {
    return NextResponse.json({ clip: null });
  }
  return NextResponse.json({ clip });
}

export async function POST(request: Request) {
  const body = await request.json();
  const patientId = String(body.patientId || '').slice(0, 80);
  const audioBase64 = String(body.audioBase64 || '');
  if (!patientId || audioBase64.length < 20 || audioBase64.length > 1_500_000) {
    return NextResponse.json({ error: 'Voice clip missing or too large' }, { status: 400 });
  }
  clips.set(patientId, {
    from: body.role === 'caregiver' ? 'caregiver' : 'patient',
    audioBase64,
    mime: 'audio/m4a',
    at: Date.now(),
  });
  return NextResponse.json({ ok: true });
}
