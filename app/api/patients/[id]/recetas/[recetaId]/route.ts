import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghl';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; recetaId: string }> }
) {
  const { id: contactId, recetaId } = await params;
  try {
    await ghlFetch(`/contacts/${contactId}/notes/${recetaId}`, { method: 'DELETE' });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo eliminar la receta' }, { status: 502 });
  }
}
