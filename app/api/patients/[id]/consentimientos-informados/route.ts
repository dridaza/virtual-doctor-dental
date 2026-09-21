import { NextResponse } from 'next/server';
import { ghlFetch, HC_CONSENT_PREFIX } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';
import { getNumeroHistoriaClinica } from '@/lib/historia-clinica';
import { getProfessionalProfile } from '@/lib/professional-profile';
import { uploadPatientFile } from '@/lib/media-upload';

export const dynamic = 'force-dynamic';

export type ConsentimientoInformado = {
  id: string;
  fecha: string;
  procedimiento: string;
  texto: string;
  firmaUrl: string;
  firmante: string;
  profesionalNombre: string;
  profesionalTitulo: string;
  profesionalCedula: string;
};

function parse(note: any): ConsentimientoInformado | null {
  if (typeof note.body !== 'string' || !note.body.startsWith(HC_CONSENT_PREFIX)) return null;
  try {
    const d = JSON.parse(note.body.slice(HC_CONSENT_PREFIX.length));
    return {
      id: note.id,
      fecha: d.fecha || note.dateAdded || '',
      procedimiento: d.procedimiento || '',
      texto: d.texto || '',
      firmaUrl: d.firmaUrl || '',
      firmante: d.firmante || '',
      profesionalNombre: d.profesionalNombre || '',
      profesionalTitulo: d.profesionalTitulo || '',
      profesionalCedula: d.profesionalCedula || '',
    };
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const data = await ghlFetch<{ notes: any[] }>(`/contacts/${contactId}/notes`);
    const consentimientos = (data.notes || [])
      .map(parse)
      .filter((c): c is ConsentimientoInformado => c !== null)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return NextResponse.json({ consentimientos });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar los consentimientos' }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const b = await request.json();
    const procedimiento = String(b.procedimiento || '').trim().slice(0, 200);
    const texto = String(b.texto || '').trim().slice(0, 6000);
    const firmante = String(b.firmante || '').trim().slice(0, 160);
    const firma = String(b.firmaDataUrl || '');
    if (!procedimiento) return NextResponse.json({ error: 'Indica el procedimiento' }, { status: 400 });
    if (!texto) return NextResponse.json({ error: 'El texto del consentimiento está vacío' }, { status: 400 });
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(firma);
    if (!m || firma.length > 1_500_000) return NextResponse.json({ error: 'Falta la firma del paciente' }, { status: 400 });

    const contact = (await ghlFetch<{ contact: any }>(`/contacts/${contactId}`)).contact;
    const nombre = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '(sin nombre)';
    const hc = getNumeroHistoriaClinica(contactId);
    const firmaUrl = await uploadPatientFile(nombre, hc, new Blob([Buffer.from(m[1], 'base64')], { type: 'image/png' }), `firma-consentimiento-${Date.now()}.png`);
    const prof = await getProfessionalProfile();

    const noteBody = `${HC_CONSENT_PREFIX}${JSON.stringify({
      fecha: b.fecha || new Date().toISOString(),
      procedimiento, texto, firmaUrl, firmante: firmante || nombre,
      profesionalNombre: prof.nombre, profesionalTitulo: prof.titulo, profesionalCedula: prof.cedula,
    })}`;
    const data = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes`, { method: 'POST', body: JSON.stringify({ body: noteBody }) });
    await logEvent('consentimiento_informado', `paciente ${contactId}: ${procedimiento}`);
    return NextResponse.json({ consentimiento: parse(data.note) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo guardar el consentimiento' }, { status: 502 });
  }
}
