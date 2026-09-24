import { NextResponse } from 'next/server';
import { dbQuery } from '../../../../lib/db';

type MessageRow = {
  id: string;
  patient_id: string;
  sender: string;
  body: string;
  created_at: string;
};

const memory: MessageRow[] = [];

export async function GET(request: Request) {
  const patientId = new URL(request.url).searchParams.get('patientId') || '';
  if (!patientId) return NextResponse.json({ messages: [] });

  try {
    const { rows } = await dbQuery<MessageRow>(
      'SELECT id, patient_id, sender, body, created_at FROM care_messages WHERE patient_id = $1 ORDER BY created_at ASC LIMIT 100',
      [patientId]
    );
    if (rows.length) {
      return NextResponse.json({
        messages: rows.map((row) => ({
          id: row.id,
          patientId: row.patient_id,
          sender: row.sender,
          body: row.body,
          createdAt: Number(row.created_at),
        })),
      });
    }
  } catch (error) {
    console.warn('messages db read failed', error);
  }

  return NextResponse.json({
    messages: memory
      .filter((row) => row.patient_id === patientId)
      .map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        sender: row.sender,
        body: row.body,
        createdAt: Number(row.created_at),
      })),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const patientId = String(body.patientId || '').slice(0, 80);
  const sender = body.sender === 'caregiver' ? 'caregiver' : 'patient';
  const text = String(body.body || '').trim().slice(0, 500);
  if (!patientId || !text) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }

  const row: MessageRow = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    patient_id: patientId,
    sender,
    body: text,
    created_at: String(Date.now()),
  };
  memory.push(row);
  if (memory.length > 400) memory.splice(0, memory.length - 400);

  try {
    await dbQuery(
      'INSERT INTO care_messages (id, patient_id, sender, body, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
      [row.id, row.patient_id, row.sender, row.body, Number(row.created_at)]
    );
  } catch (error) {
    console.warn('messages db write failed', error);
  }

  return NextResponse.json({
    message: {
      id: row.id,
      patientId: row.patient_id,
      sender: row.sender,
      body: row.body,
      createdAt: Number(row.created_at),
    },
  });
}
