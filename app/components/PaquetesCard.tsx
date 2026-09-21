'use client';

import { useEffect, useState } from 'react';

export type PaqueteUI = {
  id: string;
  nombre: string;
  sesionesTotal: number;
  precio: number;
  fechaCompra: string;
  venceEl: string;
  sesionesUsadas: number;
  estado: 'activo' | 'completado' | 'vencido';
  diasRestantes: number;
};

type Product = { id: string; priceId: string; name: string; amount: number };

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function fecha(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es', { dateStyle: 'medium' });
}

function nowLocalInput() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------- Vender un paquete (cobro completo en la primera sesión) ----------
function VenderPaquete({ patientId, patientName, onClose, onDone }: { patientId: string; patientName: string; onClose: () => void; onDone: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [nombre, setNombre] = useState('');
  const [sesiones, setSesiones] = useState('6');
  const [precio, setPrecio] = useState('');
  const [meses, setMeses] = useState('6');
  const [method, setMethod] = useState('cash');
  const [primera, setPrimera] = useState(true);
  const [zona, setZona] = useState('');
  const [producto, setProducto] = useState('');
  const [notes, setNotes] = useState('');
  const [picked, setPicked] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function pick(p: Product) {
    setPicked(p);
    setNombre(p.name);
    setPrecio(String(p.amount));
  }

  async function vender() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/paquetes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          sesionesTotal: Number(sesiones),
          precio: Number(precio),
          meses: Number(meses),
          method,
          notes,
          primeraSesion: primera,
          zona,
          producto,
          productId: picked && picked.name === nombre ? picked.id : undefined,
          priceId: picked && picked.name === nombre ? picked.priceId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo vender el paquete');
      setDone(`Paquete vendido y cobrado completo (${money(Number(precio))}).${primera ? ' Se registró la primera sesión.' : ''}`);
      onDone();
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  const valido = nombre.trim() && Number(sesiones) >= 1 && Number(precio) > 0;

  return (
    <div className="modal-overlay overlay" onClick={() => !saving && onClose()}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header"><h2>Vender paquete a {patientName}</h2></div>
        {done ? (
          <>
            <p className="hint">{done}</p>
            <div className="modal-actions"><button type="button" className="primary" onClick={onClose}>Listo</button></div>
          </>
        ) : (
          <>
            <p className="hint">Elige un producto de tu catálogo o escribe el nombre. El paquete se cobra completo en la primera sesión.</p>
            <input id="paq-buscar" type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={loading ? 'Cargando productos…' : 'Buscar producto…'} style={{ marginBottom: 8 }} />
            <div className="product-chips">
              {products.filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase())).map((p) => (
                <button key={p.id} type="button" className={'product-chip' + (picked?.id === p.id ? ' on' : '')} onClick={() => pick(p)}>
                  <span className="product-chip-name">{p.name}</span>
                  <span className="product-chip-price">{money(p.amount)}</span>
                </button>
              ))}
            </div>

            <label className="field"><span>Nombre del paquete</span>
              <input id="paq-nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. 6 sesiones de hidratación facial" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 10 }}>
              <label className="field"><span>Sesiones</span><input id="paq-sesiones" type="number" min={1} max={100} value={sesiones} onChange={(e) => setSesiones(e.target.value)} /></label>
              <label className="field"><span>Precio total</span><input id="paq-precio" type="number" min={0} step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} /></label>
              <label className="field"><span>Vigencia (meses)</span><input id="paq-meses" type="number" min={1} max={24} value={meses} onChange={(e) => setMeses(e.target.value)} /></label>
              <label className="field"><span>Forma de pago</span>
                <select id="paq-metodo" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="bank_transfer">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Otro</option>
                </select>
              </label>
            </div>
            <label className="checkbox" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={primera} onChange={(e) => setPrimera(e.target.checked)} /> Registrar la primera sesión ahora
            </label>
            {primera && (
              <div className="grid2" style={{ marginTop: 6 }}>
                <label className="field"><span>Zona (primera sesión)</span><input id="paq-zona" type="text" value={zona} onChange={(e) => setZona(e.target.value)} /></label>
                <label className="field"><span>Producto / equipo</span><input id="paq-producto" type="text" value={producto} onChange={(e) => setProducto(e.target.value)} /></label>
              </div>
            )}
            <label className="field" style={{ marginTop: 10 }}><span>Notas</span><textarea id="paq-notas" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            {error && <p className="status-line error">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="button" className="primary" onClick={vender} disabled={saving || !valido}>{saving ? 'Cobrando…' : `Cobrar ${precio ? money(Number(precio)) : ''} y crear paquete`}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Registrar una sesión del paquete ----------
function RegistrarSesion({ patientId, paquete, onClose, onDone }: { patientId: string; paquete: PaqueteUI; onClose: () => void; onDone: () => void }) {
  const [fechaHora, setFechaHora] = useState(nowLocalInput());
  const [tratamiento, setTratamiento] = useState(paquete.nombre);
  const [zona, setZona] = useState('');
  const [producto, setProducto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: new Date(fechaHora).toISOString(),
          tratamiento,
          pieza: zona,
          material: producto,
          cargo: 0,
          pago: 0,
          paqueteId: paquete.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar la sesión');
      onDone();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay overlay" onClick={() => !saving && onClose()}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header"><h2>Sesión {paquete.sesionesUsadas + 1} de {paquete.sesionesTotal}</h2></div>
        <p className="hint">{paquete.nombre} — no genera cargo: el paquete ya está pagado.</p>
        <label className="field"><span>Fecha y hora</span><input id="ses-fecha" type="datetime-local" value={fechaHora} onChange={(e) => setFechaHora(e.target.value)} /></label>
        <label className="field" style={{ marginTop: 10 }}><span>Tratamiento</span><input id="ses-trat" type="text" value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} /></label>
        <div className="grid2" style={{ marginTop: 10 }}>
          <label className="field"><span>Zona</span><input id="ses-zona" type="text" value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Rostro" /></label>
          <label className="field"><span>Producto / equipo</span><input id="ses-prod" type="text" value={producto} onChange={(e) => setProducto(e.target.value)} /></label>
        </div>
        {error && <p className="status-line error">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="primary" onClick={guardar} disabled={saving || !tratamiento.trim()}>{saving ? 'Guardando…' : 'Registrar sesión'}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Tarjeta de paquetes en Seguimiento ----------
export default function PaquetesCard({ patientId, patientName, paquetes, onChanged }: { patientId: string; patientName: string; paquetes: PaqueteUI[]; onChanged: () => void }) {
  const [vender, setVender] = useState(false);
  const [sesionDe, setSesionDe] = useState<PaqueteUI | null>(null);
  const [historial, setHistorial] = useState(false);

  const activos = paquetes.filter((p) => p.estado === 'activo');
  const cerrados = paquetes.filter((p) => p.estado !== 'activo');

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Paquetes de sesiones</h3>
        <button type="button" className="tint-amber" onClick={() => setVender(true)}>+ Vender paquete</button>
      </div>

      {activos.length === 0 && <p className="hint" style={{ marginTop: 10 }}>No hay paquetes activos.</p>}

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {activos.map((p) => {
          const pct = Math.min(100, Math.round((p.sesionesUsadas / p.sesionesTotal) * 100));
          const restan = p.sesionesTotal - p.sesionesUsadas;
          return (
            <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <strong>{p.nombre}</strong>
                  <div className="hint" style={{ margin: 0 }}>Pagado {money(p.precio)} · vence {fecha(p.venceEl)}</div>
                </div>
                <button type="button" className="primary" onClick={() => setSesionDe(p)}>Registrar sesión</button>
              </div>
              <div style={{ margin: '10px 0 4px', height: 10, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: 'var(--grad-primary)', transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.9rem' }}>
                <strong>{p.sesionesUsadas} de {p.sesionesTotal} sesiones</strong>
                {restan === 1 && <span className="badge" style={{ background: '#ff9f0a', color: '#fff' }}>Queda 1 sesión</span>}
                {p.diasRestantes <= 15 && <span className="badge" style={{ background: '#d7362f', color: '#fff' }}>Vence en {Math.max(0, p.diasRestantes)} día(s)</span>}
              </div>
            </div>
          );
        })}
      </div>

      {cerrados.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => setHistorial((v) => !v)}>{historial ? 'Ocultar' : 'Ver'} paquetes terminados ({cerrados.length})</button>
          {historial && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {cerrados.map((p) => (
                <li key={p.id} className="hint" style={{ margin: '2px 0' }}>
                  {p.nombre} — {p.sesionesUsadas} de {p.sesionesTotal} sesiones — <strong>{p.estado === 'completado' ? 'Completado' : 'Vencido'}</strong> ({fecha(p.venceEl)})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {vender && <VenderPaquete patientId={patientId} patientName={patientName} onClose={() => setVender(false)} onDone={onChanged} />}
      {sesionDe && <RegistrarSesion patientId={patientId} paquete={sesionDe} onClose={() => setSesionDe(null)} onDone={onChanged} />}
    </div>
  );
}
