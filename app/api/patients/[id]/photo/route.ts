import { NextResponse } from 'next/server';
import { ghlFetch, getIntakeFieldId } from '@/lib/ghl';
import { mergeIntake } from '@/lib/intake';
import { getNumeroHistoriaClinica } from '@/lib/historia-clinica';
import { uploadPatientFile } from '@/lib/media-upload';
import { migratePatientFilesIfNeeded } from '@/lib/media-migrate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function getIntake(contactId: string) {
  const data = await ghlFetch<{ contact: any }>(`/contacts/${contactId}`);
  const field = (data.contact.customFields || []).find((f: any) => f.id === getIntakeFieldId());
  const raw = field ? field.value ?? field.field_value ?? null : null;
  let parsed = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  return { intake: mergeIntake(parsed), contact: data.contact };
}

async function saveIntake(contactId: string, intake: ReturnType<typeof mergeIntake>) {
  await ghlFetch(`/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify({ customFields: [{ id: getIntakeFieldId(), field_value: JSON.stringify(intake) }] }),
  });
}

// Sube o reemplaza la foto de perfil del paciente desde la ficha interna
// (el mismo campo `fotoUrl` que llena el paciente desde el formulario público).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }

    const { intake, contact } = await getIntake(contactId);
    const patientName = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contactId;
    const numeroHistoriaClinica = getNumeroHistoriaClinica(contactId);
    const migrated = await migratePatientFilesIfNeeded(patientName, numeroHistoriaClinica, intake);
    const url = await uploadPatientFile(patientName, numeroHistoriaClinica, file, `foto-${contactId}.jpg`);

    const next = { ...migrated, fotoUrl: url };
    await saveIntake(contactId, next);

    return NextResponse.json({ fotoUrl: next.fotoUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo subir la foto' }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const { intake } = await getIntake(contactId);
    const next = { ...intake, fotoUrl: '' };
    await saveIntake(contactId, next);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo eliminar la foto' }, { status: 502 });
  }
}
