import { NextResponse } from 'next/server';
import { logEvent } from '@/lib/audit-log';
import { cleanItems, createPaidInvoice, PaymentError } from '@/lib/payments';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Crea en GoHighLevel una factura para el paciente y registra el pago recibido,
// así el cobro queda en GHL (Pagos > Transacciones) y aparece solo en
// Seguimiento y Facturación como cualquier otra factura.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const body = await request.json();
    const result = await createPaidInvoice({
      contactId,
      items: cleanItems(body.items),
      discountPercent: body.discountPercent,
      amount: body.amount === undefined || body.amount === '' ? null : Number(body.amount),
      method: body.method,
      notes: body.notes,
    });
    await logEvent('pago_creado', `paciente ${contactId}: ${result.amount} (${result.mode}) de ${result.total}`);
    return NextResponse.json({ ok: true, invoiceId: result.invoiceId, total: result.total, amount: result.amount, pending: result.pending });
  } catch (err: any) {
    const status = err instanceof PaymentError ? err.status : 502;
    return NextResponse.json({ error: err?.message || 'No se pudo registrar el pago' }, { status });
  }
}
