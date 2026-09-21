import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';
import { channelsFrom, describeSend, sendEstimate } from '@/lib/estimates';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Envía (o reenvía) un presupuesto que ya existe en GHL.
export async function POST(request: Request, { params }: { params: Promise<{ id: string; estimateId: string }> }) {
  const { id: contactId, estimateId } = await params;
  try {
    const { send } = await request.json();
    const channels = channelsFrom(String(send || ''));
    if (!channels.length) return NextResponse.json({ error: 'Elige email o SMS' }, { status: 400 });

    const { contact: c } = await ghlFetch<{ contact: any }>(`/contacts/${contactId}`);
    if (channels.includes('email') && !c.email) return NextResponse.json({ error: 'El paciente no tiene email registrado' }, { status: 400 });
    if (channels.includes('sms') && !c.phone) return NextResponse.json({ error: 'El paciente no tiene teléfono registrado' }, { status: 400 });

    const result = await sendEstimate(estimateId, channels);
    const { sent, message } = describeSend(result);
    await logEvent('presupuesto_enviado', `paciente ${contactId}: ${message}`);
    return NextResponse.json({ ok: sent, message });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo enviar' }, { status: 502 });
  }
}
