'use client';

import { useEffect } from 'react';

const BEAT_MS = 120_000;
const IDLE_LIMIT_MS = 120_000;

// Manda un latido cada 2 minutos solo si la pestaña está visible y la persona
// usó el ratón, teclado o pantalla táctil en ese lapso: mide trabajo real, no
// una pestaña olvidada abierta.
export default function ActivityTracker() {
  useEffect(() => {
    let lastInteraction = Date.now();
    let stopped = false;
    const mark = () => { lastInteraction = Date.now(); };
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const id = setInterval(async () => {
      if (stopped) return;
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastInteraction > IDLE_LIMIT_MS) return;
      try {
        const res = await fetch('/api/activity/heartbeat', { method: 'POST' });
        if (res.status === 401) stopped = true;
      } catch {
        /* sin conexión: se reintenta en el siguiente ciclo */
      }
    }, BEAT_MS);

    return () => {
      clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, []);

  return null;
}
