import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';
import {
  CreatorProfile,
  CREATOR_PROFILE_CUSTOM_VALUE_NAME,
  defaultCreatorProfile,
  findCreatorProfileCustomValue,
  getCreatorProfile,
} from '@/lib/creator-profile';
import { uploadProfileFile } from '@/lib/media-upload';

export const dynamic = 'force-dynamic';

function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function uploadPhoto(dataUrl: string): Promise<string | null> {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return null;
  const ext = decoded.contentType.split('/')[1] || 'jpg';
  const filename = `perfil-creador-${Date.now()}.${ext}`;
  const blob = new Blob([new Uint8Array(decoded.buffer)], { type: decoded.contentType });
  try {
    return await uploadProfileFile(blob, filename);
  } catch {
    return null;
  }
}

// El perfil del creador se guarda como un "custom value" a nivel de la
// ubicación en GHL -el mismo backend que usa el resto de la app-, así queda
// disponible desde cualquier dispositivo sin necesitar una base de datos aparte.
export async function GET() {
  try {
    const profile = await getCreatorProfile();
    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo cargar el perfil' }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const existing = await findCreatorProfileCustomValue();

    const current: CreatorProfile = existing
      ? { ...defaultCreatorProfile(), ...(() => { try { return JSON.parse(existing.value || '{}'); } catch { return {}; } })() }
      : defaultCreatorProfile();

    const profile: CreatorProfile = {
      nombre: typeof body.nombre === 'string' ? body.nombre : current.nombre,
      titulo: typeof body.titulo === 'string' ? body.titulo : current.titulo,
      bio: typeof body.bio === 'string' ? body.bio : current.bio,
      email: typeof body.email === 'string' ? body.email : current.email,
      fotoUrl: current.fotoUrl,
      actualizadoEl: new Date().toISOString(),
    };

    if (typeof body.fotoDataUrl === 'string' && body.fotoDataUrl) {
      const url = await uploadPhoto(body.fotoDataUrl);
      if (url) profile.fotoUrl = url;
    } else if (body.fotoDataUrl === null) {
      profile.fotoUrl = '';
    }

    if (existing) {
      await ghlFetch(`/locations/${getLocationId()}/customValues/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: CREATOR_PROFILE_CUSTOM_VALUE_NAME, value: JSON.stringify(profile) }),
      });
    } else {
      await ghlFetch(`/locations/${getLocationId()}/customValues`, {
        method: 'POST',
        body: JSON.stringify({ name: CREATOR_PROFILE_CUSTOM_VALUE_NAME, value: JSON.stringify(profile) }),
      });
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo guardar el perfil' }, { status: 502 });
  }
}
