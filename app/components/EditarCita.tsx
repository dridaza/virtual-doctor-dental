'use client';

import { useEffect, useState } from 'react';

type Dia = { fecha: string; slots: string[] };
export type CitaEditable = { id: string; title: string; contactId: string; calendarId?: string; startTime: string; status: string };

const ESTADOS: [string, string][] = [
  ['confirmed', 'Confirmada'],
  ['new', 'Nueva'],
  ['showed', 'Asistió'],
  ['noshow', 'No asistió'],
  ['cancelled', 'Cancelada'],
];

const labelDia = (f: string) => new Date(`${f}T12:00:00`).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
const labelHora = (iso: string) => iso.match(/T(\d{2}):(\d{2})/)?.slice(1, 3).join(':') || iso;
const TZ = 'America/Mexico_City';

// Ventana al hacer clic en una cita: abrir la ficha, moverla a otro horario o cambiar su estado.
export default function EditarCita({ cita, onClose, onOpenPatient, onSaved }: { cita: CitaEditable; onClose: () => void; onOpenPatient: (id: string) => void; onSaved: () => void }) {
  const [dias, setDias] = useState<Dia[]>([]);
  const [fecha, setFecha] = useState('');
  const [slot, setSlot] = useState('');
  const [custom, setCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [status, setStatus] = useState(cita.status || 'confirmed');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cita.calendarId) return;
    setLoading(true);
    fetch(`/api/calendars/${cita.calendarId}/slots?days=21`)
      .then((r) => r.json())
      .then((d) => {
        setDias(d.dias || []);
        if (d.dias?.length) setFecha(d.dias[0].fecha);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cita.calendarId]);

  const nuevoInicio = custom ? (customStart ? new Date(customStart).toISOString() : '') : slot;
  const cambioEstado = status !== (cita.status || 'confirmed');

  async function guardar() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/calendar/events/${cita.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(nuevoInicio ? { startTime: nuevoInicio, custom } : {}), ...(cambioEstado ? { appointmentStatus: status } : {}) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo guardar');
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  const slotsDelDia = dias.find((d) => d.fecha === fecha)?.slots || [];
  const actual = new Date(cita.startTime).toLocaleString('es', { dateStyle: 'full', timeStyle: 'short', timeZone: TZ });

  return (
    <div className="modal-overlay overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header"><h2>{cita.title || 'Cita'}</h2></div>
        <p className="hint">Ahora: {actual}</p>
        <div style={{ marginBottom: 10 }}>
          <button type="button" onClick={() => onOpenPatient(cita.contactId)}>Abrir ficha del paciente</button>
        </div>

        <label className="field"><span>Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>

        <div style={{ marginTop: 12 }}>
          <strong>Mover a otro horario</strong>
          {cita.calendarId && (
            <div style={{ marginTop: 6 }}>
              <button type="button" className={custom ? 'tint-violet' : ''} onClick={() => { setCustom((v) => !v); setSlot(''); }}>
                {custom ? 'Usar horarios libres' : 'Personalizar horario'}
              </button>
            </div>
          )}
          {custom && (
            <label className="field" style={{ marginTop: 8 }}><span>Nueva fecha y hora</span>
              <input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </label>
          )}
          {!custom && loading && <div className="empty">Buscando horarios libres…</div>}
          {!custom && !loading && dias.length === 0 && <p className="hint">No hay horarios libres en los próximos 21 días. Usa "Personalizar horario".</p>}
          {!custom && dias.length > 0 && (
            <>
              <div className="tabs" style={{ marginTop: 10, overflowX: 'auto' }}>
                {dias.map((d) => (
                  <button key={d.fecha} type="button" className={d.fecha === fecha ? 'active' : ''} onClick={() => { setFecha(d.fecha); setSlot(''); }}>
                    {labelDia(d.fecha)}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0' }}>
                {slotsDelDia.map((s) => (
                  <button key={s} type="button" className={s === slot ? 'primary' : ''} onClick={() => setSlot(s)}>{labelHora(s)}</button>
                ))}
              </div>
            </>
          )}
          {nuevoInicio && <p className="hint">Al guardar, GHL avisará al paciente del cambio si el calendario lo tiene configurado.</p>}
        </div>

        {error && <p className="status-line error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={saving}>Cerrar</button>
          <button type="button" className="primary" onClick={guardar} disabled={saving || (!nuevoInicio && !cambioEstado)}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
