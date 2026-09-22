const BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const VERSION = process.env.GHL_API_VERSION || 'v3';

function authHeaders(): Record<string, string> {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) throw new Error('Falta configurar GHL_API_KEY en las variables de entorno');
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export function getLocationId(): string {
  const id = process.env.GHL_LOCATION_ID;
  if (!id) throw new Error('Falta configurar GHL_LOCATION_ID en las variables de entorno');
  return id;
}

export function getIntakeFieldId(): string {
  const id = process.env.GHL_INTAKE_FIELD_ID;
  if (!id) throw new Error('Falta configurar GHL_INTAKE_FIELD_ID en las variables de entorno');
  return id;
}

export const HC_NOTE_PREFIX = '[HC v1]';
export const HC_ANNOTATION_PREFIX = '[HC-anotacion v1]';
export const HC_RECETA_PREFIX = '[HC-receta v1]';
export const HC_CONSENT_PREFIX = '[HC-consent v1]';
export const HC_PAQUETE_PREFIX = '[HC-paquete v1]';
export const HC_TRATAMIENTO_PREFIX = '[HC-tratamiento v1]';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Con muchos usuarios a la vez, GHL puede responder 429 ("demasiadas peticiones") o fallar
// con 502/503 pasajeros. En vez de romper la pantalla, se reintenta unas pocas veces con
// espera creciente (y el tiempo que GHL pida en Retry-After, si lo manda) antes de rendirse.
const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 5;

export async function ghlFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  let attempt = 0;
  for (;;) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
      cache: 'no-store',
    });

    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : null;

    if (!res.ok) {
      if (RETRY_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get('retry-after')) * 1000;
        const backoff = retryAfter > 0 ? retryAfter : 250 * 2 ** attempt + Math.random() * 200;
        await sleep(backoff);
        attempt++;
        continue;
      }
      const message = (data && (data.message || data.error)) || `GoHighLevel respondió ${res.status}`;
      const err = new Error(typeof message === 'string' ? message : JSON.stringify(message)) as Error & { data?: unknown; status?: number };
      err.data = data;
      err.status = res.status;
      throw err;
    }

    return data as T;
  }
}

// Caché muy corta (por instancia del servidor) de la lista de "custom values" de la cuenta:
// varias partes de la app (chat interno, perfiles, paquetes, sesión de facturación) la piden
// antes de cada guardado solo para encontrar un valor por nombre. Con varios usuarios activos
// a la vez, reusar esta lista unos segundos evita pedirla de nuevo en cada petición.
let customValuesCache: { data: any[]; at: number } | null = null;
const CUSTOM_VALUES_TTL_MS = 15_000;

export async function getLocationCustomValues(): Promise<any[]> {
  if (customValuesCache && Date.now() - customValuesCache.at < CUSTOM_VALUES_TTL_MS) {
    return customValuesCache.data;
  }
  const data = await ghlFetch<{ customValues: any[] }>(`/locations/${getLocationId()}/customValues`);
  customValuesCache = { data: data.customValues || [], at: Date.now() };
  return customValuesCache.data;
}

// Se llama después de crear o actualizar un custom value, para que la próxima lectura en esta
// misma instancia no devuelva la lista vieja durante los segundos que dura la caché.
export function invalidateCustomValuesCache(): void {
  customValuesCache = null;
}

// Misma idea con la lista de calendarios: la piden el calendario de la semana, "Agendar cita" y
// "Mover cita" cada vez que se abren, y casi nunca cambia.
let calendarsCache: { data: any[]; at: number } | null = null;
const CALENDARS_TTL_MS = 20_000;

export async function getLocationCalendars(): Promise<any[]> {
  if (calendarsCache && Date.now() - calendarsCache.at < CALENDARS_TTL_MS) {
    return calendarsCache.data;
  }
  const data = await ghlFetch<{ calendars: any[] }>(`/calendars/?locationId=${getLocationId()}`);
  calendarsCache = { data: data.calendars || [], at: Date.now() };
  return calendarsCache.data;
}
