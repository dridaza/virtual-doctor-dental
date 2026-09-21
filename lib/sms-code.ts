import { ghlFetch } from './ghl';
import { findGhlUserByEmail } from './users-store';
import { findContactIdByPhone } from './contact-lookup';

export function newCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Manda un SMS al teléfono registrado del usuario de GHL (a través del contacto
// que tiene ese mismo teléfono).
export async function sendSmsToUser(
  email: string,
  message: string
): Promise<{ ok: true; phoneHint: string } | { ok: false; error: string; status: number }> {
  const user = await findGhlUserByEmail(email);
  if (!user.phone) {
    return { ok: false, status: 400, error: 'Tu usuario de GoHighLevel no tiene un teléfono registrado para mandar el código' };
  }
  const contactId = await findContactIdByPhone(user.phone);
  if (!contactId) {
    return { ok: false, status: 400, error: 'No se encontró un contacto con tu teléfono en GoHighLevel para poder mandarte el código por SMS' };
  }
  try {
    await ghlFetch('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify({ type: 'SMS', contactId, message }),
    });
  } catch (err: any) {
    return { ok: false, status: 502, error: 'No se pudo enviar el código por SMS: ' + (err?.message || 'error desconocido') };
  }
  return { ok: true, phoneHint: user.phone.slice(-4) };
}
