import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { getUserProfile } from '@/lib/user-profiles';
import { postChat, readChat } from '@/lib/team-chat';
import { rateLimited } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  return token && secret ? await verifySession(token, secret) : null;
}

export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    return NextResponse.json({ me: s.email, messages: await readChat() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo cargar el chat' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    if (rateLimited('chat:' + s.email, 30, 60_000)) return NextResponse.json({ error: 'Demasiados mensajes, espera un momento' }, { status: 429 });
    const b = await request.json();
    const texto = String(b.texto || '').trim().slice(0, 1000);
    if (!texto) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
    const profile = await getUserProfile(s.email).catch(() => null);
    const nombre = profile?.nombre || s.nombre || s.email.split('@')[0];
    return NextResponse.json({ me: s.email, messages: await postChat({ email: s.email, nombre, texto }) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo enviar' }, { status: 502 });
  }
}
