import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';
import { mexicoDay } from '@/lib/activity';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Item = { name: string; amount: number; qty: number; productId?: string; priceId?: string };

const MODES = ['cash', 'card', 'bank_transfer', 'cheque', 'other'] as const;

function errorText(err: any): string {
  const m = err?.data?.message ?? err?.message ?? 'error desconocido';
  return Array.isArray(m) ? m.join(', ') : String(m);
}

// Crea en GoHighLevel una factura para el paciente y registra el pago recibido,
// así el cobro queda en GHL (Pagos > Transacciones) y aparece solo en
// Seguimiento y Facturación como cualquier otra factura.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  let invoiceId: string | undefined;
  let paid = false;
  try {
    const body = await request.json();
    const items: Item[] = (Array.isArray(body.items) ? body.items : [])
      .map((i: any) => ({
        name: String(i.name || '').trim(),
        amount: Number(i.amount || 0),
        qty: Math.max(1, Number(i.qty || 1)),
        productId: i.productId ? String(i.productId) : undefined,
        priceId: i.priceId ? String(i.priceId) : undefined,
      }))
      .filter((i: Item) => i.name && i.amount > 0);
    if (!items.length) return NextResponse.json({ error: 'Agrega al menos un concepto con precio' }, { status: 400 });

    const discountPercent = Math.min(100, Math.max(0, Number(body.discountPercent || 0)));
    const subtotal = items.reduce((s, i) => s + i.amount * i.qty, 0);
    const total = Math.round(subtotal * (1 - discountPercent / 100) * 100) / 100;
    const amount = body.amount === undefined || body.amount === '' ? total : Math.round(Number(body.amount) * 100) / 100;
    if (!(amount > 0)) return NextResponse.json({ error: 'El monto del pago debe ser mayor a 0' }, { status: 400 });
    if (amount > total + 0.001) return NextResponse.json({ error: `El pago no puede ser mayor al total (${total})` }, { status: 400 });

    const mode = (MODES as readonly string[]).includes(body.method) ? String(body.method) : 'cash';
    const liveMode = true;

    const [contactRes, locRes] = await Promise.all([
      ghlFetch<{ contact: any }>(`/contacts/${contactId}`),
      ghlFetch<{ location: any }>(`/locations/${getLocationId()}`),
    ]);
    const c = contactRes.contact;
    const loc = locRes.location;
    const name = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ');

    const invoice = await ghlFetch<any>('/invoices/', {
      method: 'POST',
      body: JSON.stringify({
        altId: getLocationId(),
        altType: 'location',
        name: 'Pago',
        title: 'INVOICE',
        currency: 'MXN',
        businessDetails: {
          name: loc.name,
          phoneNo: loc.phone,
          website: loc.website,
          address: { addressLine1: loc.address, city: loc.city, state: loc.state, countryCode: 'MX', postalCode: loc.postalCode },
        },
        contactDetails: { id: contactId, name, email: c.email || '', ...(c.phone ? { phoneNo: c.phone } : {}) },
        items: items.map((i) => ({
          name: i.name,
          description: '',
          currency: 'MXN',
          amount: i.amount,
          qty: i.qty,
          taxes: [],
          ...(i.productId && i.priceId ? { productId: i.productId, priceId: i.priceId } : {}),
        })),
        discount: { value: discountPercent, type: 'percentage' },
        issueDate: mexicoDay(new Date(Date.now() - 86400000 / 2)),
        dueDate: mexicoDay(new Date(Date.now() + 30 * 86400000)),
        liveMode,
        automaticTaxesEnabled: false,
        termsNotes: String(body.notes || '').trim(),
      }),
    });
    invoiceId = invoice._id || invoice.invoice?._id;
    if (!invoiceId) throw new Error('GHL no devolvió el identificador de la factura');

    await ghlFetch(`/invoices/${invoiceId}/record-payment`, {
      method: 'POST',
      body: JSON.stringify({
        altId: getLocationId(),
        altType: 'location',
        mode,
        amount,
        notes: String(body.notes || '').trim() || 'Pago registrado desde Virtual Doctor',
        fulfilledAt: new Date().toISOString(),
        liveMode,
      }),
    });
    paid = true;

    await logEvent('pago_creado', `paciente ${contactId}: ${amount} (${mode}) de ${total}`);
    return NextResponse.json({ ok: true, invoiceId, total, amount, pending: Math.round((total - amount) * 100) / 100 });
  } catch (err: any) {
    // Si la factura se creó pero el pago no se pudo registrar, se elimina el borrador para no dejar facturas huérfanas.
    if (invoiceId && !paid) {
      try {
        await ghlFetch(`/invoices/${invoiceId}?altId=${getLocationId()}&altType=location`, { method: 'DELETE' });
      } catch {
        /* queda como borrador en GHL */
      }
    }
    return NextResponse.json({ error: errorText(err) }, { status: 502 });
  }
}
