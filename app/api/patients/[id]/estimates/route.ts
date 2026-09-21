import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';
import { channelsFrom, describeSend, sendEstimate } from '@/lib/estimates';
import { mexicoDay } from '@/lib/activity';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Item = { name: string; amount: number; qty: number; productId?: string; priceId?: string };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const body = await request.json();
    const items: Item[] = (Array.isArray(body.items) ? body.items : [])
      .map((i: any) => ({ name: String(i.name || '').trim(), amount: Number(i.amount || 0), qty: Math.max(1, Number(i.qty || 1)), productId: i.productId ? String(i.productId) : undefined, priceId: i.priceId ? String(i.priceId) : undefined }))
      .filter((i: Item) => i.name && i.amount > 0);
    if (!items.length) return NextResponse.json({ error: 'Agrega al menos un concepto con precio' }, { status: 400 });

    const discountPercent = Math.min(100, Math.max(0, Number(body.discountPercent || 0)));
    const validDays = Math.min(365, Math.max(1, Number(body.validDays || 30)));
    const send: 'none' | 'email' | 'sms' | 'sms_and_email' = ['email', 'sms', 'sms_and_email'].includes(body.send) ? body.send : 'none';

    const [contactRes, locRes] = await Promise.all([
      ghlFetch<{ contact: any }>(`/contacts/${contactId}`),
      ghlFetch<{ location: any }>(`/locations/${getLocationId()}`),
    ]);
    const c = contactRes.contact;
    const loc = locRes.location;
    const name = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ');

    if ((send === 'email' || send === 'sms_and_email') && !c.email) {
      return NextResponse.json({ error: 'El paciente no tiene email registrado' }, { status: 400 });
    }
    if ((send === 'sms' || send === 'sms_and_email') && !c.phone) {
      return NextResponse.json({ error: 'El paciente no tiene teléfono registrado' }, { status: 400 });
    }

    // GHL rechaza fechas de emisión "en el futuro": se usa la fecha de México con un margen de medio día.
    const issueDate = mexicoDay(new Date(Date.now() - 86400000 / 2));
    const expiryDate = mexicoDay(new Date(Date.now() + validDays * 86400000));

    const created = await ghlFetch<any>('/invoices/estimate', {
      method: 'POST',
      body: JSON.stringify({
        altId: getLocationId(),
        altType: 'location',
        name: 'Presupuesto',
        title: 'PRESUPUESTO',
        currency: 'MXN',
        businessDetails: {
          name: loc.name,
          phoneNo: loc.phone,
          website: loc.website,
          address: { addressLine1: loc.address, city: loc.city, state: loc.state, countryCode: 'MX', postalCode: loc.postalCode },
        },
        contactDetails: { id: contactId, name, email: c.email || '', phoneNo: c.phone || '' },
        frequencySettings: { enabled: false },
        items: items.map((i) => ({
          name: i.name,
          description: '',
          currency: 'MXN',
          amount: i.amount,
          qty: i.qty,
          type: 'one_time',
          taxes: [],
          taxInclusive: false,
          ...(i.productId && i.priceId ? { productId: i.productId, priceId: i.priceId } : {}),
        })),
        // GHL exige el campo de descuento aunque sea 0.
        discount: { value: discountPercent, type: 'percentage' },
        issueDate,
        expiryDate,
        liveMode: true,
        termsNotes: String(body.notes || '').trim(),
      }),
    });
    const estimateId = created._id || created.estimate?._id || created.id;

    let sent = false;
    let sendMessage = '';
    if (send !== 'none' && estimateId) {
      const result = await sendEstimate(estimateId, channelsFrom(send));
      const d = describeSend(result);
      sent = d.sent;
      sendMessage = d.message;
    }

    await logEvent('presupuesto_creado', `paciente ${contactId}: ${items.length} concepto(s)${sent ? ' y enviado' : ''}`);
    return NextResponse.json({ ok: true, id: estimateId, sent, sendMessage });
  } catch (err: any) {
    const detail = err?.data?.message || err?.message || 'No se pudo crear el presupuesto';
    return NextResponse.json({ error: Array.isArray(detail) ? detail.join(', ') : detail }, { status: 502 });
  }
}
