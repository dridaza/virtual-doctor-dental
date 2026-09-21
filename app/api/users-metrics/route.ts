import { NextResponse } from 'next/server';
import { currentUserEmail, readLog } from '@/lib/audit-log';
import { findGhlUserByEmail, listGhlUsers } from '@/lib/users-store';
import { getActivity, mexicoDay } from '@/lib/activity';
import { ghlFetch, getLocationId } from '@/lib/ghl';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Msg = {
  id: string;
  direction: 'inbound' | 'outbound';
  source?: string;
  userId?: string;
  conversationId: string;
  dateAdded: string;
};

async function fetchMessages(days: number): Promise<Msg[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const all: Msg[] = [];
  let cursor = '';
  for (let page = 0; page < 12; page++) {
    const qs = new URLSearchParams({
      locationId: getLocationId(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: '500',
      ...(cursor ? { cursor } : {}),
    });
    const d = await ghlFetch<{ messages: Msg[]; nextCursor?: string }>(`/conversations/messages/export?${qs}`);
    all.push(...(d.messages || []));
    cursor = d.nextCursor || '';
    if (!cursor) break;
  }
  return all;
}

// Tiempo de primera respuesta: desde el mensaje del paciente hasta la
// siguiente respuesta humana (no automatizada) en esa misma conversación.
function responseTimes(messages: Msg[]): Map<string, number[]> {
  const byConv = new Map<string, Msg[]>();
  for (const m of messages) {
    if (!byConv.has(m.conversationId)) byConv.set(m.conversationId, []);
    byConv.get(m.conversationId)!.push(m);
  }
  const out = new Map<string, number[]>();
  for (const list of byConv.values()) {
    list.sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
    let pending: number | null = null;
    for (const m of list) {
      const t = new Date(m.dateAdded).getTime();
      if (m.direction === 'inbound') {
        if (pending === null) pending = t;
      } else if (m.source !== 'workflow' && m.userId && pending !== null) {
        const arr = out.get(m.userId) || [];
        arr.push((t - pending) / 60000);
        out.set(m.userId, arr);
        pending = null;
      }
    }
  }
  return out;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

export async function GET(request: Request) {
  try {
    const email = await currentUserEmail();
    if (email === '-') return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
    const me = await findGhlUserByEmail(email);
    if (me.rol === 'Usuario') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

    const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get('days') || 7), 1), 30);
    const [users, messages, log] = await Promise.all([listGhlUsers(), fetchMessages(days), readLog()]);
    const responses = responseTimes(messages);

    const since = new Date(Date.now() - days * 86400000);
    const dayKeys: string[] = [];
    for (let i = days - 1; i >= 0; i--) dayKeys.push(mexicoDay(new Date(Date.now() - i * 86400000)));

    const result = await Promise.all(
      users.map(async (u) => {
        const activity = await getActivity(u.email);
        const online = dayKeys.map((d) => ({ dia: d, min: activity.days[d]?.min || 0 }));
        const mine = messages.filter((m) => m.direction === 'outbound' && m.userId === u.id);
        const manual = mine.filter((m) => m.source === 'app').length;
        const viaApi = mine.filter((m) => m.source === 'api').length;
        const automated = mine.filter((m) => m.source === 'workflow').length;
        const conversations = new Set(mine.filter((m) => m.source !== 'workflow').map((m) => m.conversationId)).size;

        const acciones: Record<string, number> = {};
        let ultimoAcceso: string | null = null;
        for (const e of log) {
          if (e.u.toLowerCase() !== u.email.toLowerCase()) continue;
          if (e.a === 'login') ultimoAcceso = e.t;
          if (new Date(e.t) < since) continue;
          acciones[e.a] = (acciones[e.a] || 0) + 1;
        }

        const totalMin = online.reduce((s, d) => s + d.min, 0);
        return {
          id: u.id,
          email: u.email,
          nombre: u.nombre,
          rol: u.rol,
          enLinea: activity.lastBeat ? Date.now() - new Date(activity.lastBeat).getTime() < 5 * 60000 : false,
          ultimaActividad: activity.lastBeat || null,
          ultimoAcceso,
          minutosEnLinea: totalMin,
          minutosHoy: activity.days[mexicoDay(new Date())]?.min || 0,
          diasActivos: online.filter((d) => d.min > 0).length,
          enLineaPorDia: online,
          mensajes: { manual, viaApi, automatizados: automated, conversaciones: conversations },
          respuestaMedianaMin: median(responses.get(u.id) || []),
          respuestasMedidas: (responses.get(u.id) || []).length,
          acciones,
        };
      })
    );

    return NextResponse.json({ days, users: result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron calcular las métricas' }, { status: 502 });
  }
}
