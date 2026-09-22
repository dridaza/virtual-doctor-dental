import { ghlFetch, getLocationId, getLocationCustomValues, invalidateCustomValuesCache } from './ghl';

const PREFIX = 'Virtual Doctor - Actividad - ';
const KEEP_DAYS = 90;
export const HEARTBEAT_MINUTES = 2;

export type DayActivity = { min: number; first: string; last: string };
export type ActivityStore = { days: Record<string, DayActivity>; lastBeat?: string };

export function mexicoDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(date);
}

async function findCustomValue(email: string) {
  const customValues = await getLocationCustomValues();
  return customValues.find((v: any) => v.name === PREFIX + email.toLowerCase()) || null;
}

function parse(value: string | undefined): ActivityStore {
  try {
    const p = value ? JSON.parse(value) : null;
    return p && p.days ? p : { days: {} };
  } catch {
    return { days: {} };
  }
}

export async function getActivity(email: string): Promise<ActivityStore> {
  const cv = await findCustomValue(email);
  return parse(cv?.value);
}

// Suma minutos de actividad real (el navegador solo manda el latido cuando la
// pestaña está visible y hubo uso reciente). Un segundo latido casi
// simultáneo -otra pestaña- no cuenta doble.
export async function addHeartbeat(email: string): Promise<void> {
  const cv = await findCustomValue(email);
  const store = parse(cv?.value);
  const now = new Date();
  if (store.lastBeat && now.getTime() - new Date(store.lastBeat).getTime() < 90_000) return;

  const day = mexicoDay(now);
  const cur = store.days[day] || { min: 0, first: now.toISOString(), last: now.toISOString() };
  cur.min += HEARTBEAT_MINUTES;
  cur.last = now.toISOString();
  store.days[day] = cur;
  store.lastBeat = now.toISOString();

  const keep = Object.keys(store.days).sort().slice(-KEEP_DAYS);
  store.days = Object.fromEntries(keep.map((k) => [k, store.days[k]]));

  const body = JSON.stringify({ name: PREFIX + email.toLowerCase(), value: JSON.stringify(store) });
  if (cv) await ghlFetch(`/locations/${getLocationId()}/customValues/${cv.id}`, { method: 'PUT', body });
  else await ghlFetch(`/locations/${getLocationId()}/customValues`, { method: 'POST', body });
  invalidateCustomValuesCache();
}
