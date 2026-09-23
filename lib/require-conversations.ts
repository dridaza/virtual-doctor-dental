import { NextResponse } from 'next/server';
import { currentUserEmail } from './audit-log';
import { findGhlUserByEmail, hasConversationsAccess } from './users-store';

// Se llama al principio de cada ruta que lee o manda mensajes a pacientes (SMS, WhatsApp, correo,
// recibos, recetas...). Devuelve null si puede seguir, o la respuesta 403 ya lista si GHL le quitó
// el permiso de Conversations a este usuario.
export async function blockIfNoConversationsAccess(): Promise<NextResponse | null> {
  const email = await currentUserEmail();
  if (email === '-') return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
  const me = await findGhlUserByEmail(email);
  if (!(await hasConversationsAccess(email, me.rol))) {
    return NextResponse.json({ error: 'Tu usuario no tiene permiso de Conversaciones en GoHighLevel' }, { status: 403 });
  }
  return null;
}
