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
  return mergeIntake(parsed);
}

async function saveIntake(contactId: string, intake: ReturnType<typeof mergeIntake>) {
  await ghlFetch(`/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify({
      customFields: [{ id: getIntakeFieldId(), field_value: JSON.stringify(intake) }],
    }),
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const intake = await getIntake(contactId);
    return NextResponse.json({ imagenes: intake.imagenes });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar las imágenes' }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    const name = String(form.get('name') || file?.name || 'imagen');
    if (!file) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }

    const contactData = await ghlFetch<{ contact: any }>(`/contacts/${contactId}`);
    const contact = contactData.contact;
    const patientName = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contactId;
    const numeroHistoriaClinica = getNumeroHistoriaClinica(contactId);

    const intake = await getIntake(contactId);
    const migrated = await migratePatientFilesIfNeeded(patientName, numeroHistoriaClinica, intake);
    const url = await uploadPatientFile(patientName, numeroHistoriaClinica, file, name);

    const next = {
      ...migrated,
      imagenes: [...migrated.imagenes, { url, name, uploadedAt: new Date().toISOString() }],
    };
    await saveIntake(contactId, next);

    return NextResponse.json({ imagenes: next.imagenes });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo subir la imagen' }, { status: 502 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const { url } = await request.json();
    const intake = await getIntake(contactId);
    const next = { ...intake, imagenes: intake.imagenes.filter((img) => img.url !== url) };
    await saveIntake(contactId, next);
    return NextResponse.json({ imagenes: next.imagenes });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo eliminar la imagen' }, { status: 502 });
  }
}
