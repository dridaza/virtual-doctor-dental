import { getLocationId } from './ghl';

const BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const ROOT_FOLDER_NAME = 'Virtual Doctor';
const PROFILE_FOLDER_NAME = 'Perfil';

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    Version: process.env.GHL_API_VERSION || 'v3',
  };
}

async function findFolder(name: string, parentId: string | null): Promise<string | null> {
  const params = new URLSearchParams({ altType: 'location', altId: getLocationId(), type: 'folder', query: name });
  const res = await fetch(`${BASE_URL}/medias/files?${params.toString()}`, { headers: authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  const match = (data.files || []).find(
    (f: any) => f.type === 'folder' && f.name === name && (f.parentId || null) === (parentId || null)
  );
  return match?._id || null;
}

async function createFolder(name: string, parentId: string | null): Promise<string> {
  const res = await fetch(`${BASE_URL}/medias/folder`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ altId: getLocationId(), altType: 'location', name, ...(parentId ? { parentId } : {}) }),
  });
  const data = await res.json();
  if (!res.ok || !data._id) throw new Error(data.message || 'No se pudo crear la carpeta en GoHighLevel');
  return data._id as string;
}

async function getOrCreateFolder(name: string, parentId: string | null): Promise<string> {
  const existing = await findFolder(name, parentId);
  if (existing) return existing;
  try {
    return await createFolder(name, parentId);
  } catch (err) {
    // condición de carrera: alguien más la creó al mismo tiempo; se busca de nuevo antes de fallar
    const retry = await findFolder(name, parentId);
    if (retry) return retry;
    throw err;
  }
}

let rootFolderIdCache: string | null = null;

// Todo lo que Virtual Doctor sube a GoHighLevel (fotos, firmas, consentimientos,
// recibos) vive ordenado dentro de una sola carpeta raíz "Virtual Doctor", con
// una subcarpeta por paciente -en vez de quedar todo mezclado en la raíz de la
// biblioteca de medios, como pasaba antes.
export async function getRootFolderId(): Promise<string> {
  if (rootFolderIdCache) return rootFolderIdCache;
  rootFolderIdCache = await getOrCreateFolder(ROOT_FOLDER_NAME, null);
  return rootFolderIdCache;
}

export async function getPatientFolderId(patientName: string, numeroHistoriaClinica: string): Promise<string> {
  const root = await getRootFolderId();
  const folderName = `${patientName} (${numeroHistoriaClinica})`.slice(0, 100);
  return getOrCreateFolder(folderName, root);
}

export async function getProfileFolderId(): Promise<string> {
  const root = await getRootFolderId();
  return getOrCreateFolder(PROFILE_FOLDER_NAME, root);
}
