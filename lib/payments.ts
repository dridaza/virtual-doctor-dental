import { ghlFetch, getLocationId } from './ghl';
import { mexicoDay } from './activity';

export type PayItem = { name: string; amount: number; qty: number; productId?: string; priceId?: string };

export const PAY_MODES = ['cash', 'card', 'bank_transfer', 'cheque', 'other'] as const;

export function errorText(err: any): string {
  const m = err?.data?.message ?? err?.message ?? 'error desconocido';
  return Array.isArray(m) ? m.join(', ') : String(m);
}

export function cleanItems(raw: unknown): PayItem[] {
  return (Array.isArray(raw) ? raw : [])
    .map((i: any) => ({
      name: String(i.name || '').trim(),
      amount: Number(i.amount || 0),
      qty: Math.max(1, Number(i.qty || 1)),
      productId: i.productId ? String(i.productId) : undefined,
      priceId: i.priceId ? String(i.priceId) : undefined,
    }))
    .filter((i) => i.name && i.amount > 0);
}

export class PaymentError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

// Crea en GoHighLevel una factura para el paciente y registra el pago recibido. Si la factura se
// crea pero el pago falla, se elimina el borrador para no dejar facturas huérfanas.
export async function createPaidInvoice(opts: {
  contactId: string;
  items: PayItem[];
  discountPercent?: number;
  amount?: number | null;
  method?: string;
  notes?: string;
  liveMode?: boolean;
}): Promise<{ invoiceId: string; total: number; amount: number; pending: number; mode: string }> {
  const discountPercent = Math.min(100, Math.max(0, Number(opts.discountPercent || 0)));
  const subtotal = opts.items.reduce((s, i) => s + i.amount * i.qty, 0);
  const total = Math.round(subtotal * (1 - discountPercent / 100) * 100) / 100;
  const amount = opts.amount === undefined || opts.amount === null ? total : Math.round(Number(opts.amount) * 100) / 100;
  if (!opts.items.length) throw new PaymentError('Agrega al menos un concepto con precio', 400);
  if (!(amount > 0)) throw new PaymentError('El monto del pago debe ser mayor a 0', 400);
  if (amount > total + 0.001) throw new PaymentError(`El pago no puede ser mayor al total (${total})`, 400);

  const mode = (PAY_MODES as readonly string[]).includes(opts.method || '') ? String(opts.method) : 'cash';
  const liveMode = opts.liveMode !== false;
  const notes = String(opts.notes || '').trim();

  const [contactRes, locRes] = await Promise.all([
    ghlFetch<{ contact: any }>(`/contacts/${opts.contactId}`),
    ghlFetch<{ location: any }>(`/locations/${getLocationId()}`),
  ]);
  const c = contactRes.contact;
  const loc = locRes.location;
  const name = c.name || [c.firstName, c.lastName].filter(Boolean).join(' ');

  let invoiceId: string | undefined;
  let paid = false;
  try {
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
        contactDetails: { id: opts.contactId, name, email: c.email || '', ...(c.phone ? { phoneNo: c.phone } : {}) },
        items: opts.items.map((i) => ({
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
        termsNotes: notes,
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
        notes: notes || 'Pago registrado desde Virtual Doctor',
        fulfilledAt: new Date().toISOString(),
        liveMode,
      }),
    });
    paid = true;
    return { invoiceId, total, amount, pending: Math.round((total - amount) * 100) / 100, mode };
  } catch (err) {
    if (invoiceId && !paid) {
      try {
        await ghlFetch(`/invoices/${invoiceId}?altId=${getLocationId()}&altType=location`, { method: 'DELETE' });
      } catch {
        /* queda como borrador en GHL */
      }
    }
    if (err instanceof PaymentError) throw err;
    throw new PaymentError(errorText(err));
  }
}
