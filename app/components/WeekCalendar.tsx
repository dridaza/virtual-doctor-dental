'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type Event = {
  id: string;
  title: string;
  contactId: string;
  startTime: string;
  endTime: string;
  status: string;
  dateKey: string;
};

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TIMEZONE = 'America/Mexico_City';

function useWeek(offset: number) {
  const [events, setEvents] = useState<Event[]>([]);
  const [dayKeys, setDayKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar/week?offset=${offset}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setEvents(d.events || []);
        setDayKeys(d.days || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [offset]);

  // Cada día se identifica por su fecha YYYY-MM-DD ya calculada en el
  // servidor en la zona horaria de la clínica, así que aquí solo se compara
  // texto - sin reconstruir fechas con el huso horario del navegador.
  const days = dayKeys.map((ymd, i) => ({
    label: DIAS[i],
    dayNumber: Number(ymd.split('-')[2]),
    events: events.filter((e) => e.dateKey === ymd),
  }));

  return { days, loading, error };
}

function DayColumn({ day, onSelect }: { day: { label: string; dayNumber: number; events: Event[] }; onSelect: (id: string) => void }) {
  return (
    <div className="week-day">
      <div className="week-day-header">
        {day.label} <span>{day.dayNumber}</span>
      </div>
      {day.events.length === 0 ? (
        <div className="week-empty">—</div>
      ) : (
        day.events.map((ev) => (
          <button
            key={ev.id}
            type="button"
            className={`week-event status-${ev.status}`}
            onClick={() => onSelect(ev.contactId)}
            title={ev.title}
          >
            <span className="week-event-time">
              {new Date(ev.startTime).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE })}
            </span>
            <span className="week-event-title">{ev.title}</span>
          </button>
        ))
      )}
    </div>
  );
}

export default function WeekCalendar() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [offset, setOffset] = useState(0);
  const { days, loading, error } = useWeek(offset);
  const select = (id: string) => router.push(`/patients/${id}`);

  return (
    <div className="card">
      <button type="button" className="mobile-launch mobile-cal" onClick={() => setExpanded(true)}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
        <span>Calendario</span>
      </button>
      <div className="card-header-row">
        <h3>Calendario de la semana</h3>
        <button type="button" className="expand-btn" onClick={() => setExpanded(true)} title="Agrandar">⤢</button>
      </div>
      {loading && <div className="empty">Cargando…</div>}
      {error && <div className="status-line error">Error: {error}</div>}
      {!loading && !error && (
        <div className="week-grid">
          {days.map((day) => <DayColumn key={day.label} day={day} onSelect={select} />)}
        </div>
      )}

      {expanded && createPortal(
        <div className="overlay modal-overlay" onClick={() => setExpanded(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button type="button" className="back-link modal-back" onClick={() => setExpanded(false)}>← Volver</button>
              <h2>Calendario de la semana</h2>
              <div className="week-nav">
                <button type="button" onClick={() => setOffset((o) => o - 1)}>◀ Semana anterior</button>
                <button type="button" onClick={() => setOffset(0)} disabled={offset === 0}>Hoy</button>
                <button type="button" onClick={() => setOffset((o) => o + 1)}>Semana siguiente ▶</button>
              </div>
            </div>
            {loading && <div className="empty">Cargando…</div>}
            {error && <div className="status-line error">Error: {error}</div>}
            {!loading && !error && (
              <div className="week-grid-modal">
                {days.map((day) => <DayColumn key={day.label} day={day} onSelect={select} />)}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
