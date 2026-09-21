import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';
import { signFormToken } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function send(type: 'WhatsApp' | 'SMS', contactId: string, message: string) {
  const res = await ghlFetch<{ messageId: string }>('/conversations/messages', {
    method: 'POST',
    body: JSON.stringify({ type, contactId, message }),
  });
  await new Promise((r) => setTimeout(r, 1800));
  try {
    const m = await ghlFetch<any>(`/conversations/messages/${res.messageId}`);
    const status = m?.status ?? m?.message?.status;
    if (status === 'failed' || status === 'undelivered') return false;
  } catch {
    /* si no se puede leer el estado se asume enviado */
  }
  return true;
}

// Envía al paciente el enlace de su formulario: WhatsApp primero y, si GHL
// lo rechaza (p. ej. suscripción de WhatsApp inactiva), por SMS.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const data = await ghlFetch<{ contact: any }>(`/contacts/${contactId}`);
    const c = data.contact;
    if (!c.phone) {
      return NextResponse.json({ error: 'El paciente no tiene teléfono registrado' }, { status: 400 });
    }
    const nombre = c.firstName || c.name || '';
    const secret = process.env.SESSION_SECRET;
    if (!secret) return NextResponse.json({ error: 'Falta configurar SESSION_SECRET' }, { status: 500 });
    const link = `${new URL(request.url).origin}/formulario/${contactId}?t=${encodeURIComponent(await signFormToken(contactId, secret))}`;
    const message = `Bienvenida ${nombre}, por favor llena esta hoja: ${link} Te esperamos!`;

    let canal: 'WhatsApp' | 'SMS' = 'WhatsApp';
    let ok = false;
    try {
      ok = await send('WhatsApp', contactId, message);
    } catch {
      ok = false;
    }
    if (!ok) {
      canal = 'SMS';
      ok = await send('SMS', contactId, message);
    }
    if (!ok) return NextResponse.json({ error: 'No se pudo enviar el mensaje' }, { status: 502 });

    await logEvent('formulario_enviado', `paciente ${contactId} por ${canal}`);
    return NextResponse.json({ ok: true, canal });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo enviar el formulario' }, { status: 502 });
  }
}
