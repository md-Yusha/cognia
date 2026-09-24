import { NextResponse } from 'next/server';
import { dbQuery } from '../../../../lib/db';

type AlertRow = {
  id: string;
  patient_id: string;
  level: string;
  reasons: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

const memory: AlertRow[] = [];

export async function GET(request: Request) {
  const since = Number(new URL(request.url).searchParams.get('since') || Date.now() - 60 * 60 * 1000);
  try {
    const { rows } = await dbQuery<AlertRow>(
      'SELECT id, patient_id, level, reasons, latitude, longitude, created_at FROM stress_alerts WHERE created_at > $1 ORDER BY created_at DESC LIMIT 20',
      [since]
    );
    if (rows.length) return NextResponse.json({ alerts: rows });
  } catch (error) {
    console.warn('alerts db read failed', error);
  }
  return NextResponse.json({
    alerts: memory.filter((row) => Number(row.created_at) > since),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const row: AlertRow = {
    id: `alt_${Date.now()}`,
    patient_id: String(body.patientId || 'patient').slice(0, 80),
    level: String(body.level || 'high').slice(0, 20),
    reasons: String(body.reasons || '').slice(0, 300),
    latitude: typeof body.latitude === 'number' ? body.latitude : null,
    longitude: typeof body.longitude === 'number' ? body.longitude : null,
    created_at: String(Date.now()),
  };
  memory.unshift(row);
  if (memory.length > 50) memory.pop();

  try {
    await dbQuery(
      'INSERT INTO stress_alerts (id, patient_id, level, reasons, latitude, longitude, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [row.id, row.patient_id, row.level, row.reasons, row.latitude, row.longitude, Number(row.created_at)]
    );
  } catch (error) {
    console.warn('alerts db write failed', error);
  }

  return NextResponse.json({ alert: row });
}
