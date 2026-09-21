import { NextResponse } from 'next/server';
import { ghlFetch, HC_NOTE_PREFIX, HC_PAQUETE_PREFIX } from '@/lib/ghl';
import { logEvent } from '@/lib/audit-log';
import { createPaidInvoice, PaymentError } from '@/lib/payments';
import { addMonths, loadPaquetes } from '@/lib/paquetes';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    return NextResponse.json({ paquetes: await loadPaquetes(contactId) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar los paquetes' }, { status: 502 });
  }
}

// Vende un paquete: cobra el total completo en GHL (factura + pago), crea el paquete y,
// si se pide, registra de una vez la primera sesión (el pago completo es en la primera sesión).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const body = await request.json();
    const nombre = String(body.nombre || '').trim();
    const sesionesTotal = Math.floor(Number(body.sesionesTotal));
    const precio = Math.round(Number(body.precio) * 100) / 100;
    const meses = Math.min(24, Math.max(1, Math.floor(Number(body.meses || 6))));
    if (!nombre) return NextResponse.json({ error: 'Escribe el nombre del paquete' }, { status: 400 });
    if (!(sesionesTotal >= 1 && sesionesTotal <= 100)) return NextResponse.json({ error: 'El número de sesiones debe estar entre 1 y 100' }, { status: 400 });
    if (!(precio > 0)) return NextResponse.json({ error: 'El precio debe ser mayor a 0' }, { status: 400 });

    // "test" solo lo usan las pruebas internas en un servidor local con ALLOW_TEST_PAYMENTS=1.
    const liveMode = !(process.env.ALLOW_TEST_PAYMENTS === '1' && body.test === true);

    const pago = await createPaidInvoice({
      contactId,
      items: [{ name: nombre, amount: precio, qty: 1, productId: body.productId || undefined, priceId: body.priceId || undefined }],
      discountPercent: 0,
      amount: null, // el paquete se paga completo
      method: body.method,
      notes: `Paquete: ${nombre} (${sesionesTotal} sesiones)${body.notes ? ' — ' + String(body.notes).trim() : ''}`,
      liveMode,
    });

    const ahora = new Date().toISOString();
    const noteBody = `${HC_PAQUETE_PREFIX}${JSON.stringify({
      nombre,
      sesionesTotal,
      precio,
      fechaCompra: ahora,
      venceEl: addMonths(ahora, meses),
      invoiceId: pago.invoiceId,
    })}`;
    let paqueteId: string | undefined;
    try {
      const created = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes`, { method: 'POST', body: JSON.stringify({ body: noteBody }) });
      paqueteId = created.note?.id;
    } catch (err: any) {
      return NextResponse.json(
        { error: `El pago se registró (factura ${pago.invoiceId}) pero no se pudo crear el paquete: ${err?.message || 'error'}. Avisa al administrador.` },
        { status: 502 }
      );
    }

    if (body.primeraSesion !== false && paqueteId) {
      const visita = `${HC_NOTE_PREFIX}${JSON.stringify({
        fecha: ahora,
        tratamiento: nombre,
        pieza: String(body.zona || '').trim(),
        material: String(body.producto || '').trim(),
        cargo: 0,
        pago: 0,
        paqueteId,
      })}`;
      await ghlFetch(`/contacts/${contactId}/notes`, { method: 'POST', body: JSON.stringify({ body: visita }) });
    }

    await logEvent('paquete_vendido', `paciente ${contactId}: ${nombre} (${sesionesTotal} sesiones, ${precio})`);
    return NextResponse.json({ ok: true, paqueteId, invoiceId: pago.invoiceId });
  } catch (err: any) {
    const status = err instanceof PaymentError ? err.status : 502;
    return NextResponse.json({ error: err?.message || 'No se pudo vender el paquete' }, { status });
  }
}
