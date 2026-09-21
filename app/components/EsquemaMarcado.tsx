'use client';

import { useRef, useState } from 'react';
import { ESQUEMA_COLORES, ESQUEMA_H, ESQUEMA_W, Trazo } from '@/lib/medical-ficha';

function pathOf(p: number[]): string {
  if (p.length < 2) return '';
  let d = `M${p[0]} ${p[1]}`;
  if (p.length === 2) return d + ` L${p[0] + 0.1} ${p[1]}`;
  for (let i = 2; i < p.length; i += 2) d += ` L${p[i]} ${p[i + 1]}`;
  return d;
}

// Vista fija (para imprimir): los esquemas con las marcas encima.
export function EsquemaVista({ trazos, style }: { trazos: Trazo[]; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: `${ESQUEMA_W} / ${ESQUEMA_H}`, ...style }}>
      <img src="/medical/esquemas.jpg" alt="Esquemas" style={{ width: '100%', height: '100%', display: 'block' }} />
      <svg viewBox={`0 0 ${ESQUEMA_W} ${ESQUEMA_H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {trazos.map((t, i) => (
          <path key={i} d={pathOf(t.p)} fill="none" stroke={t.c} strokeWidth={t.w} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  );
}

// El médico marca con el dedo o el ratón sobre los esquemas (incisiones, zonas a tratar…).
export default function EsquemaMarcado({ trazos, onChange, readOnly }: { trazos: Trazo[]; onChange: (t: Trazo[]) => void; readOnly?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [color, setColor] = useState<string>(ESQUEMA_COLORES[0]);
  const [grosor, setGrosor] = useState(4);
  const [actual, setActual] = useState<number[] | null>(null);

  function point(e: React.PointerEvent): [number, number] {
    const rect = svgRef.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - rect.left) / rect.width) * ESQUEMA_W), Math.round(((e.clientY - rect.top) / rect.height) * ESQUEMA_H)];
  }

  function down(e: React.PointerEvent) {
    if (readOnly) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setActual(point(e));
  }
  function move(e: React.PointerEvent) {
    if (!actual) return;
    const [x, y] = point(e);
    const lx = actual[actual.length - 2];
    const ly = actual[actual.length - 1];
    if (Math.abs(x - lx) + Math.abs(y - ly) < 3) return;
    setActual([...actual, x, y]);
  }
  function up() {
    if (!actual) return;
    onChange([...trazos, { c: color, w: grosor, p: actual }]);
    setActual(null);
  }

  return (
    <div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          {ESQUEMA_COLORES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => setColor(c)}
              style={{ width: 30, height: 30, borderRadius: 15, background: c, border: color === c ? '3px solid var(--accent)' : '2px solid var(--border)', padding: 0 }}
            />
          ))}
          <label className="hint" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            Grosor
            <input id="esq-grosor" type="range" min={2} max={10} value={grosor} onChange={(e) => setGrosor(Number(e.target.value))} style={{ width: 90 }} />
          </label>
          <button type="button" onClick={() => onChange(trazos.slice(0, -1))} disabled={!trazos.length}>Deshacer</button>
          <button type="button" onClick={() => { if (confirm('¿Borrar todas las marcas de los esquemas?')) onChange([]); }} disabled={!trazos.length}>Borrar marcas</button>
        </div>
      )}
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${ESQUEMA_W} / ${ESQUEMA_H}`, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
        <img src="/medical/esquemas.jpg" alt="Esquemas para marcar" draggable={false} style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none' }} />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ESQUEMA_W} ${ESQUEMA_H}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: readOnly ? 'default' : 'crosshair' }}
        >
          {trazos.map((t, i) => <path key={i} d={pathOf(t.p)} fill="none" stroke={t.c} strokeWidth={t.w} strokeLinecap="round" strokeLinejoin="round" />)}
          {actual && <path d={pathOf(actual)} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </div>
    </div>
  );
}
