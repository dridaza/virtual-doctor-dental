import { NextResponse } from 'next/server';
import { ghlFetch, HC_TRATAMIENTO_PREFIX } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';
import { getProtocolo, sanitizeCampos, sanitizeSesiones } from '@/lib/tratamiento-protocolos';

export const dynamic = 'force-dynamic';

async function loadExisting(contactId: string, fichaId: string) {
  const data = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes/${fichaId}`);
  const body: string = data.note?.body || '';
  if (!body.startsWith(HC_TRATAMIENTO_PREFIX)) throw new Error('La ficha no existe');
  return { note: data.note, parsed: JSON.parse(body.slice(HC_TRATAMIENTO_PREFIX.length)) };
}

// Actualiza los datos de la ficha inicial y/o la bitácora de sesiones (se manda la lista completa
// de sesiones en cada guardado, como el resto de las fichas editables de la app).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; fichaId: string }> }) {
  const { id: contactId, fichaId } = await params;
  try {
    const { parsed } = await loadExisting(contactId, fichaId);
    const protocolo = getProtocolo(parsed.protocolo);
    if (!protocolo) return NextResponse.json({ error: 'Protocolo inválido' }, { status: 400 });

    const b = await request.json();
    const next = {
      ...parsed,
      campos: 'campos' in b ? sanitizeCampos(protocolo, b.campos) : parsed.campos,
      sesiones: 'sesiones' in b ? sanitizeSesiones(protocolo, b.sesiones) : parsed.sesiones,
    };
    const noteBody = `${HC_TRATAMIENTO_PREFIX}${JSON.stringify(next)}`;
    await ghlFetch(`/contacts/${contactId}/notes/${fichaId}`, { method: 'PUT', body: JSON.stringify({ body: noteBody }) });
    await logEvent('tratamiento_ficha_editada', `paciente ${contactId}: ${protocolo.id} (${next.sesiones.length} sesiones)`);
    return NextResponse.json({ ficha: { id: fichaId, ...next } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo guardar la ficha' }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; fichaId: string }> }) {
  const { id: contactId, fichaId } = await params;
  try {
    await ghlFetch(`/contacts/${contactId}/notes/${fichaId}`, { method: 'DELETE' });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo eliminar la ficha' }, { status: 502 });
  }
}
