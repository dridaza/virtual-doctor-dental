'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import FacturacionGate from '../components/FacturacionGate';
import SecurityCard from '../components/SecurityCard';

type FacturaRow = {
  contactId: string;
  contactName: string;
  fecha: string;
  tratamiento: string;
  cargo: number;
  pago: number;
};

const CACHE_KEY = 'vd_facturacion_cache_v1';
const DAYS = 30;

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es', { dateStyle: 'medium' });
}

function isInRange(fecha: string, range: 'hoy' | 'semana' | 'mes'): boolean {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (range === 'hoy') return d.toDateString() === now.toDateString();
  if (range === 'semana') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo && d <= now;
  }
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function dayKey(fecha: string): string | null {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function DailyIncomeChart({ days }: { days: { key: string; label: string; total: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.total));
  const width = 760;
  const height = 180;
  const gap = 3;
  const barWidth = (width - gap * (days.length - 1)) / days.length;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height + 24}`} className="income-chart" role="img" aria-label="Ingresos diarios de los últimos 30 días">
        {days.map((d, i) => {
          const h = (d.total / max) * height;
          const x = i * (barWidth + gap);
          const y = height - h;
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((v) => (v === i ? null : v))}>
              <rect x={x} y={0} width={barWidth} height={height} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(h, d.total > 0 ? 2 : 0)}
                rx={Math.min(3, barWidth / 2)}
                fill={hover === i ? 'var(--accent)' : 'var(--accent)'}
                opacity={hover === i ? 1 : 0.75}
              />
              {(i === 0 || i === days.length - 1 || i % 7 === 0) && (
                <text x={x + barWidth / 2} y={height + 16} textAnchor="middle" fontSize="9" fill="var(--text-dim)">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tooltip" style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}>
          <strong>{days[hover].label}</strong>
          <div>{money(days[hover].total)}</div>
        </div>
      )}
    </div>
  );
}

function FacturacionContent() {
  const [rows, setRows] = useState<FacturaRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setProgress(0);
    setLoadedFromCache(false);
    const collected: FacturaRow[] = [];
    let cursor: string | null = null;
    let processed = 0;
    try {
      do {
        const url = new URL('/api/facturacion', window.location.origin);
        if (cursor) url.searchParams.set('cursor', cursor);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la facturación');
        collected.push(...(data.rows || []));
        processed += data.processed || 0;
        setProgress(processed);
        setRows([...collected]);
        cursor = data.nextCursor;
      } while (cursor);
      const now = new Date();
      setLastUpdated(now);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rows: collected, savedAt: now.toISOString() }));
      } catch {
        // sessionStorage no disponible; no afecta el resultado en pantalla
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        setRows(cached.rows || []);
        setLastUpdated(new Date(cached.savedAt));
        setLoadedFromCache(true);
      }
    } catch {
      // sin caché disponible; el usuario puede pulsar "Actualizar"
    }
  }, []);

  const totalHistorico = useMemo(() => rows.reduce((s, r) => s + r.pago, 0), [rows]);
  const totalHoy = useMemo(() => rows.filter((r) => isInRange(r.fecha, 'hoy')).reduce((s, r) => s + r.pago, 0), [rows]);
  const totalSemana = useMemo(() => rows.filter((r) => isInRange(r.fecha, 'semana')).reduce((s, r) => s + r.pago, 0), [rows]);
  const totalMes = useMemo(() => rows.filter((r) => isInRange(r.fecha, 'mes')).reduce((s, r) => s + r.pago, 0), [rows]);

  const dailyTotals = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of rows) {
      const key = dayKey(r.fecha);
      if (!key) continue;
      byDay.set(key, (byDay.get(key) || 0) + r.pago);
    }
    const days: { key: string; label: string; total: number }[] = [];
    const now = new Date();
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: d.toLocaleDateString('es', { day: '2-digit', month: 'short' }), total: byDay.get(key) || 0 });
    }
    return days;
  }, [rows]);

  const byPatient = useMemo(() => {
    const map = new Map<string, { contactId: string; contactName: string; total: number }>();
    for (const r of rows) {
      const entry = map.get(r.contactId) || { contactId: r.contactId, contactName: r.contactName, total: 0 };
      entry.total += r.pago;
      map.set(r.contactId, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 15);
  }, [rows]);

  const recentRows = useMemo(
    () => [...rows].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 50),
    [rows]
  );

  return (
    <div className="page">
      <div className="header">
        <div>
          <Link href="/" className="back-link">← Volver</Link>
          <h1>Facturación de la clínica</h1>
          <div className="sub">
            {lastUpdated
              ? `${loadedFromCache ? 'Última actualización (guardada)' : 'Actualizado'}: ${lastUpdated.toLocaleString('es')}`
              : 'Aún no se ha calculado'}
          </div>
        </div>
        <div className="controls">
          <button type="button" className="primary" onClick={runScan} disabled={scanning}>
            {scanning ? `Procesando ${progress} pacientes…` : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <div className="status-line error">Error: {error}</div>}

      {rows.length === 0 && !scanning && !error && (
        <div className="empty">
          Pulsa "Actualizar" para calcular los ingresos de todos los pacientes. Recorre todos los contactos de la
          clínica, puede tardar entre 30 y 90 segundos.
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="income-stats" style={{ marginBottom: 20 }}>
            <div className="income-stat">
              <div className="income-stat-label">Total histórico</div>
              <div className="income-stat-value">{money(totalHistorico)}</div>
            </div>
            <div className="income-stat">
              <div className="income-stat-label">Hoy</div>
              <div className="income-stat-value">{money(totalHoy)}</div>
            </div>
            <div className="income-stat">
              <div className="income-stat-label">Esta semana</div>
              <div className="income-stat-value">{money(totalSemana)}</div>
            </div>
            <div className="income-stat">
              <div className="income-stat-label">Este mes</div>
              <div className="income-stat-value">{money(totalMes)}</div>
            </div>
          </div>

          <div className="card">
            <h3>Ingresos diarios — últimos 30 días</h3>
            <DailyIncomeChart days={dailyTotals} />
          </div>

          <div className="card">
            <h3>Pacientes con más ingresos</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Paciente</th><th>Total pagado</th></tr>
                </thead>
                <tbody>
                  {byPatient.map((p) => (
                    <tr key={p.contactId} onClick={() => (window.location.href = `/patients/${p.contactId}`)}>
                      <td>{p.contactName}</td>
                      <td>{money(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3>Transacciones más recientes</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Paciente</th><th>Concepto</th><th>Cargo</th><th>Pago</th></tr>
                </thead>
                <tbody>
                  {recentRows.map((r, i) => (
                    <tr key={i} onClick={() => (window.location.href = `/patients/${r.contactId}`)}>
                      <td>{formatDate(r.fecha)}</td>
                      <td>{r.contactName}</td>
                      <td>{r.tratamiento || '—'}</td>
                      <td>{r.cargo ? money(r.cargo) : '—'}</td>
                      <td>{r.pago ? money(r.pago) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SecurityCard />
    </div>
  );
}

export default function FacturacionPage() {
  return (
    <FacturacionGate>
      <FacturacionContent />
    </FacturacionGate>
  );
}
