import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await ghlFetch<{ calendars: any[] }>(`/calendars/?locationId=${getLocationId()}`);
    const calendars = (data.calendars || [])
      .filter((c) => c.isActive !== false)
      .map((c) => ({ id: c.id, name: c.name, duracionMin: Number(c.slotDuration || 60) * (c.slotDurationUnit === 'hours' ? 60 : 1) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return NextResponse.json({ calendars });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar los calendarios' }, { status: 502 });
  }
}
