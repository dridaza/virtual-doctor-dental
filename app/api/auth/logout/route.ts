import { logEvent } from '@/lib/audit-log';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, FACTURACION_COOKIE, FACTURACION_OTP_COOKIE } from '@/lib/session';

export async function POST() {
  await logEvent('logout');
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(FACTURACION_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(FACTURACION_OTP_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
