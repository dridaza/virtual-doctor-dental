import { NextResponse } from 'next/server';
import { ghlFetch, getIntakeFieldId } from '@/lib/ghl';
import { mergeIntake, fillIntakeGaps } from '@/lib/intake';

export const dynamic = 'force-dynamic';

const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'country', 'dateOfBirth'] as const;

function extractIntakeValue(contact: any): string | null {
  const fieldId = getIntakeFieldId();
  const field = (contact.customFields || []).find((f: any) => f.id === fieldId);
  return field ? field.value ?? field.field_value ?? null : null;
}

async function getContact(id: string) {
  const data = await ghlFetch<{ contact: any }>(`/contacts/${id}`);
  return data.contact;
}

// Fusiona el contacto duplicado (`duplicateId`) dentro del contacto que se
// conserva (`id` en la URL): copia todas sus notas, completa los huecos de la
// ficha clínica y de los datos de contacto -sin sobrescribir nunca nada que el
// contacto que se conserva ya tuviera- y finalmente borra el duplicado.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: keepId } = await params;
  try {
    const { duplicateId } = await request.json();
    if (!duplicateId || typeof duplicateId !== 'string') {
      return NextResponse.json({ error: 'Falta el id del contacto duplicado' }, { status: 400 });
    }
    if (duplicateId === keepId) {
      return NextResponse.json({ error: 'No se puede fusionar un contacto consigo mismo' }, { status: 400 });
    }

    const [keepContact, dupContact] = await Promise.all([getContact(keepId), getContact(duplicateId)]);

    // 1) Copiar todas las notas del duplicado hacia el contacto que se conserva.
    const notesData = await ghlFetch<{ notes: any[] }>(`/contacts/${duplicateId}/notes`);
    const notes = notesData.notes || [];
    let notesMoved = 0;
    for (const note of notes) {
      if (typeof note.body !== 'string' || !note.body.trim()) continue;
      await ghlFetch(`/contacts/${keepId}/notes`, { method: 'POST', body: JSON.stringify({ body: note.body }) });
      notesMoved++;
    }

    // 2) Completar huecos de la ficha clínica (nunca sobrescribe datos existentes).
    const keepRaw = extractIntakeValue(keepContact);
    const dupRaw = extractIntakeValue(dupContact);
    let intakeFilled = false;
    if (dupRaw) {
      const keepIntake = mergeIntake(keepRaw ? JSON.parse(keepRaw) : null);
      const dupIntake = mergeIntake(JSON.parse(dupRaw));
      const merged = fillIntakeGaps(keepIntake, dupIntake);
      await ghlFetch(`/contacts/${keepId}`, {
        method: 'PUT',
        body: JSON.stringify({ customFields: [{ id: getIntakeFieldId(), field_value: JSON.stringify(merged) }] }),
      });
      intakeFilled = true;
    }

    // 3) Completar campos básicos del contacto (nombre, teléfono, email, etc.)
    const fieldsFilled: string[] = [];
    const contactUpdates: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      const keepVal = keepContact[key];
      const dupVal = dupContact[key];
      if ((!keepVal || !String(keepVal).trim()) && dupVal && String(dupVal).trim()) {
        contactUpdates[key] = dupVal;
        fieldsFilled.push(key);
      }
    }
    if (Object.keys(contactUpdates).length > 0) {
      await ghlFetch(`/contacts/${keepId}`, { method: 'PUT', body: JSON.stringify(contactUpdates) });
    }

    // 4) Eliminar el contacto duplicado.
    await ghlFetch(`/contacts/${duplicateId}`, { method: 'DELETE' });

    return NextResponse.json({ ok: true, notesMoved, intakeFilled, fieldsFilled });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo fusionar el contacto' }, { status: 502 });
  }
}
