'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import FirmaPad from './FirmaPad';
import { CampoDef, PROTOCOLOS, ProtocoloConfig, TratamientoFicha } from '@/lib/tratamiento-protocolos';

function emptyRecord(keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, '']));
}

function CampoInput({ def, value, onChange }: { def: CampoDef; value: string; onChange: (v: string) => void }) {
  if (def.tipo === 'yesno') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        <option value="Sí">Sí</option>
        <option value="No">No</option>
      </select>
    );
  }
  if (def.tipo === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {(def.opciones || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (def.tipo === 'multi') {
    const selected = value ? value.split(', ').filter(Boolean) : [];
    const toggle = (o: string) => {
      const next = selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o];
      onChange(next.join(', '));
    };
    return (
      <div className="tratamiento-multi">
        {(def.opciones || []).map((o) => (
          <label key={o} className="tratamiento-check">
            <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (def.tipo === 'textarea') {
    return <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />;
}

function CamposGrid({ protocolo, valores, onChange, disabled }: { protocolo: ProtocoloConfig; valores: Record<string, string>; onChange: (k: string, v: string) => void; disabled?: boolean }) {
  return (
    <div className="tratamiento-campos-grid">
      {protocolo.campos.map((c) => (
        <label key={c.key} className="field" style={c.ancho === 2 ? { gridColumn: 'span 2' } : undefined}>
          <span>{c.label}</span>
          {disabled ? <div className="tratamiento-valor">{valores[c.key] || '—'}</div> : <CampoInput def={c} value={valores[c.key] || ''} onChange={(v) => onChange(c.key, v)} />}
        </label>
      ))}
    </div>
  );
}

function NuevaFichaForm({ protocolo, patientName, patientId, onCreated, onCancel }: { protocolo: ProtocoloConfig; patientName: string; patientId: string; onCreated: () => void; onCancel: () => void }) {
  const [campos, setCampos] = useState<Record<string, string>>(() => emptyRecord(protocolo.campos.map((c) => c.key)));
  const [consent, setConsent] = useState<Record<string, string>>(() => emptyRecord(protocolo.consentChecks.map((c) => c.key)));
  const [firma, setFirma] = useState<string | null>(null);
  const [padKey, setPadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!consent[protocolo.consentChecks[0].key]) return setError('Debes aceptar el procedimiento para guardar la ficha.');
    if (!firma) return setError('Falta la firma del paciente.');
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/tratamientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolo: protocolo.id, campos, consent, firmaDataUrl: firma, firmante: patientName }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || 'No se pudo guardar.');
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={guardar} style={{ marginTop: 10 }}>
      <h4 style={{ marginTop: 0 }}>Nueva ficha: {protocolo.nombre}</h4>
      <CamposGrid protocolo={protocolo} valores={campos} onChange={(k, v) => setCampos((p) => ({ ...p, [k]: v }))} />

      <div className="tratamiento-consent">
        <p style={{ whiteSpace: 'pre-wrap' }}>{protocolo.consentTexto}</p>
        {protocolo.consentChecks.map((c) => (
          <label key={c.key} className="tratamiento-check" style={{ display: 'flex', marginTop: 6 }}>
            <input
              type="checkbox"
              checked={!!consent[c.key]}
              onChange={(e) => setConsent((p) => ({ ...p, [c.key]: e.target.checked ? 'si' : '' }))}
            />
            {' '}{c.label}
          </label>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <span className="hint">Firma del paciente</span>
        <FirmaPad key={padKey} onChange={setFirma} />
      </div>

      {error && <div className="status-line error">{error}</div>}
      <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button className="primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar ficha'}</button>
      </div>
    </form>
  );
}

function SesionRow({ protocolo, sesion, onDelete, deleting }: { protocolo: ProtocoloConfig; sesion: Record<string, string>; onDelete: () => void; deleting: boolean }) {
  return (
    <tr>
      <td>{new Date(sesion.fecha).toLocaleDateString('es', { dateStyle: 'medium' })}</td>
      {protocolo.columnasSesion.map((col) => <td key={col.key}>{sesion[col.key] || '—'}</td>)}
      <td><button type="button" onClick={onDelete} disabled={deleting}>{deleting ? '…' : 'Eliminar'}</button></td>
    </tr>
  );
}

function FichaCard({ ficha, protocolo, patientId, onChanged }: { ficha: TratamientoFicha; protocolo: ProtocoloConfig; patientId: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editingCampos, setEditingCampos] = useState(false);
  const [campos, setCampos] = useState(ficha.campos);
  const [addingSesion, setAddingSesion] = useState(false);
  const [nuevaSesion, setNuevaSesion] = useState<Record<string, string>>(() => emptyRecord(protocolo.columnasSesion.map((c) => c.key)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  useEffect(() => setCampos(ficha.campos), [ficha.campos]);

  async function guardarCampos() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/patients/${patientId}/tratamientos/${ficha.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campos }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || 'No se pudo guardar.');
      setEditingCampos(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function agregarSesion(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const sesiones = [...ficha.sesiones, { ...nuevaSesion, fecha: new Date().toISOString() }];
      const res = await fetch(`/api/patients/${patientId}/tratamientos/${ficha.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesiones }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || 'No se pudo guardar la sesión.');
      setNuevaSesion(emptyRecord(protocolo.columnasSesion.map((c) => c.key)));
      setAddingSesion(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function eliminarSesion(idx: number) {
    if (!confirm('¿Eliminar esta sesión?')) return;
    setDeletingIdx(idx);
    try {
      const sesiones = ficha.sesiones.filter((_, i) => i !== idx);
      const res = await fetch(`/api/patients/${patientId}/tratamientos/${ficha.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesiones }),
      });
      if (res.ok) onChanged();
    } finally {
      setDeletingIdx(null);
    }
  }

  async function eliminarFicha() {
    if (!confirm('¿Eliminar esta ficha de tratamiento y todas sus sesiones?')) return;
    const res = await fetch(`/api/patients/${patientId}/tratamientos/${ficha.id}`, { method: 'DELETE' });
    if (res.ok) onChanged();
  }

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div className="receta-card-header">
        <span>
          <strong>{protocolo.nombreCorto}</strong> · {new Date(ficha.fecha).toLocaleDateString('es', { dateStyle: 'medium' })} ·{' '}
          <span className={ficha.sesiones.length >= protocolo.planSesiones ? 'badge showed' : 'badge'}>
            {ficha.sesiones.length} / {protocolo.planSesiones} sesiones
          </span>
        </span>
        <div className="row-actions">
          <button type="button" onClick={() => setOpen((v) => !v)}>{open ? 'Ocultar' : 'Ver ficha'}</button>
          <Link href={`/patients/${patientId}/tratamientos/${ficha.id}/print`} target="_blank" className="button">Imprimir</Link>
          <button type="button" onClick={eliminarFicha}>Eliminar</button>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Datos de la ficha</h4>
            {!editingCampos && <button type="button" onClick={() => setEditingCampos(true)}>Editar</button>}
          </div>
          <CamposGrid protocolo={protocolo} valores={campos} onChange={(k, v) => setCampos((p) => ({ ...p, [k]: v }))} disabled={!editingCampos} />
          {editingCampos && (
            <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
              <button type="button" onClick={() => { setCampos(ficha.campos); setEditingCampos(false); }} disabled={saving}>Cancelar</button>
              <button type="button" className="primary" onClick={guardarCampos} disabled={saving}>{saving ? 'Guardando…' : 'Guardar datos'}</button>
            </div>
          )}

          <h4>Bitácora de sesiones</h4>
          {ficha.sesiones.length === 0 && !addingSesion && <p className="hint">Sin sesiones registradas.</p>}
          {ficha.sesiones.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    {protocolo.columnasSesion.map((c) => <th key={c.key} style={c.ancho ? { width: c.ancho } : undefined}>{c.label}</th>)}
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.sesiones.map((s, i) => (
                    <SesionRow key={i} protocolo={protocolo} sesion={s} onDelete={() => eliminarSesion(i)} deleting={deletingIdx === i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!addingSesion ? (
            <button type="button" className="success" style={{ marginTop: 10 }} onClick={() => setAddingSesion(true)}>+ Agregar sesión</button>
          ) : (
            <form className="card visit-form" onSubmit={agregarSesion} style={{ marginTop: 10 }}>
              <h4 style={{ marginTop: 0 }}>Nueva sesión (#{ficha.sesiones.length + 1})</h4>
              <div className="grid5">
                {protocolo.columnasSesion.map((c) => (
                  <label key={c.key} className="field"><span>{c.label}</span>
                    <CampoInput def={{ key: c.key, label: c.label, tipo: c.tipo === 'yesno' ? 'yesno' : 'text' }} value={nuevaSesion[c.key] || ''} onChange={(v) => setNuevaSesion((p) => ({ ...p, [c.key]: v }))} />
                  </label>
                ))}
              </div>
              <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
                <button type="button" onClick={() => setAddingSesion(false)} disabled={saving}>Cancelar</button>
                <button className="primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar sesión'}</button>
              </div>
            </form>
          )}
          {error && <div className="status-line error">{error}</div>}
        </div>
      )}
    </div>
  );
}

export default function TratamientosSeguimientoCard({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [fichas, setFichas] = useState<TratamientoFicha[]>([]);
  const [nuevaProtocoloId, setNuevaProtocoloId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/patients/${patientId}/tratamientos`)
      .then((r) => r.json())
      .then((d) => setFichas(d.fichas || []))
      .catch(() => {});
  }, [patientId]);
  useEffect(load, [load]);

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Fichas de tratamiento</h3>
        <div className="row-actions">
          {PROTOCOLOS.map((p) => (
            <button key={p.id} type="button" onClick={() => setNuevaProtocoloId(p.id)}>+ {p.nombreCorto}</button>
          ))}
        </div>
      </div>

      {nuevaProtocoloId && (
        <NuevaFichaForm
          protocolo={PROTOCOLOS.find((p) => p.id === nuevaProtocoloId)!}
          patientName={patientName}
          patientId={patientId}
          onCancel={() => setNuevaProtocoloId(null)}
          onCreated={() => { setNuevaProtocoloId(null); load(); }}
        />
      )}

      {fichas.length === 0 && !nuevaProtocoloId && <p className="hint">Sin fichas de tratamiento registradas.</p>}
      {fichas.map((f) => {
        const protocolo = PROTOCOLOS.find((p) => p.id === f.protocolo);
        if (!protocolo) return null;
        return <FichaCard key={f.id} ficha={f} protocolo={protocolo} patientId={patientId} onChanged={load} />;
      })}
    </div>
  );
}
