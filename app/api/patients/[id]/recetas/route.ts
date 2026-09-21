import { NextResponse } from 'next/server';
import { ghlFetch, HC_RECETA_PREFIX } from '@/lib/ghl';
import { getProfessionalProfile } from '@/lib/professional-profile';

export const dynamic = 'force-dynamic';

export type Receta = {
  id: string;
  fecha: string;
  medicamentos: string;
  indicaciones: string;
  profesionalNombre: string;
  profesionalTitulo: string;
  profesionalCedula: string;
  profesionalInstitucion: string;
  profesionalCedulaEspecialidad: string;
};

function parseReceta(note: any): Receta | null {
  if (typeof note.body !== 'string' || !note.body.startsWith(HC_RECETA_PREFIX)) return null;
  try {
    const data = JSON.parse(note.body.slice(HC_RECETA_PREFIX.length));
    return {
      id: note.id,
      fecha: data.fecha || note.dateAdded || '',
      medicamentos: data.medicamentos || '',
      indicaciones: data.indicaciones || '',
      profesionalNombre: data.profesionalNombre || '',
      profesionalTitulo: data.profesionalTitulo || '',
      profesionalCedula: data.profesionalCedula || '',
      profesionalInstitucion: data.profesionalInstitucion || '',
      profesionalCedulaEspecialidad: data.profesionalCedulaEspecialidad || '',
    };
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const data = await ghlFetch<{ notes: any[] }>(`/contacts/${contactId}/notes`);
    const recetas = (data.notes || [])
      .map(parseReceta)
      .filter((r): r is Receta => r !== null)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return NextResponse.json({ recetas });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar las recetas' }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const body = await request.json();
    const fecha = body.fecha || new Date().toISOString();
    const medicamentos = String(body.medicamentos || '').trim();
    const indicaciones = String(body.indicaciones || '').trim();
    // Los datos del profesional se toman del servidor (Setup), no del navegador: así quedan fijos en la receta.
    const prof = await getProfessionalProfile();

    if (!medicamentos) {
      return NextResponse.json({ error: 'Debes indicar al menos un medicamento' }, { status: 400 });
    }

    const noteBody = `${HC_RECETA_PREFIX}${JSON.stringify({
      fecha,
      medicamentos,
      indicaciones,
      profesionalNombre: prof.nombre,
      profesionalTitulo: prof.titulo,
      profesionalCedula: prof.cedula,
      profesionalInstitucion: prof.institucion,
      profesionalCedulaEspecialidad: prof.cedulaEspecialidad,
    })}`;
    const data = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: noteBody }),
    });

    return NextResponse.json({ receta: parseReceta(data.note) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo guardar la receta' }, { status: 502 });
  }
}
