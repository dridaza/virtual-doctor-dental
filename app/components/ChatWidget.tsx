'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Msg = { id: string; email: string; nombre: string; texto: string; ts: string };

// Widget flotante de chat interno del equipo (mensajes guardados en GHL, refresco cada pocos segundos).
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [me, setMe] = useState('');
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [seen, setSeen] = useState<string>('');
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (document.visibilityState !== 'visible') return;
    fetch('/api/chat')
      .then((r) => r.json())
      .then((d) => {
        if (d.messages) { setMsgs(d.messages); setMe(d.me || ''); }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try { setSeen(localStorage.getItem('vd_chat_seen') || ''); } catch {}
    load();
    const t = setInterval(load, open ? 4000 : 20000);
    return () => clearInterval(t);
  }, [load, open]);

  const last = msgs[msgs.length - 1]?.id || '';
  useEffect(() => {
    if (open && last) {
      setSeen(last);
      try { localStorage.setItem('vd_chat_seen', last); } catch {}
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [open, last]);

  const unread = (() => {
    if (open) return 0;
    const i = msgs.findIndex((m) => m.id === seen);
    return msgs.slice(i + 1).filter((m) => m.email !== me).length;
  })();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setMsgs(d.messages); setTexto(''); } else setError(d.error || 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat interno">
          <div className="chat-head"><strong>Chat del equipo</strong><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button></div>
          <div className="chat-body">
            {msgs.length === 0 && <p className="hint">Aún no hay mensajes. Escribe el primero.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`chat-msg ${m.email === me ? 'mine' : ''}`}>
                <div className="chat-meta">{m.email === me ? 'Tú' : m.nombre} · {new Date(m.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="chat-text">{m.texto}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {error && <div className="status-line error" style={{ margin: '0 10px' }}>{error}</div>}
          <form className="chat-form" onSubmit={send}>
            <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje…" maxLength={1000} />
            <button className="primary" type="submit" disabled={sending || !texto.trim()}>Enviar</button>
          </form>
        </div>
      )}
      <button type="button" className="chat-fab" onClick={() => setOpen(!open)} aria-label="Chat interno">
        💬{unread > 0 && <span className="chat-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
    </div>
  );
}
