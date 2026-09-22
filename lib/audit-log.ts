import { cookies } from 'next/headers';
import { ghlFetch, getLocationId, getLocationCustomValues, invalidateCustomValuesCache } from './ghl';
import { SESSION_COOKIE, verifySession } from './session';

const CUSTOM_VALUE_NAME = 'Virtual Doctor - Log';
const MAX_ENTRIES = 400;

type Entry = { t: string; u: string; a: string; d: string };

async function findCustomValue() {
  const customValues = await getLocationCustomValues();
  return customValues.find((v: any) => v.name === CUSTOM_VALUE_NAME) || null;
}

export async function currentUserEmail(): Promise<string> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const secret = process.env.SESSION_SECRET;
    if (!token || !secret) return '-';
    const s = await verifySession(token, secret);
    return s?.email || '-';
  } catch {
    return '-';
  }
}

// Registro de actividad; nunca debe romper la acción que se está registrando.
export async function logEvent(action: string, detail = '', user?: string): Promise<void> {
  try {
    const u = user ?? (await currentUserEmail());
    const cv = await findCustomValue();
    let entries: Entry[] = [];
    if (cv?.value) {
      try { entries = JSON.parse(cv.value); } catch { entries = []; }
    }
    entries.push({ t: new Date().toISOString(), u, a: action, d: detail.slice(0, 200) });
    const body = JSON.stringify({ name: CUSTOM_VALUE_NAME, value: JSON.stringify(entries.slice(-MAX_ENTRIES)) });
    if (cv) await ghlFetch(`/locations/${getLocationId()}/customValues/${cv.id}`, { method: 'PUT', body });
    else await ghlFetch(`/locations/${getLocationId()}/customValues`, { method: 'POST', body });
  invalidateCustomValuesCache();
  } catch {
    /* ignorar */
  }
}

export async function readLog(): Promise<Entry[]> {
  const cv = await findCustomValue();
  if (!cv?.value) return [];
  try { return JSON.parse(cv.value); } catch { return []; }
}
