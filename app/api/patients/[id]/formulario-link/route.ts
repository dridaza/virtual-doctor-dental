import { NextResponse } from 'next/server';
import { signFormToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Enlace personal del formulario para un paciente: lleva un token firmado que vence a los 30 días.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: 'Falta configurar SESSION_SECRET' }, { status: 500 });
  const token = await signFormToken(id, secret);
  return NextResponse.json({ url: `${new URL(request.url).origin}/formulario/${id}?t=${encodeURIComponent(token)}` });
}
