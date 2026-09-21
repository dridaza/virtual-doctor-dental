import { logEvent } from '@/lib/audit-log';
import { NextResponse } from 'next/server';
import { ghlFetch, HC_NOTE_PREFIX } from '@/lib/ghl';
import { editLockDays } from '@/lib/edit-lock';

export const dynamic = 'force-dynamic';

const LOCKED_MSG = 'Este registro ya está cerrado y no se puede modificar.';

async function loadExisting(contactId: string, noteId: string) {
  const data = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes/${noteId}`);
  const body: string = data.note?.body || '';
  let parsed: any = {};
  if (body.startsWith(HC_NOTE_PREFIX)) {
    try {
      parsed = JSON.parse(body.slice(HC_NOTE_PREFIX.length));
    } catch {
      parsed = {};
    }
  }
  const fecha = parsed.fecha || data.note?.dateAdded;
  const ageDays = fecha ? (Date.now() - new Date(fecha).getTime()) / 86400000 : 0;
  return { parsed, locked: editLockDays() > 0 && ageDays > editLockDays() };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const { id: contactId, noteId } = await params;
  try {
    const existing = await loadExisting(contactId, noteId);
    if (existing.locked) return NextResponse.json({ error: LOCKED_MSG }, { status: 403 });

    const body = await request.json();
    const fecha = body.fecha || new Date().toISOString();
    const tratamiento = String(body.tratamiento || '').trim();
    const pieza = String(body.pieza || '').trim();
    const material = String(body.material || '').trim();
    const cargo = Number(body.cargo || 0);
    const pago = Number(body.pago || 0);

    if (!tratamiento) {
      return NextResponse.json({ error: 'El tratamiento es obligatorio' }, { status: 400 });
    }

    const citaId = existing.parsed.citaId;
    const noteBody = `${HC_NOTE_PREFIX}${JSON.stringify({ fecha, tratamiento, pieza, material, cargo, pago, ...(citaId ? { citaId } : {}), ...(existing.parsed.paqueteId ? { paqueteId: existing.parsed.paqueteId } : {}) })}`;
    const data = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ body: noteBody }),
    });

    await logEvent('seguimiento_editado', `paciente ${contactId}: ${tratamiento} cargo ${cargo} pago ${pago}`);
    return NextResponse.json({ note: data.note });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo actualizar la visita' }, { status: 502 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const { id: contactId, noteId } = await params;
  try {
    const existing = await loadExisting(contactId, noteId);
    if (existing.locked) return NextResponse.json({ error: LOCKED_MSG }, { status: 403 });
    await ghlFetch(`/contacts/${contactId}/notes/${noteId}`, { method: 'DELETE' });
    await logEvent('seguimiento_eliminado', `paciente ${contactId}: nota ${noteId}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo eliminar la visita' }, { status: 502 });
  }
}
