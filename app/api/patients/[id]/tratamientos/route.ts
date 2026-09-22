import { NextResponse } from 'next/server';
import { ghlFetch, HC_TRATAMIENTO_PREFIX } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';
import { getNumeroHistoriaClinica } from '@/lib/historia-clinica';
import { uploadPatientFile } from '@/lib/media-upload';
import { getProtocolo, sanitizeCampos, sanitizeConsent, TratamientoFicha } from '@/lib/tratamiento-protocolos';

export const dynamic = 'force-dynamic';

function parse(note: any): TratamientoFicha | null {
  if (typeof note.body !== 'string' || !note.body.startsWith(HC_TRATAMIENTO_PREFIX)) return null;
  try {
    const d = JSON.parse(note.body.slice(HC_TRATAMIENTO_PREFIX.length));
    return {
      id: note.id,
      protocolo: String(d.protocolo || ''),
      fecha: d.fecha || note.dateAdded || '',
      campos: d.campos || {},
      consent: d.consent || {},
      firmaUrl: d.firmaUrl || '',
      firmante: d.firmante || '',
      sesiones: Array.isArray(d.sesiones) ? d.sesiones : [],
    };
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const data = await ghlFetch<{ notes: any[] }>(`/contacts/${contactId}/notes`);
    const fichas = (data.notes || [])
      .map(parse)
      .filter((f): f is TratamientoFicha => f !== null)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return NextResponse.json({ fichas });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar las fichas de tratamiento' }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const b = await request.json();
    const protocolo = getProtocolo(String(b.protocolo || ''));
    if (!protocolo) return NextResponse.json({ error: 'Protocolo inválido' }, { status: 400 });

    const consent = sanitizeConsent(protocolo, b.consent);
    // El primer check de cada protocolo es siempre "acepto el procedimiento": es obligatorio.
    const acepta = protocolo.consentChecks[0] && consent[protocolo.consentChecks[0].key];
    if (!acepta || (acepta !== 'si' && acepta !== 'true' && acepta !== '1')) {
      return NextResponse.json({ error: 'Falta aceptar el consentimiento del tratamiento' }, { status: 400 });
    }

    const firma = String(b.firmaDataUrl || '');
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(firma);
    if (!m || firma.length > 1_500_000) return NextResponse.json({ error: 'Falta la firma del paciente' }, { status: 400 });

    const contact = (await ghlFetch<{ contact: any }>(`/contacts/${contactId}`)).contact;
    const nombre = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '(sin nombre)';
    const hc = getNumeroHistoriaClinica(contactId);
    const firmaUrl = await uploadPatientFile(nombre, hc, new Blob([Buffer.from(m[1], 'base64')], { type: 'image/png' }), `firma-tratamiento-${protocolo.id}-${Date.now()}.png`);

    const noteBody = `${HC_TRATAMIENTO_PREFIX}${JSON.stringify({
      protocolo: protocolo.id,
      fecha: b.fecha || new Date().toISOString(),
      campos: sanitizeCampos(protocolo, b.campos),
      consent,
      firmaUrl,
      firmante: String(b.firmante || '').trim().slice(0, 160) || nombre,
      sesiones: [],
    })}`;
    const data = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes`, { method: 'POST', body: JSON.stringify({ body: noteBody }) });
    await logEvent('tratamiento_ficha_creada', `paciente ${contactId}: ${protocolo.id}`);
    return NextResponse.json({ ficha: parse(data.note) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo crear la ficha de tratamiento' }, { status: 502 });
  }
}
