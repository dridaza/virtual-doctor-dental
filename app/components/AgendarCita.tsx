'use client';

import { useEffect, useState } from 'react';

type Calendar = { id: string; name: string; duracionMin: number };
type Dia = { fecha: string; slots: string[] };

function labelDia(fecha: string) {
  const d = new Date(`${fecha}T12:00:00`);
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
}

function labelHora(iso: string) {
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : iso;
}

export default function AgendarCita({
  patientId,
  patientName,
  onClose,
  onDone,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [calendarId, setCalendarId] = useState('');
  const [dias, setDias] = useState<Dia[]>([]);
  const [fecha, setFecha] = useState('');
  const [slot, setSlot] = useState('');
  const [loadingCal, setLoadingCal] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState('');
  const [custom, setCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');

  useEffect(() => {
    fetch('/api/calendars')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setCalendars(d.calendars || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingCal(false));
  }, []);

  useEffect(() => {
    setDias([]);
    setFecha('');
    setSlot('');
    if (!calendarId) return;
    setLoadingSlots(true);
    setError(null);
    fetch(`/api/calendars/${calendarId}/slots?days=21`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDias(d.dias || []);
        if (d.dias?.length) setFecha(d.dias[0].fecha);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSlots(false));
  }, [calendarId]);

  async function agendar() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId, startTime: custom ? new Date(customStart).toISOString() : slot, notes, custom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo agendar');
      setSuccess(true);
      onDone();
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  const slotsDelDia = dias.find((d) => d.fecha === fecha)?.slots || [];

  return (
    <div className="modal-overlay overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>Agendar cita para {patientName}</h2>
        </div>

        {success ? (
          <>
            <p className="hint">Cita agendada y confirmada. Ya aparece en Citas, Seguimiento y Facturación.</p>
            <div className="modal-actions">
              <button type="button" className="primary" onClick={onClose}>Listo</button>
            </div>
          </>
        ) : (
          <>
            <label className="field">
              <span>Tipo de cita</span>
              <select value={calendarId} onChange={(e) => setCalendarId(e.target.value)} disabled={loadingCal}>
                <option value="">{loadingCal ? 'Cargando…' : 'Elige un calendario'}</option>
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.duracionMin} min)</option>
                ))}
              </select>
            </label>

            {calendarId && (
              <div style={{ marginTop: 10 }}>
                <button type="button" className={custom ? "tint-violet" : ""} onClick={() => { setCustom((v) => !v); setSlot(""); }}>
                  {custom ? "Usar horarios libres" : "Personalizar horario"}
                </button>
              </div>
            )}

            {custom && (
              <label className="field" style={{ marginTop: 10 }}>
                <span>Fecha y hora personalizadas</span>
                <input id="cita-custom" type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </label>
            )}

            {loadingSlots && !custom && <div className="empty">Buscando horarios libres…</div>}
            {!loadingSlots && !custom && calendarId && dias.length === 0 && !error && (
              <div className="empty">No hay horarios libres en los próximos 21 días.</div>
            )}

            {!custom && dias.length > 0 && (
              <>
                <div className="tabs" style={{ marginTop: 12, overflowX: 'auto' }}>
                  {dias.map((d) => (
                    <button
                      key={d.fecha}
                      type="button"
                      className={d.fecha === fecha ? 'active' : ''}
                      onClick={() => { setFecha(d.fecha); setSlot(''); }}
                    >
                      {labelDia(d.fecha)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
                  {slotsDelDia.map((s) => (
                    <button key={s} type="button" className={s === slot ? 'primary' : ''} onClick={() => setSlot(s)}>
                      {labelHora(s)}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label className="field" style={{ marginTop: 10 }}>
              <span>Notas</span>
              <textarea id="cita-notas" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motivo, indicaciones, recordatorios…" />
            </label>

            {error && <p className="status-line error">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="button" className="primary" onClick={agendar} disabled={!calendarId || (custom ? !customStart : !slot) || saving}>
                {saving ? 'Agendando…' : 'Agendar cita'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
