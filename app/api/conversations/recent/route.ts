import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';
import { blockIfNoConversationsAccess } from '@/lib/require-conversations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = await blockIfNoConversationsAccess();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 10, 50);

  try {
    const qs = new URLSearchParams({
      locationId: getLocationId(),
      limit: String(limit),
      sortBy: 'last_message_date',
      sort: 'desc',
    }).toString();

    const data = await ghlFetch<{ conversations: any[] }>(`/conversations/search?${qs}`);

    const conversations = (data.conversations || []).map((c) => ({
      id: c.id,
      contactId: c.contactId,
      contactName: c.contactName || c.fullName || '(sin nombre)',
      phone: c.phone || '',
      email: c.email || '',
      lastMessageBody: c.lastMessageBody || '',
      lastMessageType: c.lastMessageType || '',
      lastMessageDirection: c.lastMessageDirection || '',
      lastMessageDate: c.lastMessageDate ? new Date(c.lastMessageDate).toISOString() : null,
      unreadCount: c.unreadCount || 0,
    }));

    return NextResponse.json({ conversations });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar los mensajes' }, { status: 502 });
  }
}
