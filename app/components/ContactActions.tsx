'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

// Compone y envía un correo con la cuenta de correo conectada en esta clínica (GHL) al
// correo del paciente. No abre el cliente de correo local del dispositivo.
export function EmailButton({ contactId, email, patientName }: { contactId: string; email: string; patientName?: string }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || sending) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/conversations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, type: 'Email', subject, message }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'No se pudo enviar');
      setResult('Enviado ✓');
      setTimeout(() => { setOpen(false); setSubject(''); setMessage(''); setResult(null); }, 1000);
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="contact-btn email"
        title="Enviar correo"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        Correo
      </button>
      {open && createPortal(
        <div className="modal-overlay overlay" style={{ zIndex: 1200 }} onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header"><h2>Enviar correo{patientName ? ` a ${patientName}` : ''}</h2></div>
            <p className="hint">Para: {email}</p>
            <form onSubmit={enviar}>
              <label className="field"><span>Asunto</span>
                <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
              <label className="field" style={{ marginTop: 10 }}><span>Mensaje</span>
                <textarea rows={5} required value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>
              {result && <p className={result.startsWith('Error') ? 'status-line error' : 'hint'}>{result}</p>}
              <div className="modal-actions">
                <button type="button" onClick={() => setOpen(false)} disabled={sending}>Cancelar</button>
                <button type="submit" className="primary" disabled={sending || !subject.trim() || !message.trim()}>{sending ? 'Enviando…' : 'Enviar'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
