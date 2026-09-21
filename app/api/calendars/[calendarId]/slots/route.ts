import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghl';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ calendarId: string }> }) {
  const { calendarId } = await params;
  try {
    const days = Math.min(Number(new URL(request.url).searchParams.get('days') || 14), 31);
    const start = Date.now();
    const end = start + days * 86400000;
    const data = await ghlFetch<Record<string, { slots?: string[] }>>(
      `/calendars/${calendarId}/free-slots?startDate=${start}&endDate=${end}&timezone=America/Mexico_City`
    );
    const dias = Object.entries(data)
      .filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && v?.slots?.length)
      .map(([fecha, v]) => ({ fecha, slots: v.slots as string[] }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    return NextResponse.json({ dias });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar los horarios' }, { status: 502 });
  }
}
