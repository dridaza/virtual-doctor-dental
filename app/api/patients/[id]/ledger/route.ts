import { editLockDays } from '@/lib/edit-lock';
import { loadPaquetes, paquetesDeNotas, Paquete } from '@/lib/paquetes';
import { logEvent } from '@/lib/audit-log';
import { NextResponse } from 'next/server';
import { cleanSoap, Soap } from '@/lib/soap';
import { ghlFetch, getLocationId, HC_NOTE_PREFIX, HC_ANNOTATION_PREFIX } from '@/lib/ghl';

export const dynamic = 'force-dynamic';

type LedgerRow = {
  id: string;
  source: 'invoice' | 'nota' | 'cita' | 'estimate';
  fecha: string | null;
  tratamiento: string;
  pieza: string;
  material: string;
  cargo: number;
  pago: number;
  estado?: string;
  notaTexto?: string;
  notaId?: string;
  citaId?: string;
  citaTitulo?: string;
  paqueteId?: string;
  soap?: Soap;
  presupuesto?: number;
};

type Annotation = { noteId: string; refId: string; texto: string };

function parseHcNote(note: any): LedgerRow | null {
  if (typeof note.body !== 'string' || !note.body.startsWith(HC_NOTE_PREFIX)) return null;
  try {
    const data = JSON.parse(note.body.slice(HC_NOTE_PREFIX.length));
    return {
      id: note.id,
      source: 'nota',
      fecha: data.fecha || note.dateAdded || null,
      tratamiento: data.tratamiento || '',
      pieza: data.pieza || '',
      material: data.material || '',
      cargo: Number(data.cargo || 0),
      pago: Number(data.pago || 0),
      ...(data.citaId ? { citaId: String(data.citaId) } : {}),
      ...(data.paqueteId ? { paqueteId: String(data.paqueteId) } : {}),
      ...(cleanSoap(data.soap) ? { soap: cleanSoap(data.soap)! } : {}),
    };
  } catch {
    return null;
  }
}

function parseAnnotation(note: any): Annotation | null {
  if (typeof note.body !== 'string' || !note.body.startsWith(HC_ANNOTATION_PREFIX)) return null;
  try {
    const data = JSON.parse(note.body.slice(HC_ANNOTATION_PREFIX.length));
    if (!data.refId) return null;
    return { noteId: note.id, refId: data.refId, texto: data.texto || '' };
  } catch {
    return null;
  }
}

async function fetchInvoiceRows(contactId: string): Promise<LedgerRow[]> {
  const params = {
    altId: getLocationId(),
    altType: 'location',
    contactId,
    limit: '100',
    offset: '0',
    sortField: 'issueDate',
    sortOrder: 'ascend',
  };
  const qs = new URLSearchParams(params).toString();
  const data = await ghlFetch<{ invoices: any[] }>(`/invoices/?${qs}`);

  return (data.invoices || []).map((inv) => ({
    id: inv._id,
    source: 'invoice' as const,
    fecha: inv.issueDate || inv.createdAt || null,
    tratamiento: (inv.invoiceItems || []).map((it: any) => it.name).filter(Boolean).join(', ') || inv.name || 'Factura',
    pieza: '',
    material: '',
    cargo: Number(inv.invoiceTotal ?? inv.total ?? 0),
    pago: Number(inv.amountPaid ?? 0),
    estado: inv.status,
  }));
}

async function fetchNotes(contactId: string): Promise<{ noteRows: LedgerRow[]; annotations: Annotation[]; paquetes: Paquete[] }> {
  const data = await ghlFetch<{ notes: any[] }>(`/contacts/${contactId}/notes`);
  const notes = data.notes || [];
  const noteRows = notes.map(parseHcNote).filter((r): r is LedgerRow => r !== null);
  const annotations = notes.map(parseAnnotation).filter((a): a is Annotation => a !== null);
  return { noteRows, annotations, paquetes: paquetesDeNotas(notes) };
}

