import { NextResponse } from 'next/server';
import { currentUserEmail, logEvent } from '@/lib/audit-log';
import { findGhlUserByEmail } from '@/lib/users-store';
import { getProfessionalProfile, saveProfessionalProfile } from '@/lib/professional-profile';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ profile: await getProfessionalProfile() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo cargar el perfil profesional' }, { status: 502 });
  }
}

// Solo administradores y dueños de la cuenta pueden cambiar los datos profesionales que salen en recetas y recibos.
export async function PUT(request: Request) {
  try {
    const email = await currentUserEmail();
    if (email === '-') return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
    const me = await findGhlUserByEmail(email);
    if (me.rol === 'Usuario') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

    const b = await request.json();
    const clean = (v: unknown, max = 160) => String(v ?? '').trim().slice(0, max);
    const profile = {
      nombre: clean(b.nombre),
      titulo: clean(b.titulo),
      cedula: clean(b.cedula, 40),
      institucion: clean(b.institucion),
      cedulaEspecialidad: clean(b.cedulaEspecialidad, 40),
    };
    await saveProfessionalProfile(profile);
    await logEvent('perfil_profesional_actualizado', '', email);
    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo guardar' }, { status: 502 });
  }
}
