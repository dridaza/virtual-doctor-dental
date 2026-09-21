import { NextResponse } from 'next/server';
import { tr } from '@/lib/terms';
import { rateLimited, clientIp } from '@/lib/rate-limit';
import { verifyFormToken } from '@/lib/session';
import { ghlFetch, getLocationId, getIntakeFieldId } from '@/lib/ghl';
import { mergeIntake, applyPatientQuestionnaire, PatientQuestionnaire } from '@/lib/intake';
import { getNumeroHistoriaClinica } from '@/lib/historia-clinica';
import { uploadPatientFile } from '@/lib/media-upload';

export const dynamic = 'force-dynamic';

function extractIntakeValue(contact: any): string | null {
  const fieldId = getIntakeFieldId();
  const field = (contact.customFields || []).find((f: any) => f.id === fieldId);
  return field ? field.value ?? field.field_value ?? null : null;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return '+' + (digits.length === 10 ? '52' + digits : digits);
}

function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function uploadDataUrlImage(
  patientName: string,
  numeroHistoriaClinica: string,
  dataUrl: string,
  prefix: string
): Promise<string | null> {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return null;

  const ext = decoded.contentType.split('/')[1] || 'png';
  const filename = `${prefix}-${Date.now()}.${ext}`;
  const blob = new Blob([new Uint8Array(decoded.buffer)], { type: decoded.contentType });
  try {
    return await uploadPatientFile(patientName, numeroHistoriaClinica, blob, filename);
  } catch {
    return null;
  }
}

// Endpoint público (sin sesión) que recibe el formulario que el propio
// paciente llena desde su teléfono. Si `contactId` no viene o ya no existe,
// primero intenta emparejar por teléfono para no crear un duplicado, y si no
// encuentra nada crea el contacto en GHL. Luego aplica solo las respuestas
// del cuestionario del paciente sobre la ficha -sin tocar jamás lo que el
// profesional ya haya registrado (exploración, diagnóstico, odontograma...).
// Un enlace sin token (o con token de otro paciente) nunca modifica una ficha existente:
// solo deja una nota de aviso para que la clínica confirme con el paciente.
async function flagExistingContact(contactId: string, firstName: string, lastName: string, phone: string | null, email: string) {
  await ghlFetch(`/contacts/${contactId}/notes`, {
    method: 'POST',
    body: JSON.stringify({
      body: tr(`AVISO: se recibió un formulario en línea sin enlace personal (nombre: ${firstName} ${lastName}, teléfono: ${phone || '-'}, email: ${email || '-'}). No se aplicó a la ficha; confírmalo con el paciente y envíale su enlace personal si corresponde.`),
    }),
  });
}

