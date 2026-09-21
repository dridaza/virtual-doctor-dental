import { NextResponse } from 'next/server';
import { ghlFetch, getIntakeFieldId } from '@/lib/ghl';
import { mergeIntake } from '@/lib/intake';

export const dynamic = 'force-dynamic';

function extractIntakeValue(contact: any): string | null {
  const fieldId = getIntakeFieldId();
  const field = (contact.customFields || []).find((f: any) => f.id === fieldId);
  return field ? field.value ?? field.field_value ?? null : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const data = await ghlFetch<{ contact: any }>(`/contacts/${contactId}`);
    const raw = extractIntakeValue(data.contact);
    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }
    return NextResponse.json({ intake: mergeIntake(parsed) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo cargar la ficha' }, { status: 502 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const body = await request.json();
    const intake = mergeIntake(body);

    await ghlFetch(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify({
        customFields: [{ id: getIntakeFieldId(), field_value: JSON.stringify(intake) }],
      }),
    });

    return NextResponse.json({ intake, savedAt: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo guardar la ficha' }, { status: 502 });
  }
}
