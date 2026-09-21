'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Msg = { id: string; direction: 'inbound' | 'outbound'; body: string; canal: string; date: string | null; adjuntos: string[]; estado: string };
type Canal = 'SMS' | 'WhatsApp' | 'Email';

export type ConversationRef = { id: string; contactId: string; contactName: string; lastMessageType: string };

function canalInicial(t: string): Canal {
  if (t === 'TYPE_WHATSAPP') return 'WhatsApp';
  if (t === 'TYPE_EMAIL' || t === 'TYPE_CUSTOM_EMAIL') return 'Email';
  return 'SMS';
}

const fechaCorta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' }) : '';

// Conversación completa con el paciente: hilo de mensajes y respuesta por SMS, WhatsApp o email.
export default function ConversationModal({ conv, onClose, onOpenPatient }: { conv: ConversationRef; onClose: () => void; onOpenPatient: (id: string) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [canal, setCanal] = useState<Canal>(canalInicial(conv.lastMessageType));
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const primera = useRef(true);

  const cargar = useCallback(() => {
    fetch(`/api/conversations/${conv.id}/messages`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setMsgs(d.messages || []);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [conv.id]);

  useEffect(() => {
    cargar();
    const t = setInterval(() => { if (document.visibilityState === 'visible') cargar(); }, 10000);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    if (msgs.length) endRef.current?.scrollIntoView({ block: 'end', behavior: primera.current ? 'auto' : 'smooth' });
    if (msgs.length) primera.current = false;
  }, [msgs.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/conversations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: conv.contactId, message: texto, type: canal }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo enviar');
      setTexto('');
      cargar();
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-overlay overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div className="modal-window conv-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header conv-header">
          <button type="button" className="back-link modal-back" onClick={onClose}>← Volver</button>
          <h2>{conv.contactName}</h2>
          <button type="button" onClick={() => onOpenPatient(conv.contactId)}>Abrir ficha</button>
        </div>
        <div className="conv-thread">
          {loading && <div className="empty">Cargando conversación…</div>}
          {!loading && msgs.length === 0 && !error && <div className="empty">Sin mensajes en esta conversación.</div>}
          {msgs.map((m) => (
            <div key={m.id} className={`conv-msg ${m.direction}`}>
              <div className="conv-bubble">
                {m.body && <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>}
                {m.adjuntos.map((a) => (
                  <div key={a}><a href={a} target="_blank" rel="noopener noreferrer">📎 Ver adjunto</a></div>
                ))}
              </div>
              <div className="conv-meta">{fechaCorta(m.date)}{m.canal ? ` · ${m.canal}` : ''}{m.direction === 'outbound' && m.estado === 'failed' ? ' · no enviado' : ''}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        {error && <div className="status-line error">{error}</div>}
        <form className="conv-form" onSubmit={enviar}>
          <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>
            <option value="SMS">SMS</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Email">Email</option>
          </select>
          <textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu mensaje…" />
          <button className="primary" type="submit" disabled={sending || !texto.trim()}>{sending ? 'Enviando…' : 'Enviar'}</button>
        </form>
      </div>
    </div>
  );
}
