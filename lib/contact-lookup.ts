import { ghlFetch, getLocationId } from './ghl';

// Busca un contacto de GHL cuyo teléfono coincida con el número dado -se usa
// para poder mandarle un SMS a alguien (ej. un usuario del equipo) a través
// de la API de conversaciones, que solo envía mensajes a contactos.
export async function findContactIdByPhone(phone: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const data = await ghlFetch<{ contacts: any[] }>('/contacts/search', {
    method: 'POST',
    body: JSON.stringify({ locationId: getLocationId(), pageLimit: 5, query: digits }),
  });
  const match = (data.contacts || []).find(
    (c: any) => c.phone && c.phone.replace(/\D/g, '').endsWith(digits.slice(-10))
  );
  return match?.id || null;
}
