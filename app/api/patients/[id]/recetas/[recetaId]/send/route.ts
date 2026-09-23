import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId, HC_RECETA_PREFIX } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';
import { getNumeroHistoriaClinica } from '@/lib/historia-clinica';
import { buildRecetaPdf } from '@/lib/receta-pdf';
import { uploadPatientFile } from '@/lib/media-upload';
import { blockIfNoConversationsAccess } from '@/lib/require-conversations';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Genera la receta en PDF y la envía al paciente por email (adjunta) y/o SMS (con el enlace al PDF).
export async function POST(request: Request, { params }: { params: Promise<{ id: string; recetaId: string }> }) {
  const { id: contactId, recetaId } = await params;
  const denied = await blockIfNoConversationsAccess();
  if (denied) return denied;
  try {
    const { email: byEmail, sms: bySms } = await request.json();
    if (!byEmail && !bySms) return NextResponse.json({ error: 'Elige email o SMS' }, { status: 400 });

    const [noteRes, contactRes, locRes] = await Promise.all([
      ghlFetch<{ note: any }>(`/contacts/${contactId}/notes/${recetaId}`),
      ghlFetch<{ contact: any }>(`/contacts/${contactId}`),
      ghlFetch<{ location: any }>(`/locations/${getLocationId()}`).catch(() => ({ location: {} as any })),
    ]);
    const body: string = noteRes.note?.body || '';
    if (!body.startsWith(HC_RECETA_PREFIX)) return NextResponse.json({ error: 'La receta no existe' }, { status: 404 });
    const r = JSON.parse(body.slice(HC_RECETA_PREFIX.length));
    const contact = contactRes.contact;
    const loc = locRes.location || {};
    const patientName = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '(sin nombre)';

    if (byEmail && !contact.email) return NextResponse.json({ error: 'El paciente no tiene email registrado' }, { status: 400 });
    if (bySms && !contact.phone) return NextResponse.json({ error: 'El paciente no tiene teléfono registrado' }, { status: 400 });

    const hc = getNumeroHistoriaClinica(contactId);
    const pdf = await buildRecetaPdf({
      fecha: r.fecha || noteRes.note?.dateAdded || new Date().toISOString(),
      clinic: {
        name: process.env.NEXT_PUBLIC_CLINIC_NAME || loc.name || 'Consultorio',
        address: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || loc.address || '',
        phone: process.env.NEXT_PUBLIC_CLINIC_PHONE || loc.phone || '',
        website: process.env.NEXT_PUBLIC_CLINIC_WEBSITE || loc.website || '',
      },
      patient: { name: patientName, numeroHistoriaClinica: hc },
      medicamentos: String(r.medicamentos || ''),
      indicaciones: String(r.indicaciones || ''),
      profesional: {
        nombre: r.profesionalNombre || '',
        titulo: r.profesionalTitulo || '',
        cedula: r.profesionalCedula || '',
        institucion: r.profesionalInstitucion || '',
        cedulaEspecialidad: r.profesionalCedulaEspecialidad || '',
      },
    });
    const fileName = `Receta-${new Date(r.fecha || Date.now()).toISOString().slice(0, 10)}-${recetaId.slice(-4)}.pdf`;
    const pdfUrl = await uploadPatientFile(patientName, hc, new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), fileName);

    const result: { pdfUrl: string; emailSent: boolean; smsSent: boolean; errors: string[] } = { pdfUrl, emailSent: false, smsSent: false, errors: [] };

    if (byEmail) {
      try {
        await ghlFetch('/conversations/messages', {
          method: 'POST',
          body: JSON.stringify({
            type: 'Email',
            contactId,
            emailFrom: loc.email || undefined,
            subject: 'Tu receta médica',
            html: `<p>Hola ${patientName},</p><p>Adjunto tu receta médica. Cualquier duda, con gusto te atendemos.</p>`,
            attachments: [pdfUrl],
          }),
        });
        result.emailSent = true;
      } catch (err: any) {
        result.errors.push(`Email: ${err?.message || 'error desconocido'}`);
      }
    }
    if (bySms) {
      try {
        await ghlFetch('/conversations/messages', {
          method: 'POST',
          body: JSON.stringify({ type: 'SMS', contactId, message: `Hola ${patientName}, aquí tienes tu receta médica: ${pdfUrl}` }),
        });
        result.smsSent = true;
      } catch (err: any) {
        result.errors.push(`SMS: ${err?.message || 'error desconocido'}`);
      }
    }

    await logEvent('receta_enviada', `paciente ${contactId}: ${[result.emailSent && 'email', result.smsSent && 'sms'].filter(Boolean).join('+') || 'sin envío'}`);
    return NextResponse.json({ ok: result.emailSent || result.smsSent, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo enviar la receta' }, { status: 502 });
  }
}
