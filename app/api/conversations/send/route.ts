import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

// SMS y WhatsApp se mandan por la línea del negocio en GHL, no por un app personal del
// dispositivo. El correo también: se envía con el correo conectado en esta cuenta de GHL
// (el de la clínica) al correo del paciente, nunca abre el cliente de correo local.
export async function POST(request: Request) {
  try {
    const { contactId, message, type, subject } = await request.json();
    const trimmed = String(message || '').trim();
    const tipo = type || 'SMS';

    if (!contactId || !trimmed) {
      return NextResponse.json({ error: 'Falta contactId o mensaje' }, { status: 400 });
    }

    const body: Record<string, unknown> = { type: tipo, contactId };
    if (tipo === 'Email') {
      const asunto = String(subject || '').trim();
      if (!asunto) return NextResponse.json({ error: 'El correo necesita un asunto' }, { status: 400 });
      const location = await ghlFetch<{ location: any }>(`/locations/${getLocationId()}`).catch(() => ({ location: {} as any }));
      body.subject = asunto;
      body.emailFrom = location.location?.email || undefined;
      body.html = trimmed
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, '<br/>').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))}</p>`)
        .join('');
    } else {
      body.message = trimmed;
    }

    const data = await ghlFetch<{ conversationId: string; messageId: string }>('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    await logEvent('mensaje_enviado', `${tipo} a contacto ${contactId}`);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo enviar el mensaje' }, { status: 502 });
  }
}
