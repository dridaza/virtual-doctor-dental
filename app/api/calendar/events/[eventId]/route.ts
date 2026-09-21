import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

const STATUSES = ['new', 'confirmed', 'cancelled', 'showed', 'noshow', 'invalid'];

// Mueve una cita a otro horario y/o cambia su estado. No toca el título: lo define GHL.
export async function PUT(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  try {
    const { startTime, appointmentStatus, custom } = await request.json();
    const current = (await ghlFetch<{ event?: any; appointment?: any }>(`/calendars/events/appointments/${eventId}`));
    const ev = current.event || current.appointment || current;
    if (!ev?.id) return NextResponse.json({ error: 'La cita no existe' }, { status: 404 });

    const body: Record<string, unknown> = {};
    if (startTime) {
      const start = new Date(startTime);
      if (Number.isNaN(start.getTime())) return NextResponse.json({ error: 'Horario inválido' }, { status: 400 });
      const duration = Math.max(new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime(), 15 * 60000);
      body.startTime = start.toISOString();
      body.endTime = new Date(start.getTime() + duration).toISOString();
      body.toNotify = true;
      if (custom) body.ignoreFreeSlotValidation = true;
    }
    if (appointmentStatus) {
      if (!STATUSES.includes(appointmentStatus)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      body.appointmentStatus = appointmentStatus;
    }
    if (!Object.keys(body).length) return NextResponse.json({ error: 'Nada que cambiar' }, { status: 400 });

    const res = await ghlFetch<any>(`/calendars/events/appointments/${eventId}`, { method: 'PUT', body: JSON.stringify(body) });
    await logEvent('cita_editada', `cita ${eventId}: ${Object.keys(body).filter((k) => k !== 'toNotify').join(', ')}`);
    return NextResponse.json({ ok: true, appointment: res });
  } catch (err: any) {
    const detail = err?.data?.message || err?.message || 'No se pudo actualizar la cita';
    return NextResponse.json({ error: Array.isArray(detail) ? detail.join(', ') : detail }, { status: 502 });
  }
}
