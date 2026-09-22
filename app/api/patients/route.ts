import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';
import { getNumeroHistoriaClinica } from '@/lib/historia-clinica';
import { CHAT_CONTACT_TAG } from '@/lib/team-chat';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_LIMIT = 12;

function parseCursor(cursor: string | null): [number, string] | undefined {
  if (!cursor) return undefined;
  const [ts, id] = cursor.split('_');
  if (!ts || !id) return undefined;
  return [Number(ts), id];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || undefined;
  const limit = Math.min(Number(searchParams.get('limit')) || DEFAULT_LIMIT, 100);
  const searchAfter = parseCursor(searchParams.get('cursor'));

  try {
    const data = await ghlFetch<{ contacts: any[]; total: number }>('/contacts/search', {
      method: 'POST',
      body: JSON.stringify({
        locationId: getLocationId(),
        pageLimit: limit,
        sort: [{ field: 'dateUpdated', direction: 'desc' }],
        ...(query ? { query } : {}),
        ...(searchAfter ? { searchAfter } : {}),
      }),
    });

    // El contacto oculto que usa el chat interno para guardar sus mensajes (ver lib/team-chat.ts)
    // no es un paciente y nunca debe aparecer en esta lista.
    const rawContacts = (data.contacts || []).filter((c) => !(c.tags || []).includes(CHAT_CONTACT_TAG));
    const contacts = rawContacts.map((c) => ({
      id: c.id,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      name: c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || '(sin nombre)',
      email: c.email || '',
      phone: c.phone || '',
      tags: c.tags || [],
      dateAdded: c.dateAdded || null,
      ultimaActividad: c.dateUpdated || c.dateAdded || null,
      numeroHistoriaClinica: getNumeroHistoriaClinica(c.id),
    }));

    let nextCursor: string | null = null;
    if (rawContacts.length === limit) {
      const last = rawContacts[rawContacts.length - 1];
      nextCursor = `${new Date(last.dateUpdated || last.dateAdded).getTime()}_${last.id}`;
    }

    return NextResponse.json({ contacts, total: data.total ?? contacts.length, nextCursor });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error al consultar GoHighLevel' },
      { status: 502 }
    );
  }
}
