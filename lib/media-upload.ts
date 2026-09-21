import { getLocationId } from './ghl';
import { getPatientFolderId, getProfileFolderId } from './media-folders';

const BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    Version: process.env.GHL_API_VERSION || 'v3',
  };
}

async function uploadToFolder(file: Blob, filename: string, parentId: string | null): Promise<string> {
  const form = new FormData();
  form.append('file', file, filename);
  form.append('name', filename);
  form.append('altType', 'location');
  form.append('altId', getLocationId());
  if (parentId) form.append('parentId', parentId);

  const res = await fetch(`${BASE_URL}/medias/upload-file`, { method: 'POST', headers: authHeaders(), body: form });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error(data.message || 'No se pudo subir el archivo a GoHighLevel');
  return data.url as string;
}

// Sube un archivo a la subcarpeta del paciente dentro de "Virtual Doctor"
// (fotos, firmas, consentimientos, recibos - todo lo que pertenece a un
// paciente concreto queda junto, no disperso en la raíz de la biblioteca).
export async function uploadPatientFile(
  patientName: string,
  numeroHistoriaClinica: string,
  file: Blob,
  filename: string
): Promise<string> {
  const folderId = await getPatientFolderId(patientName, numeroHistoriaClinica);
  return uploadToFolder(file, filename, folderId);
}

export async function uploadProfileFile(file: Blob, filename: string): Promise<string> {
  const folderId = await getProfileFolderId();
  return uploadToFolder(file, filename, folderId);
}
