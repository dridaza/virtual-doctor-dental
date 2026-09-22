'use client';

import { useState } from 'react';

type Ev = { id: string; title: string; calendarId?: string; startTime: string; endTime: string; status: string };

const TZ = 'America/Mexico_City';
// México ya no usa horario de verano (desde 2022): la zona es UTC-06:00 todo el año.
const OFFSET = '-06:00';

function horaLocal(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ, hour12: false });
}

// Confirmación al soltar una cita sobre otro día: se puede ajustar la hora, y también la fecha por
// si el destino real está en otra semana o mes (el calendario solo muestra unos días a la vez).
export default function MoverCita({ ev, dateKey, dayLabel, allEvents, onClose, onMoved }: { ev: Ev; dateKey: string; dayLabel: string; allEvents: Ev[]; onClose: () => void; onMoved: () => void }) {
  const [fecha, setFecha] = useState(dateKey);
  const [hora, setHora] = useState(horaLocal(ev.startTime));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inicio = new Date(`${fecha}T${hora || '00:00'}:00${OFFSET}`);
  const valido = !Number.isNaN(inicio.getTime());
  const duracion = new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime();
  const fin = valido ? new Date(inicio.getTime() + duracion) : null;
  const choque = valido && fin
    ? allEvents.find((o) => o.id !== ev.id && o.calendarId === ev.calendarId && o.status !== 'cancelled' && new Date(o.startTime) < fin && new Date(o.endTime) > inicio)
    : undefined;

  async function mover() {
    if (!valido) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/calendar/events/${ev.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: inicio.toISOString(), custom: true }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo mover la cita');
      onMoved();
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  const antes = new Date(ev.startTime).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ });

  return (
    <div className="modal-overlay overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header"><h2>Mover cita</h2></div>
        <p style={{ margin: '0 0 6px' }}><strong>{ev.title}</strong></p>
        <p className="hint">De: {antes}</p>
        <p className="hint">A: soltaste la cita en {dayLabel}, pero puedes cambiar la fecha abajo (cualquier semana o mes).</p>
        <div className="grid2">
          <label className="field"><span>Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <label className="field"><span>Hora</span>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </label>
        </div>
        {choque && <p className="status-line error">Ya hay una cita en este calendario a esa hora: {choque.title}. Puedes moverla igual.</p>}
        <p className="hint">GHL avisará al paciente del cambio si el calendario lo tiene configurado.</p>
        {error && <p className="status-line error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="primary" onClick={mover} disabled={saving || !valido}>{saving ? 'Moviendo…' : 'Mover cita'}</button>
        </div>
      </div>
    </div>
  );
}
