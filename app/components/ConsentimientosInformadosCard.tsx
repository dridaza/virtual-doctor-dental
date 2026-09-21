'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import FirmaPad from './FirmaPad';

type Consent = { id: string; fecha: string; procedimiento: string; texto: string; firmaUrl: string; firmante: string };

const PLANTILLA = `Yo, el paciente abajo firmante, declaro que el médico me explicó en forma clara la naturaleza del procedimiento indicado, sus beneficios, alternativas y los riesgos y posibles complicaciones (entre ellas: sangrado, infección, cicatrización anormal, asimetría, resultados distintos a los esperados, reacciones a anestésicos o medicamentos y, en casos excepcionales, la necesidad de un nuevo procedimiento).

Tuve oportunidad de hacer preguntas y fueron respondidas a mi satisfacción. Informé con veracidad mis antecedentes médicos, alergias y medicamentos. Entiendo que no se me garantiza un resultado específico.

Por lo anterior, autorizo de manera libre y voluntaria la realización del procedimiento, y sé que puedo revocar este consentimiento antes de su realización.`;

export default function ConsentimientosInformadosCard({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [items, setItems] = useState<Consent[]>([]);
  const [open, setOpen] = useState(false);
  const [procedimiento, setProcedimiento] = useState('');
  const [texto, setTexto] = useState(PLANTILLA);
  const [firma, setFirma] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [padKey, setPadKey] = useState(0);

  const load = useCallback(() => {
    fetch(`/api/patients/${patientId}/consentimientos-informados`)
      .then((r) => r.json())
      .then((d) => setItems(d.consentimientos || []))
      .catch(() => {});
  }, [patientId]);
  useEffect(load, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!firma) return setError('Falta la firma del paciente.');
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/consentimientos-informados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedimiento, texto, firmaDataUrl: firma, firmante: patientName }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || 'No se pudo guardar.');
      setProcedimiento('');
      setFirma(null);
      setPadKey((k) => k + 1);
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Consent) {
    if (!confirm('¿Eliminar este consentimiento informado?')) return;
    const res = await fetch(`/api/patients/${patientId}/consentimientos-informados/${c.id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Consentimientos informados</h3>
        <button type="button" onClick={() => setOpen(!open)}>{open ? 'Cancelar' : 'Nuevo consentimiento'}</button>
      </div>
      {open && (
        <form onSubmit={save} style={{ marginTop: 10 }}>
          <label className="field"><span>Procedimiento</span>
            <input type="text" required value={procedimiento} onChange={(e) => setProcedimiento(e.target.value)} placeholder="Ej. Mastoplastia de aumento" />
          </label>
          <label className="field" style={{ marginTop: 10 }}><span>Texto del consentimiento (editable)</span>
            <textarea rows={9} required value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
          <div style={{ marginTop: 10 }}>
            <span className="hint">Firma del paciente</span>
            <FirmaPad key={padKey} onChange={setFirma} />
          </div>
          {error && <div className="status-line error">{error}</div>}
          <button className="primary" type="submit" disabled={saving} style={{ marginTop: 10 }}>{saving ? 'Guardando…' : 'Guardar consentimiento firmado'}</button>
        </form>
      )}
      {items.length === 0 && !open && <p className="hint">Sin consentimientos registrados.</p>}
      {items.map((c) => (
        <div key={c.id} className="receta-card-header" style={{ marginTop: 10 }}>
          <span><strong>{c.procedimiento}</strong> · {new Date(c.fecha).toLocaleDateString('es', { dateStyle: 'medium' })}</span>
          <div className="row-actions">
            <Link href={`/patients/${patientId}/consentimientos-informados/${c.id}/print`} target="_blank" className="button">Imprimir</Link>
            <button type="button" onClick={() => remove(c)}>Eliminar</button>
          </div>
        </div>
      ))}
    </div>
  );
}
