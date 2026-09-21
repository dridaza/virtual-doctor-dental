import { cookies } from 'next/headers';
import { FACTURACION_COOKIE, SESSION_COOKIE, verifyFacturacionUnlock, verifySession } from './session';
import { findGhlUserByEmail } from './users-store';

export type Access = { email: string; admin: boolean; unlocked: boolean } | null;

// Quién está haciendo la petición: administradores/dueños pasan directo; los
// usuarios normales necesitan haber pasado la verificación de dos pasos.
export async function getAccess(): Promise<Access> {
  const store = await cookies();
  const secret = process.env.SESSION_SECRET;
  const token = store.get(SESSION_COOKIE)?.value;
  const session = token && secret ? await verifySession(token, secret) : null;
  if (!session) return null;
  const me = await findGhlUserByEmail(session.email);
  const admin = me.ok && me.rol !== 'Usuario';
  const fact = store.get(FACTURACION_COOKIE)?.value;
  const unlocked = admin || !!(fact && secret && (await verifyFacturacionUnlock(fact, secret)));
  return { email: session.email, admin, unlocked };
}
