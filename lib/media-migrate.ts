import { IntakeForm } from './intake';
import { uploadPatientFile } from './media-upload';

async function migrateOneUrl(
  url: string,
  patientName: string,
  numeroHistoriaClinica: string,
  filenameHint: string
): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await res.arrayBuffer());
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
    const ext = contentType.split('/')[1]?.split(';')[0] || 'bin';
    const safeHint = filenameHint.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || 'archivo';
    return await uploadPatientFile(patientName, numeroHistoriaClinica, blob, `${safeHint}.${ext}`);
  } catch {
    // si algo falla, se deja la URL original - nunca se pierde el archivo
    return url;
  }
}

// Migración perezosa: la primera vez que se sube un archivo nuevo para un
// paciente que todavía tiene archivos viejos sueltos en la raíz de la
// biblioteca de medios (de antes de existir la carpeta "Virtual Doctor"), se
// aprovecha ese momento para volver a subirlos dentro de su carpeta y
// actualizar la ficha con las URL nuevas. Los archivos viejos no se borran
// -quedan huérfanos en la raíz, pero nunca se arriesga a perder nada.
export async function migratePatientFilesIfNeeded(
  patientName: string,
  numeroHistoriaClinica: string,
  intake: IntakeForm
): Promise<IntakeForm> {
  if (intake.archivosMigrados) return intake;

  const next = { ...intake };

  if (next.fotoUrl) {
    next.fotoUrl = await migrateOneUrl(next.fotoUrl, patientName, numeroHistoriaClinica, 'foto');
  }
  if (next.firmaDibujoUrl) {
    next.firmaDibujoUrl = await migrateOneUrl(next.firmaDibujoUrl, patientName, numeroHistoriaClinica, 'firma');
  }
  if (next.imagenes.length) {
    next.imagenes = await Promise.all(
      next.imagenes.map(async (img, i) => ({
        ...img,
        url: await migrateOneUrl(img.url, patientName, numeroHistoriaClinica, img.name || `imagen-${i}`),
      }))
    );
  }
  if (next.consentimientos.length) {
    next.consentimientos = await Promise.all(
      next.consentimientos.map(async (doc, i) => ({
        ...doc,
        url: await migrateOneUrl(doc.url, patientName, numeroHistoriaClinica, doc.name || `consentimiento-${i}`),
      }))
    );
  }

  next.archivosMigrados = true;
  return next;
}
