import { NextResponse } from 'next/server';
import { GATE_COOKIE, signGate } from '@/lib/session';
import { rateLimited, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Verifica la contraseña compartida del "candado de acceso" y, si es correcta, deja una cookie
// firmada de larga duración - no es sesión de nadie en particular, solo dice "este dispositivo
// ya pasó el candado del equipo". El login real (correo + SMS) sigue después, sin cambios.
export async function POST(request: Request) {
  try {
    const expected = process.env.SITE_PASSWORD;
    if (!expected) return NextResponse.json({ error: 'El candado no está configurado' }, { status: 500 });

    if (rateLimited('acceso:' + clientIp(request), 20, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }

    const { password } = await request.json();
    if (String(password || '') !== expected) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    const secret = process.env.SESSION_SECRET;
    if (!secret) return NextResponse.json({ error: 'Falta configurar SESSION_SECRET' }, { status: 500 });

    const token = await signGate(secret);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(GATE_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180, // 180 días: es el candado del equipo, no una sesión personal
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo verificar' }, { status: 502 });
  }
}
