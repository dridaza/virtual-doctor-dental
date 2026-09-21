import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// La app corre en un servidor (UTC en Vercel) pero la clínica opera en esta
// zona horaria: todo el cálculo de "qué día es hoy"/"qué semana es esta" se
// hace explícitamente en esta zona para no depender de en qué huso horario
// esté físicamente el servidor o el navegador del que abre el dashboard.
const TIMEZONE = 'America/Mexico_City';

function ymdString(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

// Instante UTC que corresponde a las 00:00 hora local de `timeZone` en la
// fecha YYYY-MM-DD dada.
function localMidnightUtc(ymd: string, timeZone: string): Date {
  const guess = new Date(`${ymd}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(guess);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value === '24' ? '00' : p.value;
  const asIfUtc = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour), Number(map.minute), Number(map.second)
  );
  const offsetMs = asIfUtc - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}

// Día de la semana (lunes=0 .. domingo=6) de una fecha YYYY-MM-DD. Es
// independiente de cualquier zona horaria porque la fecha ya viene fija.
function mondayIndex(ymd: string): number {
  const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay(); // domingo=0..sábado=6
  return dow === 0 ? 6 : dow - 1;
}

async function fetchEventsFor(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const data = await ghlFetch<{ events: any[] }>(`/calendars/events?${qs}`);
  return data.events || [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offsetWeeks = Number(searchParams.get('offset') || 0);

  try {
    const todayYmd = ymdString(new Date(), TIMEZONE);
    const todayAnchor = new Date(`${todayYmd}T12:00:00Z`);
    const mondayAnchor = new Date(todayAnchor);
    mondayAnchor.setUTCDate(todayAnchor.getUTCDate() - mondayIndex(todayYmd) + offsetWeeks * 7);

    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayAnchor);
      d.setUTCDate(mondayAnchor.getUTCDate() + i);
      days.push(ymdString(d, 'UTC'));
    }

    const weekStartUtc = localMidnightUtc(days[0], TIMEZONE);
    const weekEndUtc = localMidnightUtc(days[6], TIMEZONE);
    weekEndUtc.setUTCDate(weekEndUtc.getUTCDate() + 1);

    const calendarsData = await ghlFetch<{ calendars: any[] }>(
      `/calendars/?locationId=${getLocationId()}`
    );
    const calendars = calendarsData.calendars || [];
    const groupIds = Array.from(new Set(calendars.map((c) => c.groupId).filter(Boolean)));
    const soloCalendarIds = calendars.filter((c) => !c.groupId).map((c) => c.id);

    const base = {
      locationId: getLocationId(),
      startTime: String(weekStartUtc.getTime()),
      endTime: String(weekEndUtc.getTime()),
    };

    const results = await Promise.allSettled([
      ...groupIds.map((groupId) => fetchEventsFor({ ...base, groupId })),
      ...soloCalendarIds.map((calendarId) => fetchEventsFor({ ...base, calendarId })),
    ]);

    // Cada calendario de GHL tiene su color; las citas se pintan con el de su calendario.
    const colorByCalendar = new Map<string, string>(calendars.map((c) => [c.id, /^#[0-9a-f]{6}$/i.test(c.eventColor || '') ? c.eventColor : '']));
    const seen = new Set<string>();
    const events: any[] = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const e of r.value) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        events.push({
          id: e.id,
          title: e.title,
          contactId: e.contactId,
          startTime: e.startTime,
          endTime: e.endTime,
          status: e.appointmentStatus,
          color: colorByCalendar.get(e.calendarId) || '',
          dateKey: ymdString(new Date(e.startTime), TIMEZONE),
        });
      }
    }
    events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return NextResponse.json({
      days,
      timezone: TIMEZONE,
      weekStart: weekStartUtc.toISOString(),
      weekEnd: weekEndUtc.toISOString(),
      events,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo cargar el calendario' }, { status: 502 });
  }
}
