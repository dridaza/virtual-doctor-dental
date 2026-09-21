'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type UserMetrics = {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  enLinea: boolean;
  ultimaActividad: string | null;
  ultimoAcceso: string | null;
  minutosEnLinea: number;
  minutosHoy: number;
  diasActivos: number;
  enLineaPorDia: { dia: string; min: number }[];
  mensajes: { manual: number; viaApi: number; automatizados: number; conversaciones: number };
  respuestaMedianaMin: number | null;
  respuestasMedidas: number;
  acciones: Record<string, number>;
};

const ACCION_LABEL: Record<string, string> = {
  login: 'Inicios de sesión',
  logout: 'Cierres de sesión',
  '2fa_password_incorrecta': 'Contraseñas de seguridad incorrectas',
  '2fa_codigo_incorrecto': 'Códigos 2FA incorrectos',
  password_reseteada: 'Contraseñas restablecidas',
  perfil_usuario_actualizado: 'Perfil actualizado',
  login_fallido: 'Intentos fallidos',
  '2fa_desbloqueo': 'Verificaciones 2FA',
  seguimiento_agregado: 'Visitas registradas',
  seguimiento_editado: 'Visitas editadas',
  seguimiento_eliminado: 'Visitas eliminadas',
  recibo_enviado: 'Recibos enviados',
  cita_agendada: 'Citas agendadas',
  mensaje_enviado: 'Mensajes desde la app',
  formulario_enviado: 'Formularios enviados',
  backup_descargado: 'Backups descargados',
};

function fmtMin(min: number) {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

function fmtWhen(iso: string | null) {
  if (!iso) return 'Sin registro';
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' });
}

function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}

