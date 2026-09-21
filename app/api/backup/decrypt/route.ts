import { NextResponse } from 'next/server';
import { getAccess } from '@/lib/require-unlock';
import { decryptBuffer } from '@/lib/backup-crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const access = await getAccess();
    if (!access?.unlocked) return NextResponse.json({ error: 'Se requiere la verificación de seguridad' }, { status: 403 });
    const form = await request.formData();
    const password = String(form.get('password') || '');
    const file = form.get('file') as File | null;

    if (!password || !file) {
      return NextResponse.json({ error: 'Falta el archivo o la contraseña' }, { status: 400 });
    }

    const blob = Buffer.from(await file.arrayBuffer());
    let json: Buffer;
    try {
      json = decryptBuffer(blob, password);
    } catch {
      return NextResponse.json({ error: 'Contraseña incorrecta o archivo corrupto' }, { status: 401 });
    }

    const data = JSON.parse(json.toString('utf8'));
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo leer el backup' }, { status: 502 });
  }
}
