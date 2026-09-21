import { ghlFetch, HC_NOTE_PREFIX, HC_PAQUETE_PREFIX } from './ghl';

// Un paquete de sesiones (por ejemplo "6 sesiones de hidratación facial"). Se guarda como una nota del
// paciente en GHL; las sesiones usadas son las visitas de Seguimiento ligadas al paquete (`paqueteId`).
export type Paquete = {
  id: string;
  nombre: string;
  sesionesTotal: number;
  precio: number;
  fechaCompra: string;
  venceEl: string;
  invoiceId?: string;
  sesionesUsadas: number;
  estado: 'activo' | 'completado' | 'vencido';
  diasRestantes: number;
};

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function estadoDe(usadas: number, total: number, venceEl: string): Pick<Paquete, 'estado' | 'diasRestantes'> {
  const dias = Math.ceil((new Date(venceEl).getTime() - Date.now()) / 86400000);
  if (usadas >= total) return { estado: 'completado', diasRestantes: dias };
  if (dias < 0) return { estado: 'vencido', diasRestantes: dias };
  return { estado: 'activo', diasRestantes: dias };
}

// Paquetes del paciente con su conteo de sesiones, calculado a partir de las notas.
export function paquetesDeNotas(notes: any[]): Paquete[] {
  const usadas = new Map<string, number>();
  for (const n of notes) {
    if (typeof n.body !== 'string' || !n.body.startsWith(HC_NOTE_PREFIX)) continue;
    try {
      const data = JSON.parse(n.body.slice(HC_NOTE_PREFIX.length));
      if (data.paqueteId) usadas.set(String(data.paqueteId), (usadas.get(String(data.paqueteId)) || 0) + 1);
    } catch {
      /* nota ilegible: se ignora */
    }
  }

  const result: Paquete[] = [];
  for (const n of notes) {
    if (typeof n.body !== 'string' || !n.body.startsWith(HC_PAQUETE_PREFIX)) continue;
    try {
      const d = JSON.parse(n.body.slice(HC_PAQUETE_PREFIX.length));
      const total = Math.max(1, Number(d.sesionesTotal || 1));
      const venceEl = String(d.venceEl || '');
      const used = usadas.get(n.id) || 0;
      result.push({
        id: n.id,
        nombre: String(d.nombre || 'Paquete'),
        sesionesTotal: total,
        precio: Number(d.precio || 0),
        fechaCompra: String(d.fechaCompra || n.dateAdded || ''),
        venceEl,
        invoiceId: d.invoiceId ? String(d.invoiceId) : undefined,
        sesionesUsadas: used,
        ...estadoDe(used, total, venceEl),
      });
    } catch {
      /* nota ilegible: se ignora */
    }
  }
  return result.sort((a, b) => new Date(b.fechaCompra).getTime() - new Date(a.fechaCompra).getTime());
}

export async function loadPaquetes(contactId: string): Promise<Paquete[]> {
  const data = await ghlFetch<{ notes: any[] }>(`/contacts/${contactId}/notes`);
  return paquetesDeNotas(data.notes || []);
}
