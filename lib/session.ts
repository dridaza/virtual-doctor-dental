// Firma y verifica cookies de sesión con Web Crypto (funciona igual en el
// middleware -Edge- que en las rutas de API -Node-, sin depender del módulo
// "crypto" de Node que el runtime Edge no soporta).
const encoder = new TextEncoder();

async function getKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(s: string): Uint8Array {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const str = atob(b64);
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

export type SessionPayload = { email: string; nombre: string; iat: number };
export type FacturacionPayload = { fact: true; iat: number };
export type FacturacionOtpPayload = { email: string; digest: string; exp: number };
export type GatePayload = { gate: true; iat: number };

async function sign(payload: object, secret: string): Promise<string> {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `${body}.${base64url(sig)}`;
}

async function verify<T>(token: string, secret: string): Promise<T | null> {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const key = await getKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, base64urlToBytes(sig) as BufferSource, encoder.encode(body));
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(base64urlToBytes(body))) as T;
  } catch {
    return null;
  }
}

// Huella del código SMS: la cookie firmada es legible por quien la recibe, así
// que nunca lleva el código en claro sino solo su HMAC.
export async function codeDigest(email: string, code: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('otp:' + email.toLowerCase() + ':' + code));
  return base64url(sig);
}

export const ENROLL_COOKIE = 'vd_enroll';

// Enlace personal del formulario: token firmado, ligado a UN paciente y con vencimiento.
export type FormTokenPayload = { p: 'form'; id: string; exp: number };

export function signFormToken(id: string, secret: string, ttlMs = 30 * 24 * 3600 * 1000) {
  return sign({ p: 'form', id, exp: Date.now() + ttlMs } satisfies FormTokenPayload, secret);
}

export async function verifyFormToken(token: string, id: string, secret: string): Promise<boolean> {
  const payload = await verify<FormTokenPayload>(token, secret);
  return !!payload && payload.p === 'form' && payload.id === id && Date.now() <= payload.exp;
}

export const SESSION_COOKIE = 'vd_session';
export const FACTURACION_COOKIE = 'vd_fact';
export const FACTURACION_OTP_COOKIE = 'vd_fact_otp';
export const GATE_COOKIE = 'vd_gate';

// Cookie del "candado de acceso" (contraseña compartida del equipo, aparte de la sesión de cada
// persona). Cookie normal, no el cuadro nativo del navegador: así sí funciona con el ícono de
// pantalla de inicio en iPhone/Android, donde el cuadro de usuario/contraseña de HTTP no persiste.
export function signGate(secret: string) {
  return sign({ gate: true, iat: Date.now() } as GatePayload, secret);
}

export async function verifyGate(token: string, secret: string): Promise<boolean> {
  const payload = await verify<GatePayload>(token, secret);
  return !!payload?.gate;
}

export function signSession(payload: SessionPayload, secret: string) {
  return sign(payload, secret);
}

export function verifySession(token: string, secret: string) {
  return verify<SessionPayload>(token, secret);
}

export function signFacturacionUnlock(secret: string) {
  return sign({ fact: true, iat: Date.now() } as FacturacionPayload, secret);
}

export async function verifyFacturacionUnlock(token: string, secret: string): Promise<boolean> {
  const payload = await verify<FacturacionPayload>(token, secret);
  return !!payload?.fact;
}

export function signFacturacionOtp(payload: FacturacionOtpPayload, secret: string) {
  return sign(payload, secret);
}

export function verifyFacturacionOtp(token: string, secret: string) {
  return verify<FacturacionOtpPayload>(token, secret);
}
