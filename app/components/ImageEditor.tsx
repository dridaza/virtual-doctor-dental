'use client';

import { useEffect, useRef, useState } from 'react';

type Rect = { x: number; y: number; w: number; h: number };
const MIN_SIZE = 32;
const MAX_OUTPUT = 1600; // lado más largo del recorte final, para no subir archivos enormes

// Editor simple: recortar (arrastrar y ajustar el marco) o usar la imagen completa, antes de subirla.
export default function ImageEditor({ blob, onCancel, onConfirm }: { blob: Blob; onCancel: () => void; onConfirm: (out: Blob) => void }) {
  const [url] = useState(() => URL.createObjectURL(blob));
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [rect, setRect] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: string; startX: number; startY: number; start: Rect } | null>(null);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    setNatural({ w: nw, h: nh });
    const maxW = 620;
    const maxH = 440;
    const scale = Math.min(maxW / nw, maxH / nh, 8);
    const w = Math.max(1, Math.round(nw * scale));
    const h = Math.max(1, Math.round(nh * scale));
    setDisplay({ w, h });
    const rw = Math.round(w * 0.8);
    const rh = Math.round(h * 0.8);
    setRect({ x: Math.round((w - rw) / 2), y: Math.round((h - rh) / 2), w: rw, h: rh });
  }

  function clamp(r: Rect): Rect {
    let { x, y, w, h } = r;
    w = Math.max(MIN_SIZE, Math.min(w, display.w));
    h = Math.max(MIN_SIZE, Math.min(h, display.h));
    x = Math.max(0, Math.min(x, display.w - w));
    y = Math.max(0, Math.min(y, display.h - h));
    return { x, y, w, h };
  }

  function startDrag(mode: string) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!rect) return;
      dragRef.current = { mode, startX: e.clientX, startY: e.clientY, start: rect };
      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = ev.clientX - d.startX;
        const dy = ev.clientY - d.startY;
        let next = { ...d.start };
        if (d.mode === 'move') {
          next.x = d.start.x + dx;
          next.y = d.start.y + dy;
        } else {
          if (d.mode.includes('e')) next.w = d.start.w + dx;
          if (d.mode.includes('s')) next.h = d.start.h + dy;
          if (d.mode.includes('w')) { next.x = d.start.x + dx; next.w = d.start.w - dx; }
          if (d.mode.includes('n')) { next.y = d.start.y + dy; next.h = d.start.h - dy; }
        }
        setRect(clamp(next));
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  async function recortar() {
    if (!rect || !natural || !display.w) return;
    setBusy(true);
    try {
      const scale = natural.w / display.w;
      const sx = rect.x * scale;
      const sy = rect.y * scale;
      const sw = rect.w * scale;
      const sh = rect.h * scale;
      const outScale = Math.min(1, MAX_OUTPUT / Math.max(sw, sh));
      const img = new Image();
      img.src = url;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(sw * outScale);
      canvas.height = Math.round(sh * outScale);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo procesar la imagen');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((out) => { if (out) onConfirm(out); else setBusy(false); }, 'image/jpeg', 0.9);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="overlay modal-overlay" style={{ zIndex: 1300 }} onClick={onCancel}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <div className="modal-header"><h2>Ajustar imagen</h2></div>
        <p className="hint">Arrastra el marco para recortar, o usa la imagen completa.</p>
        <div
          ref={containerRef}
          className="image-editor-canvas"
          style={{ width: display.w || 'auto', height: display.h || 220 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" onLoad={onImgLoad} draggable={false} style={{ width: display.w, height: display.h }} />
          {rect && (
            <div
              className="image-editor-crop"
              onPointerDown={startDrag('move')}
              style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
            >
              {['nw', 'ne', 'sw', 'se'].map((c) => (
                <span
                  key={c}
                  className={`image-editor-handle handle-${c}`}
                  onPointerDown={startDrag(c)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="button" onClick={() => onConfirm(blob)} disabled={busy}>Usar imagen completa</button>
          <button type="button" className="primary" onClick={recortar} disabled={busy || !rect}>{busy ? 'Recortando…' : 'Recortar y guardar'}</button>
        </div>
      </div>
    </div>
  );
}
