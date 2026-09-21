'use client';

import { useEffect, useState } from 'react';
import { TOOTH_POSITIONS, ODONTOGRAMA_IMG, ODONTOGRAMA_REFERENCIAS, getCrownRootRects } from '@/lib/odontograma-positions';

type Props = {
  corona: Record<string, string>;
  raiz: Record<string, string>;
  onChangeCorona: (next: Record<string, string>) => void;
  onChangeRaiz: (next: Record<string, string>) => void;
  readOnly?: boolean;
};

type ActiveZone = { tooth: string; zone: 'corona' | 'raiz' } | null;

export default function Odontogram({ corona, raiz, onChangeCorona, onChangeRaiz, readOnly }: Props) {
  const [active, setActive] = useState<ActiveZone>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!active) return;
    setDraft((active.zone === 'corona' ? corona[active.tooth] : raiz[active.tooth]) || '');
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  function open(tooth: string, zone: 'corona' | 'raiz') {
    if (readOnly) return;
    setActive({ tooth, zone });
  }

  function commit(clear = false) {
    if (!active) return;
    const value = clear ? '' : draft;
    if (active.zone === 'corona') {
      const next = { ...corona };
      const trimmed = value.trim();
      if (trimmed) next[active.tooth] = trimmed;
      else delete next[active.tooth];
      onChangeCorona(next);
    } else {
      const next = { ...raiz };
      const num = value.trim();
      if (num) next[active.tooth] = num;
      else delete next[active.tooth];
      onChangeRaiz(next);
    }
    setActive(null);
  }

  function onRaizInput(v: string) {
    if (v === '') { setDraft(''); return; }
    const n = Math.max(0, Math.min(10, Math.round(Number(v))));
    if (!Number.isNaN(n)) setDraft(String(n));
  }

  return (
    <div className="odontograma-wrap">
      <div className="odontograma-canvas" style={{ aspectRatio: `${ODONTOGRAMA_IMG.width} / ${ODONTOGRAMA_IMG.height}` }}>
        <img src="/odontograma.png" alt="Odontograma" className="odontograma-img" draggable={false} />
        {Object.keys(TOOTH_POSITIONS).map((tooth) => {
          const { corona: coronaRect, raiz: raizRect } = getCrownRootRects(tooth);
          return (
            <div key={tooth}>
              <button
                type="button"
                className={`tooth-hotspot tooth-hotspot-corona ${corona[tooth] ? 'has-value' : ''}`}
                style={{ left: `${coronaRect.xPct}%`, top: `${coronaRect.yPct}%`, width: `${coronaRect.wPct}%`, height: `${coronaRect.hPct}%` }}
                title={`Pieza ${tooth} · Corona${corona[tooth] ? `: ${corona[tooth]}` : ''}`}
                onClick={() => open(tooth, 'corona')}
              >
                {corona[tooth] && <span className="tooth-tag">{corona[tooth]}</span>}
              </button>
              <button
                type="button"
                className={`tooth-hotspot tooth-hotspot-raiz ${raiz[tooth] ? 'has-value' : ''}`}
                style={{ left: `${raizRect.xPct}%`, top: `${raizRect.yPct}%`, width: `${raizRect.wPct}%`, height: `${raizRect.hPct}%` }}
                title={`Pieza ${tooth} · Raíz (profundidad mm)${raiz[tooth] ? `: ${raiz[tooth]}` : ''}`}
                onClick={() => open(tooth, 'raiz')}
              >
                {raiz[tooth] && <span className="tooth-tag raiz-tag">{raiz[tooth]}mm</span>}
              </button>
            </div>
          );
        })}
      </div>

      {active && (
        <div className="tooth-editor card">
          <div className="tooth-editor-header">
            <strong>Pieza {active.tooth} · {active.zone === 'corona' ? 'Corona' : 'Raíz'}</strong>
            <button type="button" className="close-btn" onClick={() => setActive(null)}>✕</button>
          </div>
          {active.zone === 'corona' ? (
            <input
              type="text"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setActive(null); }}
              placeholder="Ej. Do, PM"
            />
          ) : (
            <input
              type="number"
              autoFocus
              min={0}
              max={10}
              step={1}
              value={draft}
              onChange={(e) => onRaizInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setActive(null); }}
              placeholder="0-10 mm"
            />
          )}
          <div className="tooth-editor-actions">
            <button type="button" className="primary" onClick={() => commit()}>Guardar</button>
            {(active.zone === 'corona' ? corona[active.tooth] : raiz[active.tooth]) && (
              <button type="button" onClick={() => commit(true)}>Borrar</button>
            )}
          </div>
        </div>
      )}

      <details className="odontograma-referencias">
        <summary>Ver referencias</summary>
        <p className="hint">La corona (mitad junto al número) registra hallazgos con estos códigos. La raíz (mitad opuesta, con las 8 líneas) registra la profundidad de sondaje en mm (0-10).</p>
        <div className="referencias-grid">
          {ODONTOGRAMA_REFERENCIAS.map((r) => (
            <div key={r.code}><strong>{r.code}:</strong> {r.label}</div>
          ))}
        </div>
      </details>
    </div>
  );
}
