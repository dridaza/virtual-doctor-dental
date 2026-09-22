import { ghlFetch, getLocationId, getLocationCustomValues, invalidateCustomValuesCache } from './ghl';

// Chat interno del equipo: cada mensaje es una nota independiente en un contacto oculto reservado
// para esto (no un paciente real). Guardar un mensaje es solo crear una nota nueva - no hay que leer
// y reescribir nada compartido, así que dos personas escribiendo en el mismo instante nunca se pisan
// entre sí, a diferencia de guardar la lista completa como un solo valor (lo que hacía antes).
const CV_NAME = 'Virtual Doctor - Chat contactId';
export const CHAT_CONTACT_TAG = 'vd-sistema-chat';
const MSG_PREFIX = '[VD-chat v1]';
const MAX = 200;

export type ChatMessage = { id: string; email: string; nombre: string; texto: string; ts: string };

async function findChatContactId(): Promise<string | null> {
  const cv = (await getLocationCustomValues()).find((v: any) => v.name === CV_NAME);
  return cv?.value || null;
}

async function createChatContact(): Promise<string> {
  const res = await ghlFetch<{ contact: any }>('/contacts/', {
    method: 'POST',
    body: JSON.stringify({
      locationId: getLocationId(),
      firstName: 'Virtual Doctor',
      lastName: '(chat interno - no es un paciente)',
      tags: [CHAT_CONTACT_TAG],
    }),
  });
  const contactId = res.contact.id as string;
  await ghlFetch(`/locations/${getLocationId()}/customValues`, {
    method: 'POST',
    body: JSON.stringify({ name: CV_NAME, value: contactId }),
  });
  invalidateCustomValuesCache();
  return contactId;
}

// Este contacto oculto se crea una sola vez en la vida de la cuenta (la primera vez que alguien
// usa el chat). Si dos personas lo usan por primera vez casi al mismo tiempo, puede que ambas
// intenten crearlo a la vez; se reintenta buscar unas cuantas veces antes de rendirse.
async function getChatContactId(): Promise<string> {
  const existing = await findChatContactId();
  if (existing) return existing;
  try {
    return await createChatContact();
  } catch {
    for (let i = 0; i < 3; i++) {
      invalidateCustomValuesCache();
      const retry = await findChatContactId();
      if (retry) return retry;
      await new Promise((r) => setTimeout(r, 200 + i * 200));
    }
    throw new Error('No se pudo preparar el chat interno');
  }
}

function parseNote(note: any): ChatMessage | null {
  if (typeof note.body !== 'string' || !note.body.startsWith(MSG_PREFIX)) return null;
  try {
    const d = JSON.parse(note.body.slice(MSG_PREFIX.length));
    return { id: note.id, email: String(d.email || ''), nombre: String(d.nombre || ''), texto: String(d.texto || ''), ts: note.dateAdded || new Date().toISOString() };
  } catch {
    return null;
  }
}

export async function readChat(): Promise<ChatMessage[]> {
  const contactId = await getChatContactId();
  const data = await ghlFetch<{ notes: any[] }>(`/contacts/${contactId}/notes`);
  return (data.notes || [])
    .map(parseNote)
    .filter((m): m is ChatMessage => m !== null)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    .slice(-MAX);
}

export async function postChat(msg: Omit<ChatMessage, 'id' | 'ts'>): Promise<ChatMessage[]> {
  const contactId = await getChatContactId();
  const body = `${MSG_PREFIX}${JSON.stringify({ email: msg.email, nombre: msg.nombre, texto: msg.texto })}`;
  await ghlFetch(`/contacts/${contactId}/notes`, { method: 'POST', body: JSON.stringify({ body }) });
  return readChat();
}
