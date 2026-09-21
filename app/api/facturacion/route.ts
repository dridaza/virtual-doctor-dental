import { NextResponse } from 'next/server';
import { getAccess } from '@/lib/require-unlock';
import { ghlFetch, getLocationId, HC_NOTE_PREFIX } from '@/lib/ghl';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GHL limita ~100 solicitudes / 10s por ubicación. Cada tanda hace 1 búsqueda
// + N solicitudes de notas, así que el tamaño y el espaciado entre ellas se
// mantienen bajos para no toparse con el límite en un recorrido de ~1000 contactos.
const BATCH_SIZE = 15;
const STAGGER_MS = 130;

export type FacturaRow = {
  contactId: string;
  contactName: string;
  fecha: string;
  tratamiento: string;
  cargo: number;
  pago: number;
};

function parseCursor(cursor: string | null): [number, string] | undefined {
  if (!cursor) return undefined;
  const [ts, id] = cursor.split('_');
  if (!ts || !id) return undefined;
  return [Number(ts), id];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 4, baseDelayMs = 1500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (err?.status !== 429) throw err;
      await sleep(baseDelayMs * (i + 1));
    }
  }
  throw lastErr;
}

async function fetchNotes(contactId: string, delayMs: number): Promise<any[]> {
  if (delayMs > 0) await sleep(delayMs);
  try {
    const data = await withRetry(() => ghlFetch<{ notes: any[] }>(`/contacts/${contactId}/notes`));
    return data.notes || [];
  } catch {
    return [];
  }
}

// Recorre TODOS los contactos de la ubicación en tandas pequeñas (el cliente
// llama a este endpoint repetidamente con el cursor devuelto) y extrae, de las
// notas [HC v1] de cada uno, las filas que representan cobros o pagos reales -
// la misma fuente que usa la pestaña Facturación de cada paciente. Recorrer
// ~1000 contactos de una sola vez excedería el tiempo de una función
// serverless (y el límite de solicitudes de GHL), por eso se hace en pasos
// cortos y escalonados en vez de una sola llamada masiva.
export async function GET(request: Request) {
  const access = await getAccess();
  if (!access?.unlocked) return NextResponse.json({ error: 'Se requiere la verificación de seguridad' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const searchAfter = parseCursor(searchParams.get('cursor'));

  try {
    const data = await withRetry(() =>
      ghlFetch<{ contacts: any[] }>('/contacts/search', {
        method: 'POST',
        body: JSON.stringify({
          locationId: getLocationId(),
          pageLimit: BATCH_SIZE,
          sort: [{ field: 'dateAdded', direction: 'asc' }],
          ...(searchAfter ? { searchAfter } : {}),
        }),
      })
    );

    const contacts = data.contacts || [];
    const notesLists = await Promise.all(contacts.map((c, i) => fetchNotes(c.id, i * STAGGER_MS)));

    const rows: FacturaRow[] = [];
    contacts.forEach((c, i) => {
      const contactName = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || '(sin nombre)';
      for (const note of notesLists[i]) {
        if (typeof note.body !== 'string' || !note.body.startsWith(HC_NOTE_PREFIX)) continue;
        let parsed: any;
        try {
          parsed = JSON.parse(note.body.slice(HC_NOTE_PREFIX.length));
        } catch {
          continue;
        }
        const cargo = Number(parsed.cargo || 0);
        const pago = Number(parsed.pago || 0);
        if (cargo === 0 && pago === 0) continue;
        rows.push({
          contactId: c.id,
          contactName,
          fecha: parsed.fecha || note.dateAdded || '',
          tratamiento: parsed.tratamiento || '',
          cargo,
          pago,
        });
      }
    });

    let nextCursor: string | null = null;
    if (contacts.length === BATCH_SIZE) {
      const last = contacts[contacts.length - 1];
      nextCursor = `${new Date(last.dateAdded).getTime()}_${last.id}`;
    }

    return NextResponse.json({ rows, nextCursor, done: !nextCursor, processed: contacts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error al consultar GoHighLevel' }, { status: 502 });
  }
}
