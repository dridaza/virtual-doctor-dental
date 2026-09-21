import { NextResponse } from 'next/server';
import { currentUserEmail, logEvent } from '@/lib/audit-log';
import { findGhlUserByEmail, getStoredUsers, saveStoredUsers } from '@/lib/users-store';

export const dynamic = 'force-dynamic';

// Borra la contraseña guardada de un usuario: en su próximo inicio de sesión
// tendrá que registrar una nueva confirmándola con un código por SMS.
export async function POST(request: Request) {
  try {
    const admin = await currentUserEmail();
    if (admin === '-') return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
    const me = await findGhlUserByEmail(admin);
    if (me.rol === 'Usuario') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

    const { email } = await request.json();
    const target = String(email || '').trim().toLowerCase();
    if (!target) return NextResponse.json({ error: 'Falta el usuario' }, { status: 400 });

    const users = await getStoredUsers();
    const next = users.filter((u) => u.email !== target);
    if (next.length === users.length) {
      return NextResponse.json({ ok: true, message: 'Ese usuario aún no había registrado contraseña.' });
    }
    await saveStoredUsers(next);
    await logEvent('password_reseteada', target, admin);
    return NextResponse.json({ ok: true, message: 'Contraseña restablecida. Al entrar de nuevo tendrá que registrar una nueva con un código por SMS.' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo restablecer' }, { status: 502 });
  }
}
