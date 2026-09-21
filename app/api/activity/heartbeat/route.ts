import { NextResponse } from 'next/server';
import { currentUserEmail } from '@/lib/audit-log';
import { addHeartbeat } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function POST() {
  const email = await currentUserEmail();
  if (email === '-') return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
  try {
    await addHeartbeat(email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
