import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const { calendarId, startTime, notes, custom } = await request.json();
    if (!calendarId || !startTime) {
      return NextResponse.json({ error: 'Elige calendario y horario' }, { status: 400 });
    }
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Horario inválido' }, { status: 400 });
    }

    const c = (await ghlFetch<{ calendar: any }>(`/calendars/${calendarId}`)).calendar;
    const minutes = Number(c.slotDuration || 60) * (c.slotDurationUnit === 'hours' ? 60 : 1);
    const end = new Date(start.getTime() + minutes * 60000);

    const res = await ghlFetch<any>('/calendars/events/appointments', {
      method: 'POST',
      body: JSON.stringify({
        calendarId,
        locationId: getLocationId(),
        contactId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        // Sin título: el nombre de la cita lo define GHL (configuración del calendario y workflows).
        appointmentStatus: 'confirmed',
        toNotify: true,
        ...(custom ? { ignoreFreeSlotValidation: true } : {}),
      }),
    });

    const texto = String(notes || '').trim();
    if (texto) {
      try {
        await ghlFetch(`/contacts/${contactId}/notes`, {
          method: 'POST',
          body: JSON.stringify({ body: `Nota de cita (${c.name}, ${start.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}): ${texto}` }),
        });
      } catch {
        /* la cita ya quedó agendada */
      }
    }

    await logEvent('cita_agendada', `paciente ${contactId}: ${c.name} ${start.toISOString()}`);
    return NextResponse.json({ ok: true, appointment: res });
  } catch (err: any) {
    const detail = err?.data?.message || err?.message || 'No se pudo agendar la cita';
    return NextResponse.json({ error: Array.isArray(detail) ? detail.join(', ') : detail }, { status: 502 });
  }
}
