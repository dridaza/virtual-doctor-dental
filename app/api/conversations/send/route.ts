import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { contactId, message, type } = await request.json();
    const trimmed = String(message || '').trim();

    if (!contactId || !trimmed) {
      return NextResponse.json({ error: 'Falta contactId o mensaje' }, { status: 400 });
    }

    const data = await ghlFetch<{ conversationId: string; messageId: string }>('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify({
        type: type || 'SMS',
        contactId,
        message: trimmed,
      }),
    });

    await logEvent('mensaje_enviado', `${type || 'SMS'} a contacto ${contactId}`);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo enviar el mensaje' }, { status: 502 });
  }
}
