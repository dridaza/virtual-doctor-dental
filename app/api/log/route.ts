import { NextResponse } from 'next/server';
import { readLog } from '@/lib/audit-log';
import { getAccess } from '@/lib/require-unlock';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const access = await getAccess();
    if (!access?.admin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    const entries = await readLog();
    const text = entries
      .map((e) => `${new Date(e.t).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} | ${e.u} | ${e.a} | ${e.d}`)
      .join('\n');
    return new NextResponse(text + '\n', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="virtual-doctor.log"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo leer el log' }, { status: 502 });
  }
}
