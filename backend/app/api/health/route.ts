import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'Cognia MDoNER AI Backend',
    timestamp: Date.now(),
    version: '1.0.0'
  });
}
