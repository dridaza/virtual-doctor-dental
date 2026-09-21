'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Candidate = {
  id: string;
  name: string;
  phone: string;
  email: string;
  dateAdded: string | null;
  numeroHistoriaClinica: string;
  samePhone?: boolean;
  sameEmail?: boolean;
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es', { dateStyle: 'medium' });
}

export default function DuplicatesPanel({
  patientId,
  patientName,
  onClose,
  onMerged,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onMerged: () => void;
}) {
  const [autoCandidates, setAutoCandidates] = useState<Candidate[]>([]);
  const [autoLoading, setAutoLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [target, setTarget] = useState<Candidate | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergedIds, setMergedIds] = useState<string[]>([]);

  useEffect(() => {
    setAutoLoading(true);
    fetch(`/api/patients/${patientId}/duplicates`)
      .then((r) => r.json())
      .then((d) => setAutoCandidates(d.candidates || []))
      .finally(() => setAutoLoading(false));
  }, [patientId]);

  const runSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    fetch(`/api/patients?q=${encodeURIComponent(q)}&limit=8`)
      .then((r) => r.json())
      .then((d) => setSearchResults((d.contacts || []).filter((c: Candidate) => c.id !== patientId)))
      .finally(() => setSearching(false));
  }, [patientId]);

  function onQueryChange(value: string) {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => runSearch(value), 350);
  }

  async function confirmMerge() {
    if (!target) return;
    setMerging(true);
    setMergeError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duplicateId: target.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo fusionar');
      setMergedIds((prev) => [...prev, target.id]);
      setTarget(null);
      onMerged();
    } catch (err: any) {
      setMergeError(err.message || 'Error desconocido');
    } finally {
      setMerging(false);
    }
  }

  const visibleAuto = autoCandidates.filter((c) => !mergedIds.includes(c.id));
  const visibleSearch = searchResults.filter((c) => !mergedIds.includes(c.id) && !autoCandidates.some((a) => a.id === c.id));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer dup-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>Posibles duplicados de {patientName}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <p className="hint">
          Al fusionar, se copian todas las notas y se completan los huecos de la ficha del duplicado dentro de este
          paciente -sin sobrescribir nada que ya exista aquí- y el contacto duplicado se borra. Tú decides cuál fusionar.
        </p>

        <section className="dup-section">
          <h3>Detectados automáticamente</h3>
          {autoLoading && <div className="empty">Buscando…</div>}
          {!autoLoading && visibleAuto.length === 0 && <div className="empty">Sin coincidencias por nombre.</div>}
          {visibleAuto.map((c) => (
            <CandidateCard key={c.id} c={c} onMerge={() => { setTarget(c); setMergeError(null); }} />
          ))}
        </section>

        <section className="dup-section">
          <h3>Buscar manualmente</h3>
          <input
            type="text"
            placeholder="Nombre, teléfono o email…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          {searching && <div className="empty">Buscando…</div>}
          {visibleSearch.map((c) => (
            <CandidateCard key={c.id} c={c} onMerge={() => { setTarget(c); setMergeError(null); }} />
          ))}
        </section>
      </div>

      {target && (
        <div className="modal-overlay overlay" onClick={() => !merging && setTarget(null)}>
          <div className="modal-window danger-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar fusión</h2>
            </div>
            <div className="merge-compare">
              <div className="merge-side">
                <div className="merge-label">Se conserva</div>
                <strong>{patientName}</strong>
              </div>
              <div className="merge-arrow">←</div>
              <div className="merge-side">
                <div className="merge-label">Se fusiona y se elimina</div>
                <strong>{target.name}</strong>
                <div className="hint">{target.phone || '—'} · {target.email || '—'} · {target.numeroHistoriaClinica}</div>
              </div>
            </div>
            <p>Se copiarán las notas de <strong>{target.name}</strong> y se completarán los huecos de su ficha dentro de <strong>{patientName}</strong>. Luego se eliminará <strong>{target.name}</strong> de GoHighLevel. Esta acción no se puede deshacer.</p>
            {mergeError && <p className="status-line error">{mergeError}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setTarget(null)} disabled={merging}>Cancelar</button>
              <button type="button" className="primary" onClick={confirmMerge} disabled={merging}>
                {merging ? 'Fusionando…' : 'Fusionar y eliminar duplicado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CandidateCard({ c, onMerge }: { c: Candidate; onMerge: () => void }) {
  return (
    <div className="dup-card">
      <div>
        <strong>{c.name}</strong>
        {(c.samePhone || c.sameEmail) && <span className="pill">Coincide {c.samePhone ? 'teléfono' : 'email'}</span>}
        <div className="hint">{c.phone || '—'} · {c.email || '—'} · {c.numeroHistoriaClinica} · creado {formatDate(c.dateAdded)}</div>
      </div>
      <button type="button" onClick={onMerge}>Fusionar</button>
    </div>
  );
}
