import { ghlFetch, getLocationId, getLocationCustomValues, invalidateCustomValuesCache } from './ghl';

// Chat interno del equipo: se guarda en un custom value de GHL (sin base de datos), últimos MAX mensajes.
const NAME = 'Virtual Doctor - Chat interno';
const MAX = 200;

export type ChatMessage = { id: string; email: string; nombre: string; texto: string; ts: string };

async function find() {
  const customValues = await getLocationCustomValues();
  return customValues.find((v: any) => v.name === NAME) || null;
}

function parse(value: string | undefined): ChatMessage[] {
  try {
    const p = value ? JSON.parse(value) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export async function readChat(): Promise<ChatMessage[]> {
  return parse((await find())?.value);
}

export async function postChat(msg: Omit<ChatMessage, 'id' | 'ts'>): Promise<ChatMessage[]> {
  const cv = await find();
  const list = parse(cv?.value);
  list.push({ ...msg, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: new Date().toISOString() });
  const trimmed = list.slice(-MAX);
  const body = JSON.stringify({ name: NAME, value: JSON.stringify(trimmed) });
  if (cv) await ghlFetch(`/locations/${getLocationId()}/customValues/${cv.id}`, { method: 'PUT', body });
  else await ghlFetch(`/locations/${getLocationId()}/customValues`, { method: 'POST', body });
  invalidateCustomValuesCache();
  return trimmed;
}
