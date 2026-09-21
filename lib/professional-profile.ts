import { ghlFetch, getLocationId } from './ghl';

const CUSTOM_VALUE_NAME = 'Virtual Doctor - Perfil profesional';

// Datos del profesional que firma recetas y recibos (el dueño de la cuenta / el médico o dentista).
export type ProfessionalProfile = {
  nombre: string;
  titulo: string;
  cedula: string;
  institucion: string;
  cedulaEspecialidad: string;
  credenciales: string; // líneas adicionales del membrete (una por línea)
};

export function emptyProfessional(): ProfessionalProfile {
  return { nombre: '', titulo: '', cedula: '', institucion: '', cedulaEspecialidad: '', credenciales: '' };
}

async function findCustomValue() {
  const data = await ghlFetch<{ customValues: any[] }>(`/locations/${getLocationId()}/customValues`);
  return (data.customValues || []).find((v: any) => v.name === CUSTOM_VALUE_NAME) || null;
}

export async function getProfessionalProfile(): Promise<ProfessionalProfile> {
  const cv = await findCustomValue();
  if (!cv?.value) return emptyProfessional();
  try {
    return { ...emptyProfessional(), ...JSON.parse(cv.value) };
  } catch {
    return emptyProfessional();
  }
}

export async function saveProfessionalProfile(profile: ProfessionalProfile): Promise<void> {
  const cv = await findCustomValue();
  const body = JSON.stringify({ name: CUSTOM_VALUE_NAME, value: JSON.stringify(profile) });
  if (cv) await ghlFetch(`/locations/${getLocationId()}/customValues/${cv.id}`, { method: 'PUT', body });
  else await ghlFetch(`/locations/${getLocationId()}/customValues`, { method: 'POST', body });
}