function DayBars({ data }: { data: { dia: string; min: number }[] }) {
  const max = Math.max(60, ...data.map((d) => d.min));
  const w = 520;
  const h = 120;
  const bw = w / data.length;
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${w} ${h + 22}`} style={{ width: '100%', minWidth: 320, height: 'auto' }} role="img" aria-label="Minutos en línea por día">
        {data.map((d, i) => {
          const bh = (d.min / max) * h;
          return (
            <g key={d.dia}>
              <title>{`${d.dia}: ${fmtMin(d.min)}`}</title>
              <rect x={i * bw + bw * 0.15} y={h - bh} width={bw * 0.7} height={Math.max(bh, d.min ? 2 : 0)} rx={3} fill="var(--accent)" opacity={d.min ? 1 : 0.2} />
              {(data.length <= 10 || i % 3 === 0) && (
                <text x={i * bw + bw / 2} y={h + 14} textAnchor="middle" fontSize="9" fill="var(--text-dim)">{d.dia.slice(5)}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function UsersMetrics() {
  const [days, setDays] = useState(7);
  const [users, setUsers] = useState<UserMetrics[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function resetPassword(u: UserMetrics) {
    if (!confirm('¿Restablecer la contraseña de ' + u.nombre + '? Tendrá que registrar una nueva al iniciar sesión.')) return;
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/users-metrics/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email }),
      });
      const d = await res.json();
      setResetMsg(res.ok ? d.message : d.error || 'No se pudo restablecer');
    } catch (e: any) {
      setResetMsg(e.message || 'Error desconocido');
    } finally {
      setResetting(false);
    }
  }

  const ordered = users ? [...users].sort((a, b) => {
    if (b.minutosEnLinea !== a.minutosEnLinea) return b.minutosEnLinea - a.minutosEnLinea;
    const wa = a.mensajes.manual + a.mensajes.viaApi + Object.values(a.acciones).reduce((x, y) => x + y, 0);
    const wb = b.mensajes.manual + b.mensajes.viaApi + Object.values(b.acciones).reduce((x, y) => x + y, 0);
    return wb - wa;
  }) : null;

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/users-metrics?days=${days}`)
      .then(async (r) => {
        const d = await r.json();
        if (r.status === 403) { setForbidden(true); return; }
        if (!r.ok) throw new Error(d.error || 'No se pudieron cargar las métricas');
        setUsers(d.users);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  if (forbidden) return null;
  const current = users?.find((u) => u.id === selected) || null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Usuarios</h2>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button type="button" className={days === 7 ? 'active' : ''} onClick={() => setDays(7)}>7 días</button>
          <button type="button" className={days === 30 ? 'active' : ''} onClick={() => setDays(30)}>30 días</button>
        </div>
      </div>
      <p className="hint">Ordenados de quien más trabaja a quien menos (tiempo en línea, luego mensajes y acciones). Actividad de cada persona dada de alta en GoHighLevel. El tiempo en línea cuenta solo cuando la pestaña está abierta y se usa activamente.</p>

      {loading && !users && <div className="empty">Calculando métricas…</div>}
      {error && <p className="status-line error">{error}</p>}

      {ordered && (
        <div className="cta-row user-grid">
          {ordered.map((u, i) => (
            <button key={u.id} type="button" className="cta cta-user" onClick={() => { setSelected(u.id); setResetMsg(null); }}>
              <span className="user-widget-avatar" style={{ width: 52, height: 52, borderRadius: 26 }}>{iniciales(u.nombre)}</span>
              <span>
                {i === 0 && u.minutosEnLinea > 0 ? "🏆 " : ""}{u.nombre}
                <small>{u.rol} · {u.enLinea ? 'En línea ahora' : `Hoy ${fmtMin(u.minutosHoy)}`}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {current && createPortal(
        <div className="modal-overlay overlay" onClick={() => setSelected(null)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h2>{current.nombre}</h2>
              <p className="hint" style={{ margin: 0 }}>{current.rol} · {current.email} · últimos {days} días</p>
            </div>

            <div className="income-stats" style={{ margin: '12px 0' }}>
              <div className="income-stat"><div className="income-stat-label">Tiempo en línea</div><div className="income-stat-value">{fmtMin(current.minutosEnLinea)}</div><div className="hint" style={{ margin: 0 }}>{current.diasActivos} día(s) activo(s)</div></div>
              <div className="income-stat"><div className="income-stat-label">Mensajes enviados</div><div className="income-stat-value">{current.mensajes.manual + current.mensajes.viaApi}</div><div className="hint" style={{ margin: 0 }}>{current.mensajes.manual} en GHL · {current.mensajes.viaApi} desde la app</div></div>
              <div className="income-stat"><div className="income-stat-label">Conversaciones atendidas</div><div className="income-stat-value">{current.mensajes.conversaciones}</div></div>
              <div className="income-stat"><div className="income-stat-label">Respuesta mediana</div><div className="income-stat-value">{current.respuestaMedianaMin === null ? '—' : fmtMin(current.respuestaMedianaMin)}</div><div className="hint" style={{ margin: 0 }}>{current.respuestasMedidas} respuesta(s) medida(s)</div></div>
            </div>

            <h3 style={{ margin: '8px 0 4px' }}>Minutos en línea por día</h3>
            <DayBars data={current.enLineaPorDia} />

            <h3 style={{ margin: '12px 0 4px' }}>Acciones en la app</h3>
            {Object.keys(current.acciones).length === 0 ? (
              <p className="hint">Sin acciones registradas en este periodo.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <tbody>
                    {Object.entries(current.acciones).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                      <tr key={k}><td>{ACCION_LABEL[k] || k}</td><td style={{ textAlign: 'right' }}>{v}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="hint" style={{ marginTop: 10 }}>
              Último acceso: {fmtWhen(current.ultimoAcceso)} · Última actividad: {fmtWhen(current.ultimaActividad)}
              {current.mensajes.automatizados > 0 && ` · ${current.mensajes.automatizados} mensajes automáticos (no cuentan como trabajo manual)`}
            </p>
            {resetMsg && <p className="status-line">{resetMsg}</p>}
            <div className="modal-actions">
              <button type="button" className="danger" onClick={() => resetPassword(current)} disabled={resetting}>{resetting ? "Restableciendo…" : "Restablecer contraseña"}</button>
              <button type="button" className="primary" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
