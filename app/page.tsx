'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WhatsAppButton, EmailButton } from './components/ContactActions';
import WeekCalendar from './components/WeekCalendar';
import RecentMessages from './components/RecentMessages';
import DateWeatherQuote from './components/DateWeatherQuote';
import UserBadge from './components/UserBadge';
import ChatWidget from './components/ChatWidget';
import UserProfileCard from './components/UserProfileCard';

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  dateAdded: string | null;
  ultimaActividad: string | null;
  numeroHistoriaClinica: string;
};

type SortField = 'nombre' | 'apellido' | 'telefono' | 'email' | 'etiquetas' | 'ultimaVez';
type SortDir = 'asc' | 'desc';

const AUTO_REFRESH_MS = 60_000;
const PAGE_SIZE = 12;

const TAGS_COLLAPSED_LIMIT = 3;

function TagList({ tags }: { tags: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (tags.length === 0) return <>—</>;
  const visible = expanded ? tags : tags.slice(0, TAGS_COLLAPSED_LIMIT);
  const hidden = tags.length - visible.length;
  return (
    <span className="tag-list">
      {visible.map((t) => <span key={t} className="tag">{t}</span>)}
      {hidden > 0 && (
        <button type="button" className="tag tag-more" onClick={(e) => { e.stopPropagation(); setExpanded(true); }}>
          +{hidden}
        </button>
      )}
      {expanded && tags.length > TAGS_COLLAPSED_LIMIT && (
        <button type="button" className="tag tag-more" onClick={(e) => { e.stopPropagation(); setExpanded(false); }}>
          ocultar
        </button>
      )}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Dashboard() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  // Por defecto se ve primero la actividad más reciente (última nota, cita,
  // formulario o edición) - el servidor ya entrega los contactos en ese
  // orden, y este estado solo mantiene la flecha del encabezado consistente.
  const [sortField, setSortField] = useState<SortField | null>('ultimaVez');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchPatients = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/patients', window.location.origin);
      if (q) url.searchParams.set('q', q);
      url.searchParams.set('limit', String(PAGE_SIZE));
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar la lista de pacientes');
      setPatients(data.contacts);
      setNextCursor(data.nextCursor || null);
      setTotal(data.total ?? null);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const url = new URL('/api/patients', window.location.origin);
      if (query) url.searchParams.set('q', query);
      url.searchParams.set('limit', String(PAGE_SIZE));
      url.searchParams.set('cursor', nextCursor);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar más pacientes');
      setPatients((prev) => [...prev, ...data.contacts]);
      setNextCursor(data.nextCursor || null);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, query]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchPatients(query || undefined), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, fetchPatients, query]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onQueryChange(value: string) {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchPatients(value || undefined), 400);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'etiquetas' || field === 'ultimaVez' ? 'desc' : 'asc');
    }
  }

  const sortedPatients = useMemo(() => {
    if (!sortField) return patients;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...patients].sort((a, b) => {
      if (sortField === 'etiquetas') return (a.tags.length - b.tags.length) * dir;
      if (sortField === 'ultimaVez') {
        const at = a.ultimaActividad ? new Date(a.ultimaActividad).getTime() : 0;
        const bt = b.ultimaActividad ? new Date(b.ultimaActividad).getTime() : 0;
        return (at - bt) * dir;
      }
      const field = { nombre: 'firstName', apellido: 'lastName', telefono: 'phone', email: 'email' }[sortField] as
        | 'firstName'
        | 'lastName'
        | 'phone'
        | 'email';
      return a[field].localeCompare(b[field], 'es') * dir;
    });
  }, [patients, sortField, sortDir]);

  function sortIndicator(field: SortField) {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  return (
    <div className="page page-home">
      <ChatWidget />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <Link href="/perfil" className="app-title-link">Virtual Doctor</Link>
        <UserBadge />
      </div>
      <div className="brand-header">
        <img src="/clinic-logo.png" alt="Logo" className="brand-logo" />
        <div className="brand-info">
          <div className="brand-name">{process.env.NEXT_PUBLIC_CLINIC_NAME}</div>
          <div className="brand-meta">
            {process.env.NEXT_PUBLIC_CLINIC_ADDRESS} · {process.env.NEXT_PUBLIC_CLINIC_PHONE} ·{' '}
            <a href={process.env.NEXT_PUBLIC_CLINIC_WEBSITE} target="_blank" rel="noreferrer">
              {process.env.NEXT_PUBLIC_CLINIC_WEBSITE}
            </a>
          </div>
        </div>
      </div>

      <div className="main-layout">
        <aside className="side-col">
          <UserProfileCard />
          <RecentMessages />
        </aside>

        <div className="center-col">
          <div className="header">
            <div>
              <h1>Menú Principal</h1>
              <div className="sub">Datos en vivo desde GoHighLevel</div>
            </div>
            <div className="controls">
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono…"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
              />
              <label className="auto">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-actualizar
              </label>
              <button className="primary" onClick={() => fetchPatients(query || undefined)} disabled={loading}>
                {loading ? 'Actualizando…' : 'Refrescar'}
              </button>
            </div>
          </div>

          <div className="cta-row">
            <Link href="/formulario" target="_blank" className="cta cta-form">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 11v6M9 14h6" /></svg>
              <span>Formulario<small>Nuevo paciente</small></span>
            </Link>
            <Link href="/setup" className="cta cta-setup">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
              <span>Setup<small>Acceso protegido</small></span>
            </Link>
          </div>

          <div className={`status-line ${error ? 'error' : ''}`}>
            {error
              ? `Error: ${error}`
              : lastUpdated
              ? `Mostrando ${patients.length}${total !== null ? ` de ${total}` : ''} paciente(s) · última actualización ${lastUpdated.toLocaleTimeString('es')}`
              : 'Cargando…'}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>HC</th>
                  <th className="sortable" onClick={() => toggleSort('nombre')}>Nombre{sortIndicator('nombre')}</th>
                  <th className="sortable" onClick={() => toggleSort('apellido')}>Apellido{sortIndicator('apellido')}</th>
                  <th className="sortable" onClick={() => toggleSort('telefono')}>Teléfono{sortIndicator('telefono')}</th>
                  <th className="sortable" onClick={() => toggleSort('email')}>Email{sortIndicator('email')}</th>
                  <th className="sortable" onClick={() => toggleSort('etiquetas')}>Etiquetas{sortIndicator('etiquetas')}</th>
                  <th className="sortable" onClick={() => toggleSort('ultimaVez')}>Última actividad{sortIndicator('ultimaVez')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedPatients.map((p) => (
                  <tr key={p.id} onClick={() => router.push(`/patients/${p.id}`)}>
                    <td className="hc-number">{p.numeroHistoriaClinica}</td>
                    <td>{p.firstName || '—'}</td>
                    <td>{p.lastName || '—'}</td>
                    <td>{p.phone || '—'}{p.phone && <WhatsAppButton phone={p.phone} />}</td>
                    <td>{p.email || '—'}{p.email && <EmailButton email={p.email} />}</td>
                    <td><TagList tags={p.tags} /></td>
                    <td>{formatDate(p.ultimaActividad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && patients.length === 0 && !error && (
              <div className="empty">No se encontraron pacientes.</div>
            )}
          </div>

          {nextCursor && (
            <div className="load-more-wrap">
              <button type="button" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Cargando…' : 'Cargar más'}
              </button>
            </div>
          )}
        </div>

        <aside className="side-col">
          <DateWeatherQuote />
          <WeekCalendar />
        </aside>
      </div>
    </div>
  );
}
