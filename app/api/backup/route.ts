import { logEvent } from '@/lib/audit-log';
import { getAccess } from '@/lib/require-unlock';
import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';
import { encryptBuffer } from '@/lib/backup-crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

async function fetchAllContacts() {
  const all: any[] = [];
  let searchAfter: [number, string] | undefined;
  let total = Infinity;

  for (let page = 0; page < MAX_PAGES && all.length < total; page++) {
    const body: Record<string, unknown> = {
      locationId: getLocationId(),
      pageLimit: PAGE_SIZE,
      ...(searchAfter ? { searchAfter } : {}),
    };
    const data = await ghlFetch<{ contacts: any[]; total: number }>('/contacts/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    total = data.total ?? 0;
    const batch = data.contacts || [];
    if (batch.length === 0) break;
    all.push(...batch);
    const last = batch[batch.length - 1];
    searchAfter = [new Date(last.dateAdded).getTime(), last.id];
    if (batch.length < PAGE_SIZE) break;
  }
  return all;
}

export async function POST(request: Request) {
  try {
    const access = await getAccess();
    if (!access?.unlocked) return NextResponse.json({ error: 'Se requiere la verificación de seguridad' }, { status: 403 });
    const { password } = await request.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const contacts = await fetchAllContacts();
    const pacientes = contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      name: c.name || [c.firstName, c.lastName].filter(Boolean).join(' '),
      email: c.email || '',
      phone: c.phone || '',
      dateOfBirth: c.dateOfBirth || '',
      address1: c.address1 || '',
      city: c.city || '',
      state: c.state || '',
      tags: c.tags || [],
      dateAdded: c.dateAdded || null,
    }));

    const payload = {
      generatedAt: new Date().toISOString(),
      scope: 'contactos (datos básicos + etiquetas). No incluye historia clínica ni seguimiento detallado por paciente.',
      total: pacientes.length,
      pacientes,
    };

    const json = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');
    const encrypted = encryptBuffer(json, password);

    await logEvent('backup_descargado', `${pacientes.length} pacientes`);
    const filename = `backup-pacientes-${new Date().toISOString().slice(0, 10)}.enc`;
    return new NextResponse(new Uint8Array(encrypted), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo generar el backup' }, { status: 502 });
  }
}
