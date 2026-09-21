import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghl';
import { getNumeroHistoriaClinica } from '@/lib/historia-clinica';

export const dynamic = 'force-dynamic';

function toPatient(c: any) {
  return {
    id: c.id,
    firstName: c.firstName || '',
    lastName: c.lastName || '',
    name: c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || '(sin nombre)',
    email: c.email || '',
    phone: c.phone || '',
    address1: c.address1 || '',
    city: c.city || '',
    state: c.state || '',
    country: c.country || '',
    dateOfBirth: c.dateOfBirth || '',
    tags: c.tags || [],
    dateAdded: c.dateAdded || null,
    numeroHistoriaClinica: getNumeroHistoriaClinica(c.id),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const data = await ghlFetch<{ contact: any }>(`/contacts/${contactId}`);
    return NextResponse.json({ patient: toPatient(data.contact) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo cargar el paciente' }, { status: 502 });
  }
}

const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'country', 'dateOfBirth'] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in body) updates[key] = body[key];
    }

    const data = await ghlFetch<{ contact: any }>(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    return NextResponse.json({ patient: toPatient(data.contact), savedAt: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo guardar el paciente' }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    await ghlFetch(`/contacts/${contactId}`, { method: 'DELETE' });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo eliminar el paciente' }, { status: 502 });
  }
}
