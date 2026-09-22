'use client';

import { useEffect, useRef, useState } from 'react';

// Cámara en vivo (getUserMedia) para "Tomar foto" desde la computadora. En celular, el botón que
// llama a esto usa el input con capture="environment" y abre la cámara nativa; aquí es el respaldo
// para escritorio, donde ese atributo no abre la cámara y solo dejaba elegir un archivo.
export default function CameraCapture({ onCapture, onCancel, onFallback }: { onCapture: (blob: Blob) => void; onCancel: () => void; onFallback: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (err: any) {
        setError(
          err?.name === 'NotAllowedError'
            ? 'No diste permiso para usar la cámara.'
            : err?.name === 'NotFoundError'
            ? 'No se encontró ninguna cámara en este dispositivo.'
            : 'No se pudo abrir la cámara.'
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capturar() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => { if (blob) onCapture(blob); }, 'image/jpeg', 0.9);
  }

  return (
    <div className="overlay modal-overlay" style={{ zIndex: 1300 }} onClick={onCancel}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header"><h2>Tomar foto</h2></div>
        {error ? (
          <>
            <p className="status-line error">{error}</p>
            <div className="modal-actions">
              <button type="button" onClick={onCancel}>Cancelar</button>
              <button type="button" className="primary" onClick={onFallback}>Elegir archivo en su lugar</button>
            </div>
          </>
        ) : (
          <>
            <div className="camera-preview">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>
            <div className="modal-actions">
              <button type="button" onClick={onCancel}>Cancelar</button>
              <button type="button" className="primary" onClick={capturar} disabled={!ready}>{ready ? '📷 Capturar' : 'Abriendo cámara…'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
