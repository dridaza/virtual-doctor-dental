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
export const HC_PAQUETE_PREFIX = '[HC-paquete v1]';

export async function ghlFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
    cache: 'no-store',
  });

  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `GoHighLevel respondió ${res.status}`;
    const err = new Error(typeof message === 'string' ? message : JSON.stringify(message)) as Error & { data?: unknown; status?: number };
    err.data = data;
    err.status = res.status;
    throw err;
  }

  return data as T;
}
