import { ghlFetch, getLocationId } from './ghl';

const CUSTOM_VALUE_NAME = 'Virtual Doctor - Usuarios';

export type StoredUser = { email: string; nombre: string; passwordHash: string };

async function findCustomValue() {
  const data = await ghlFetch<{ customValues: any[] }>(`/locations/${getLocationId()}/customValues`);
  return (data.customValues || []).find((v: any) => v.name === CUSTOM_VALUE_NAME) || null;
}

export async function getStoredUsers(): Promise<StoredUser[]> {
  const cv = await findCustomValue();
  if (!cv?.value) return [];
  try {
    return JSON.parse(cv.value);
  } catch {
    return [];
  }
}

export async function saveStoredUsers(users: StoredUser[]): Promise<void> {
  const cv = await findCustomValue();
  const body = JSON.stringify({ name: CUSTOM_VALUE_NAME, value: JSON.stringify(users) });
  if (cv) {
    await ghlFetch(`/locations/${getLocationId()}/customValues/${cv.id}`, { method: 'PUT', body });
  } else {
    await ghlFetch(`/locations/${getLocationId()}/customValues`, { method: 'POST', body });
  }
}

// Los usuarios que pueden entrar al dashboard son exclusivamente los que ya
// existen como usuarios/miembros del equipo en esta cuenta de GoHighLevel -
// no se puede crear una cuenta con cualquier email.
export async function findGhlUserByEmail(email: string): Promise<{ ok: boolean; nombre: string; phone: string; rol: string }> {
  const data = await ghlFetch<{ users: any[] }>(`/users/?locationId=${getLocationId()}`);
  const match = (data.users || []).find(
    (u: any) => !u.deleted && String(u.email || '').toLowerCase() === email.toLowerCase()
  );
  // Dueño de la agencia: puede entrar a cualquier instalación de un cliente aunque no sea usuario de esa
  // subcuenta de GHL. Se define con AGENCY_OWNER_EMAILS (y AGENCY_OWNER_PHONE para recibir el código SMS).
  const owners = (process.env.AGENCY_OWNER_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!match && owners.includes(email.toLowerCase())) {
    return { ok: true, nombre: process.env.AGENCY_OWNER_NAME || 'Dueño de agencia', phone: process.env.AGENCY_OWNER_PHONE || '', rol: 'Dueño de agencia' };
  }
  const t = match?.roles?.type;
  const r = match?.roles?.role;
  const rol = t === 'agency' ? 'Dueño de agencia' : r === 'admin' ? 'Administrador' : 'Usuario';
  return { ok: !!match, nombre: match?.name || match?.firstName || '', phone: match?.phone || '', rol };
}

export async function listGhlUsers(): Promise<{ id: string; email: string; nombre: string; rol: string }[]> {
  const data = await ghlFetch<{ users: any[] }>(`/users/?locationId=${getLocationId()}`);
  return (data.users || [])
    .filter((u: any) => !u.deleted)
    .map((u: any) => ({
      id: u.id,
      email: String(u.email || '').toLowerCase(),
      nombre: u.name || u.firstName || u.email,
      rol: u.roles?.type === 'agency' ? 'Dueño de agencia' : u.roles?.role === 'admin' ? 'Administrador' : 'Usuario',
    }));
}
