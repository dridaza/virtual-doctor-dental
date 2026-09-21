import { logEvent } from '@/lib/audit-log';
import { moduleConfig } from '@/lib/modules';
import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';
import { getNumeroHistoriaClinica } from '@/lib/historia-clinica';
import { getProfessionalProfile } from '@/lib/professional-profile';
import { buildReceiptPdf } from '@/lib/receipt-pdf';
import { uploadPatientFile } from '@/lib/media-upload';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Genera el recibo de pago en PDF (folio, datos del paciente y la clínica,
// concepto, importe con letra) y lo envía por email y SMS usando la misma API
// de conversaciones de GHL que ya usa el resto de la app. Se manda por SMS y
// no por WhatsApp porque la suscripción de WhatsApp no está activa en esta
// cuenta de GHL (falla con "subscriptionNotActiveLocation"); si en algún
// momento se activa, este es el lugar donde volver a intentarlo.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const body = await request.json();
    const fecha = body.fecha || new Date().toISOString();
    const concepto = String(body.concepto || '').trim();
    const cargo = Number(body.cargo || 0);
    const pago = Number(body.pago || 0);
    const saldo = Number(body.saldo || 0);

    if (pago <= 0) {
      return NextResponse.json({ error: 'Este movimiento no tiene un pago registrado' }, { status: 400 });
    }

    const [contactData, location, profesional] = await Promise.all([
      ghlFetch<{ contact: any }>(`/contacts/${contactId}`),
      ghlFetch<{ location: any }>(`/locations/${getLocationId()}`).catch(() => ({ location: {} })),
      getProfessionalProfile(),
    ]);
    const contact = contactData.contact;
    const patientName = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '(sin nombre)';

    const folio = `REC-${new Date(fecha).getFullYear()}-${contactId.slice(-4).toUpperCase()}${Date.now().toString().slice(-4)}`;

    const pdfBuffer = await buildReceiptPdf({
      folio,
      fecha,
      clinic: {
        name: process.env.NEXT_PUBLIC_CLINIC_NAME || location.location?.name || 'Clínica',
        address: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || location.location?.address || '',
        phone: process.env.NEXT_PUBLIC_CLINIC_PHONE || location.location?.phone || '',
        website: process.env.NEXT_PUBLIC_CLINIC_WEBSITE || location.location?.website || '',
        email: location.location?.email || '',
      },
      patient: {
        name: patientName,
        numeroHistoriaClinica: getNumeroHistoriaClinica(contactId),
        phone: contact.phone || '',
        email: contact.email || '',
      },
      concepto: concepto || moduleConfig.conceptoRecibo,
      cargo,
      pago,
      saldo,
      profesional,
    });

    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
    const pdfUrl = await uploadPatientFile(patientName, getNumeroHistoriaClinica(contactId), pdfBlob, `${folio}.pdf`);

    const result: { pdfUrl: string; emailSent: boolean; smsSent: boolean; errors: string[] } = {
      pdfUrl,
      emailSent: false,
      smsSent: false,
      errors: [],
    };

    if (contact.email) {
      try {
        await ghlFetch('/conversations/messages', {
          method: 'POST',
          body: JSON.stringify({
            type: 'Email',
            contactId,
            emailFrom: location.location?.email || undefined,
            subject: `Recibo de pago - ${folio}`,
            html: `<p>Hola ${patientName},</p><p>Adjunto tu recibo de pago, folio ${folio}. Gracias por tu confianza.</p>`,
            attachments: [pdfUrl],
          }),
        });
        result.emailSent = true;
      } catch (err: any) {
        result.errors.push(`Email: ${err?.message || 'error desconocido'}`);
      }
    }

    if (contact.phone) {
      try {
        await ghlFetch('/conversations/messages', {
          method: 'POST',
          body: JSON.stringify({
            type: 'SMS',
            contactId,
            message: `Hola ${patientName}, aquí tienes tu recibo de pago (folio ${folio}): ${pdfUrl}`,
          }),
        });
        result.smsSent = true;
      } catch (err: any) {
        result.errors.push(`SMS: ${err?.message || 'error desconocido'}`);
      }
    }

    await logEvent('recibo_enviado', `paciente ${contactId}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo generar el recibo' }, { status: 502 });
  }
}