async function fetchEstimateRows(contactId: string): Promise<LedgerRow[]> {
  const qs = new URLSearchParams({ altId: getLocationId(), altType: 'location', contactId, limit: '100', offset: '0' }).toString();
  const data = await ghlFetch<{ estimates: any[] }>(`/invoices/estimate/list?${qs}`);
  return (data.estimates || [])
    .filter((e) => !e.deleted)
    .map((e) => ({
      id: e._id,
      source: 'estimate' as const,
      fecha: e.issueDate || e.createdAt || null,
      tratamiento: (e.items || []).map((it: any) => it.name?.trim()).filter(Boolean).join(', ') || e.title || 'Presupuesto',
      pieza: '',
      material: '',
      cargo: 0,
      pago: 0,
      presupuesto: Number(e.total || 0),
      estado: e.estimateStatus,
    }));
}

async function fetchAppointmentRows(contactId: string): Promise<LedgerRow[]> {
  let data: { events: any[] };
  try {
    data = await ghlFetch<{ events: any[] }>(`/contacts/${contactId}/appointments`);
  } catch {
    await new Promise((r) => setTimeout(r, 600));
    data = await ghlFetch<{ events: any[] }>(`/contacts/${contactId}/appointments`);
  }
  return (data.events || []).map((a) => ({
    id: a.id,
    source: 'cita' as const,
    fecha: a.startTime || a.dateAdded || null,
    tratamiento: a.title || 'Cita',
    pieza: '',
    material: '',
    cargo: 0,
    pago: 0,
    estado: a.appointmentStatus || a.status,
  }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const [invoicesRes, notesRes, appointmentsRes, estimatesRes] = await Promise.allSettled([
      fetchInvoiceRows(contactId),
      fetchNotes(contactId),
      fetchAppointmentRows(contactId),
      fetchEstimateRows(contactId),
    ]);

    const invoiceRows = invoicesRes.status === 'fulfilled' ? invoicesRes.value : [];
    const noteRows = notesRes.status === 'fulfilled' ? notesRes.value.noteRows : [];
    const annotations = notesRes.status === 'fulfilled' ? notesRes.value.annotations : [];
    const paquetes = notesRes.status === 'fulfilled' ? notesRes.value.paquetes : [];
    const appointmentRows = appointmentsRes.status === 'fulfilled' ? appointmentsRes.value : [];
    const estimateRows = estimatesRes.status === 'fulfilled' ? estimatesRes.value : [];

    const EDIT_WINDOW_MS = 45 * 86400000;
    const linked = new Set<string>();
    const dedupedNotes: LedgerRow[] = [];
    for (const n of noteRows) {
      if (n.citaId) {
        if (linked.has(n.citaId)) continue;
        linked.add(n.citaId);
      }
      dedupedNotes.push(n);
    }
    noteRows.length = 0;
    noteRows.push(...dedupedNotes);

    // Cada cita reciente (últimos 45 días, ya ocurrida o de hoy) genera sola su registro en blanco y editable.
    const now = Date.now();
    const toCreate = appointmentRows.filter((a) => {
      if (linked.has(a.id)) return false;
      if (/cancel|no.?show|invalid/i.test(a.estado || '')) return false;
      const t = new Date(a.fecha || 0).getTime();
      return t <= now + 86400000 && now - t <= EDIT_WINDOW_MS;
    });
    const created = await Promise.allSettled(
      toCreate.map(async (a) => {
        const noteBody = `${HC_NOTE_PREFIX}${JSON.stringify({ fecha: a.fecha, tratamiento: '', pieza: '', material: '', cargo: 0, pago: 0, citaId: a.id })}`;
        const res = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes`, { method: 'POST', body: JSON.stringify({ body: noteBody }) });
        return { a, id: res.note?.id as string };
      })
    );
    for (const r of created) {
      if (r.status !== 'fulfilled' || !r.value.id) continue;
      linked.add(r.value.a.id);
      noteRows.push({ id: r.value.id, source: 'nota', fecha: r.value.a.fecha, tratamiento: '', pieza: '', material: '', cargo: 0, pago: 0, citaId: r.value.a.id });
    }
    const visibleAppointments = appointmentRows.filter((a) => !linked.has(a.id));

    // El título de la cita ("[Qx] - Nombre", lo pone GHL) se guarda aparte de "tratamiento": ese campo
    // es lo que se hizo de verdad y lo llena el personal. Mientras esté vacío, el título ayuda a
    // identificar de qué cita es la nota en vez de un "Pendiente de llenar" sin más contexto.
    const tituloPorCitaId = new Map(appointmentRows.map((a) => [a.id, a.tratamiento]));
    for (const n of noteRows) {
      if (n.citaId && !n.tratamiento) {
        const titulo = tituloPorCitaId.get(n.citaId);
        if (titulo) n.citaTitulo = titulo;
      }
    }

    const annotationByRefId = new Map(annotations.map((a) => [a.refId, a]));
    for (const row of [...invoiceRows, ...visibleAppointments]) {
      const ann = annotationByRefId.get(row.id);
      if (ann) {
        row.notaTexto = ann.texto;
        row.notaId = ann.noteId;
      }
    }

    const rows = [...invoiceRows, ...noteRows, ...visibleAppointments, ...estimateRows].sort(
      (a, b) => new Date(a.fecha || 0).getTime() - new Date(b.fecha || 0).getTime()
    );

    let saldo = 0;
    const withSaldo = rows.map((r) => {
      saldo += r.cargo - r.pago;
      return { ...r, saldo };
    });

    return NextResponse.json({
      rows: withSaldo,
      paquetes,
      editLockDays: editLockDays(),
      saldoActual: saldo,
      invoicesError: invoicesRes.status === 'rejected' ? String(invoicesRes.reason?.message || invoicesRes.reason) : null,
      notesError: notesRes.status === 'rejected' ? String(notesRes.reason?.message || notesRes.reason) : null,
      appointmentsError: appointmentsRes.status === 'rejected' ? String(appointmentsRes.reason?.message || appointmentsRes.reason) : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo cargar el seguimiento' }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const body = await request.json();
    const fecha = body.fecha || new Date().toISOString();
    const tratamiento = String(body.tratamiento || '').trim();
    const pieza = String(body.pieza || '').trim();
    const material = String(body.material || '').trim();
    const cargo = Number(body.cargo || 0);
    const pago = Number(body.pago || 0);

    if (!tratamiento) {
      return NextResponse.json({ error: 'El tratamiento es obligatorio' }, { status: 400 });
    }

    // Sesión de un paquete: solo si el paquete existe, está activo (con sesiones disponibles y sin vencer).
    const paqueteId = body.paqueteId ? String(body.paqueteId) : '';
    if (paqueteId) {
      const paquete = (await loadPaquetes(contactId)).find((p) => p.id === paqueteId);
      if (!paquete) return NextResponse.json({ error: 'El paquete no existe' }, { status: 400 });
      if (paquete.estado === 'completado') return NextResponse.json({ error: 'Este paquete ya usó todas sus sesiones' }, { status: 400 });
      if (paquete.estado === 'vencido') return NextResponse.json({ error: 'Este paquete está vencido' }, { status: 400 });
    }

    const soap = cleanSoap(body.soap);
    const noteBody = `${HC_NOTE_PREFIX}${JSON.stringify({ fecha, tratamiento, pieza, material, cargo, pago, ...(paqueteId ? { paqueteId } : {}), ...(soap ? { soap } : {}) })}`;
    const data = await ghlFetch<{ note: any }>(`/contacts/${contactId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: noteBody }),
    });

    await logEvent('seguimiento_agregado', `paciente ${contactId}: ${tratamiento} cargo ${cargo} pago ${pago}`);
    return NextResponse.json({ note: data.note });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo guardar la visita' }, { status: 502 });
  }
}
