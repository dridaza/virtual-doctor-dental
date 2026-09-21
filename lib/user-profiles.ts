import { ghlFetch, getLocationId } from './ghl';

const CUSTOM_VALUE_NAME = 'Virtual Doctor - Perfiles de usuario';

export type UserProfile = { nombre: string; fotoUrl: string };
type Store = Record<string, UserProfile>;

async function findCustomValue() {
  const data = await ghlFetch<{ customValues: any[] }>(`/locations/${getLocationId()}/customValues`);
  return (data.customValues || []).find((v: any) => v.name === CUSTOM_VALUE_NAME) || null;
}

function parse(value: string | undefined): Store {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

export async function getUserProfile(email: string): Promise<UserProfile | null> {
  const cv = await findCustomValue();
  return parse(cv?.value)[email.toLowerCase()] || null;
}

export async function saveUserProfile(email: string, profile: UserProfile): Promise<void> {
  const cv = await findCustomValue();
  const store = parse(cv?.value);
  store[email.toLowerCase()] = profile;
  const body = JSON.stringify({ name: CUSTOM_VALUE_NAME, value: JSON.stringify(store) });
  if (cv) await ghlFetch(`/locations/${getLocationId()}/customValues/${cv.id}`, { method: 'PUT', body });
  else await ghlFetch(`/locations/${getLocationId()}/customValues`, { method: 'POST', body });
}