export async function POST(request: Request) {
  try {
    if (rateLimited('formulario:' + clientIp(request), 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiados envíos desde esta conexión. Intenta más tarde.' }, { status: 429 });
    }
    const body = await request.json();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const phoneRaw = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    const questionnaire = body.questionnaire as PatientQuestionnaire | undefined;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'El nombre y apellido son obligatorios' }, { status: 400 });
    }
    if (!questionnaire || !questionnaire.declaracionAceptada) {
      return NextResponse.json({ error: 'Debes aceptar la declaración del paciente' }, { status: 400 });
    }
    if (!questionnaire.firmaAutorizacion || !questionnaire.firmaAutorizacion.trim()) {
      return NextResponse.json({ error: 'Falta el nombre completo en la autorización' }, { status: 400 });
    }
    const firmaDibujoDataUrl = typeof body.firmaDibujoDataUrl === 'string' ? body.firmaDibujoDataUrl : null;
    if (!firmaDibujoDataUrl) {
      return NextResponse.json({ error: 'Falta dibujar la firma en la autorización' }, { status: 400 });
    }
    const fotoDataUrl = typeof body.fotoDataUrl === 'string' ? body.fotoDataUrl : null;
    if (firmaDibujoDataUrl.length > 1_500_000 || (fotoDataUrl && fotoDataUrl.length > 3_000_000)) {
      return NextResponse.json({ error: 'La imagen es demasiado grande' }, { status: 413 });
    }

    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

    const secret = process.env.SESSION_SECRET;
    let contactId: string | null = null;
    let authorized = false;
    if (body.contactId && body.token && secret && (await verifyFormToken(String(body.token), String(body.contactId), secret))) {
      contactId = String(body.contactId);
      authorized = true;
    }

    if (contactId) {
      try {
        await ghlFetch(`/contacts/${contactId}`);
      } catch {
        contactId = null;
      }
    }

    let created = false;

    if (!contactId && phone) {
      const digits = phone.replace(/\D/g, '');
      const searchData = await ghlFetch<{ contacts: any[] }>('/contacts/search', {
        method: 'POST',
        body: JSON.stringify({ locationId: getLocationId(), pageLimit: 5, query: digits }),
      });
      const match = (searchData.contacts || []).find(
        (c: any) => c.phone && c.phone.replace(/\D/g, '').endsWith(digits.slice(-10))
      );
      if (match) {
        if (!authorized) {
          await flagExistingContact(match.id, firstName, lastName, phone, email);
          return NextResponse.json({ ok: true, created: false });
        }
        contactId = match.id;
      }
    }

    if (!contactId) {
      const createBody: Record<string, unknown> = { locationId: getLocationId(), firstName, lastName };
      if (phone) createBody.phone = phone;
      if (email && email.includes('@')) createBody.email = email;
      if (body.dateOfBirth) createBody.dateOfBirth = body.dateOfBirth;
      if (body.address1) createBody.address1 = body.address1;
      if (body.city) createBody.city = body.city;
      if (body.state) createBody.state = body.state;

      try {
        const data = await ghlFetch<{ contact: any }>('/contacts/', { method: 'POST', body: JSON.stringify(createBody) });
        contactId = data.contact.id;
        created = true;
      } catch (err: any) {
        // GHL rechaza la creación si ya existe un contacto con el mismo teléfono
        // o email ("no allow duplicated contacts"): en vez de fallar, reutilizamos
        // el contacto que GHL señala como choque y seguimos como actualización.
        const clashId = err?.data?.meta?.contactId;
        if (clashId) {
          if (!authorized) {
            await flagExistingContact(clashId, firstName, lastName, phone, email);
            return NextResponse.json({ ok: true, created: false });
          }
          contactId = clashId;
        } else {
          throw err;
        }
      }
    }

    if (contactId && !created) {
      const contact = await ghlFetch<{ contact: any }>(`/contacts/${contactId}`).then((d) => d.contact);
      const updates: Record<string, unknown> = {};
      if (!contact.phone && phone) updates.phone = phone;
      if (!contact.email && email && email.includes('@')) updates.email = email;
      if (!contact.dateOfBirth && body.dateOfBirth) updates.dateOfBirth = body.dateOfBirth;
      if (!contact.address1 && body.address1) updates.address1 = body.address1;
      if (!contact.city && body.city) updates.city = body.city;
      if (!contact.state && body.state) updates.state = body.state;
      if (Object.keys(updates).length > 0) {
        await ghlFetch(`/contacts/${contactId}`, { method: 'PUT', body: JSON.stringify(updates) });
      }
    }

    const contactFull = await ghlFetch<{ contact: any }>(`/contacts/${contactId}`).then((d) => d.contact);
    const raw = extractIntakeValue(contactFull);
    const current = mergeIntake(raw ? JSON.parse(raw) : null);
    const merged = applyPatientQuestionnaire(current, questionnaire);

    const patientDisplayName =
      contactFull.name || [contactFull.firstName, contactFull.lastName].filter(Boolean).join(' ') || `${firstName} ${lastName}`;
    const numeroHistoriaClinica = getNumeroHistoriaClinica(contactId!);

    const signatureUrl = await uploadDataUrlImage(patientDisplayName, numeroHistoriaClinica, firmaDibujoDataUrl, 'firma');
    if (signatureUrl) merged.firmaDibujoUrl = signatureUrl;

    if (fotoDataUrl) {
      const photoUrl = await uploadDataUrlImage(patientDisplayName, numeroHistoriaClinica, fotoDataUrl, 'foto');
      if (photoUrl) merged.fotoUrl = photoUrl;
    }

    await ghlFetch(`/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify({ customFields: [{ id: getIntakeFieldId(), field_value: JSON.stringify(merged) }] }),
    });

    await ghlFetch(`/contacts/${contactId}/notes`, {
      method: 'POST',
      body: JSON.stringify({
        body: tr(`El paciente ${created ? 'se registró y ' : ''}completó su historia clínica desde el formulario en línea el ${new Date().toLocaleString('es-MX')}.`),
      }),
    });

    // Nunca se devuelve el ID del contacto: quien envía el formulario no debe poder descubrirlo.
    return NextResponse.json({ ok: true, created, ...(created ? { numeroHistoriaClinica } : {}) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo enviar el formulario' }, { status: 502 });
  }
}
