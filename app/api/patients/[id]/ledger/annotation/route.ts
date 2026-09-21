import { NextResponse } from 'next/server';
import { ghlFetch, HC_ANNOTATION_PREFIX } from '@/lib/ghl';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const { refId, notaId, texto } = await request.json();
    if (!refId) {
      return NextResponse.json({ error: 'Falta refId' }, { status: 400 });
    }

    const trimmed = String(texto || '').trim();
    const noteBody = `${HC_ANNOTATION_PREFIX}${JSON.stringify({ refId, texto: trimmed })}`;

    if (!trimmed && notaId) {
      // empty text on an existing annotation: delete it
      await ghlFetch(`/contacts/${contactId}/notes/${notaId}`, { method: 'DELETE' });
      return NextResponse.json({ notaId: null, notaTexto: '' });
    }

    if (!trimmed) {
      return NextResponse.json({ notaId: null, notaTexto: '' });
    }

    if (notaId) {
      const data = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes/${notaId}`, {
        method: 'PUT',
        body: JSON.stringify({ body: noteBody }),
      });
      return NextResponse.json({ notaId: data.note.id, notaTexto: trimmed });
    }

    const data = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: noteBody }),
    });
    return NextResponse.json({ notaId: data.note.id, notaTexto: trimmed });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo guardar la nota' }, { status: 502 });
  }
}
