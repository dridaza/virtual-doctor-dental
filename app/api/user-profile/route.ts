import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { getUserProfile, saveUserProfile } from '@/lib/user-profiles';
import { uploadProfileFile } from '@/lib/media-upload';
import { logEvent } from '@/lib/audit-log';
import { findGhlUserByEmail } from '@/lib/users-store';

export const dynamic = 'force-dynamic';

async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  return token && secret ? await verifySession(token, secret) : null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    const [saved, ghl] = await Promise.all([getUserProfile(session.email), findGhlUserByEmail(session.email)]);
    return NextResponse.json({
      rol: ghl.rol,
      email: session.email,
      nombre: saved?.nombre || session.nombre || '',
      fotoUrl: saved?.fotoUrl || '',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo cargar el perfil' }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Sesión expirada' }, { status: 401 });
    const body = await request.json();
    const current = (await getUserProfile(session.email)) || { nombre: session.nombre || '', fotoUrl: '' };

    const nombre = typeof body.nombre === 'string' ? body.nombre.trim().slice(0, 80) : current.nombre;
    let fotoUrl = current.fotoUrl;

    if (typeof body.fotoDataUrl === 'string' && body.fotoDataUrl) {
      const m = /^data:([^;]+);base64,(.+)$/.exec(body.fotoDataUrl);
      if (!m) return NextResponse.json({ error: 'Imagen no válida' }, { status: 400 });
      const ext = m[1].split('/')[1] || 'jpg';
      const blob = new Blob([new Uint8Array(Buffer.from(m[2], 'base64'))], { type: m[1] });
      fotoUrl = await uploadProfileFile(blob, `usuario-${session.email.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.${ext}`);
    } else if (body.fotoDataUrl === null) {
      fotoUrl = '';
    }

    await saveUserProfile(session.email, { nombre, fotoUrl });
    await logEvent('perfil_usuario_actualizado', '', session.email);
    const ghl = await findGhlUserByEmail(session.email);
    return NextResponse.json({ email: session.email, nombre, fotoUrl, rol: ghl.rol });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo guardar el perfil' }, { status: 502 });
  }
}
