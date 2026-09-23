import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghl';
import { blockIfNoConversationsAccess } from '@/lib/require-conversations';

export const dynamic = 'force-dynamic';

const CANALES: Record<string, string> = {
  TYPE_SMS: 'SMS',
  TYPE_WHATSAPP: 'WhatsApp',
  TYPE_EMAIL: 'Email',
  TYPE_CUSTOM_EMAIL: 'Email',
  TYPE_FB: 'Facebook',
  TYPE_IG: 'Instagram',
  TYPE_LIVE_CHAT: 'Chat web',
  TYPE_CALL: 'Llamada',
};

// Mensajes completos de una conversación (más antiguos primero) para leerla sin salir del dashboard.
export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const denied = await blockIfNoConversationsAccess();
  if (denied) return denied;
  try {
    if (!/^[A-Za-z0-9]{6,40}$/.test(conversationId)) return NextResponse.json({ error: 'Conversación inválida' }, { status: 400 });
    const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') || 60), 100);
    const data = await ghlFetch<{ messages: { messages: any[] } }>(`/conversations/${conversationId}/messages?limit=${limit}`);
    const messages = (data.messages?.messages || [])
      .map((m: any) => {
        const adjuntos: string[] = Array.isArray(m.attachments) ? m.attachments.filter((a: any) => typeof a === 'string' && /^https?:\/\//.test(a)) : [];
        const texto = String(m.body || '').trim();
        return {
          id: m.id,
          direction: m.direction === 'inbound' ? 'inbound' : 'outbound',
          body: texto || (adjuntos.length ? '' : m.messageType ? `(${CANALES[m.messageType] || m.messageType})` : ''),
          canal: CANALES[m.messageType] || '',
          date: m.dateAdded || null,
          adjuntos,
          estado: m.status || '',
        };
      })
      .filter((m: any) => m.body || m.adjuntos.length)
      .reverse();
    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo cargar la conversación' }, { status: 502 });
  }
}
