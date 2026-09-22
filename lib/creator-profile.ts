import { ghlFetch, getLocationId, getLocationCustomValues, invalidateCustomValuesCache } from './ghl';

export const CREATOR_PROFILE_CUSTOM_VALUE_NAME = 'Virtual Doctor - Perfil del creador';

export type CreatorProfile = {
  nombre: string;
  titulo: string;
  bio: string;
  email: string;
  fotoUrl: string;
  actualizadoEl: string;
};

export function defaultCreatorProfile(): CreatorProfile {
  return { nombre: '', titulo: 'Creador de Virtual Doctor', bio: '', email: '', fotoUrl: '', actualizadoEl: '' };
}

export async function findCreatorProfileCustomValue() {
  const customValues = await getLocationCustomValues();
  return customValues.find((v: any) => v.name === CREATOR_PROFILE_CUSTOM_VALUE_NAME) || null;
}

export async function getCreatorProfile(): Promise<CreatorProfile> {
  const existing = await findCreatorProfileCustomValue();
  if (!existing) return defaultCreatorProfile();
  try {
    return { ...defaultCreatorProfile(), ...JSON.parse(existing.value || '{}') };
  } catch {
    return defaultCreatorProfile();
  }
}
