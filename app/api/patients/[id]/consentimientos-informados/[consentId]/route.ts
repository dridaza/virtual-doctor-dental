import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghl';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; consentId: string }> }) {
  const { id: contactId, consentId } = await params;
  try {
    await ghlFetch(`/contacts/${contactId}/notes/${consentId}`, { method: 'DELETE' });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo eliminar' }, { status: 502 });
  }
}
