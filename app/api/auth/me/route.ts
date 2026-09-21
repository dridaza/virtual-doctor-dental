import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return NextResponse.json({ user: null });
  const payload = await verifySession(token, secret);
  return NextResponse.json({ user: payload ? { email: payload.email, nombre: payload.nombre } : null });
}
