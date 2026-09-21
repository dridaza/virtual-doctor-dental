'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { WhatsAppButton, EmailButton } from './ContactActions';
import ConversationModal from './ConversationModal';

type Conversation = {
  id: string;
  contactId: string;
  contactName: string;
  phone: string;
  email: string;
  lastMessageBody: string;
  lastMessageType: string;
  lastMessageDirection: string;
  lastMessageDate: string | null;
  unreadCount: number;
};

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.round(hours / 24);
  return `hace ${days}d`;
}

function defaultChannel(lastMessageType: string): 'SMS' | 'WhatsApp' | 'Email' {
  if (lastMessageType === 'TYPE_WHATSAPP') return 'WhatsApp';
  if (lastMessageType === 'TYPE_EMAIL' || lastMessageType === 'TYPE_CUSTOM_EMAIL') return 'Email';
  return 'SMS';
}

export default function RecentMessages() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [openConv, setOpenConv] = useState<Conversation | null>(null);

  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyChannel, setReplyChannel] = useState<'SMS' | 'WhatsApp' | 'Email'>('SMS');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/conversations/recent?limit=30')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setConversations(d.conversations || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function openReply(c: Conversation, e: React.MouseEvent) {
    e.stopPropagation();
    setReplyingId(c.id);
    setReplyText('');
    setReplyChannel(defaultChannel(c.lastMessageType));
    setSendResult(null);
  }

  async function sendReply(c: Conversation, e: React.MouseEvent) {
    e.stopPropagation();
    if (!replyText.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/conversations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: c.contactId, message: replyText, type: replyChannel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar');
      setSendResult('Enviado ✓');
      setReplyText('');
      setTimeout(() => setReplyingId(null), 1200);
    } catch (err: any) {
      setSendResult(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  function renderList(items: Conversation[], compactBody: boolean) {
    return (
      <ul className="messages-list">
        {items.length === 0 && <div className="empty">Sin mensajes recientes.</div>}
        {items.map((c) => (
          <li key={c.id} className="message-item" onClick={() => setOpenConv(c)}>
            <div className="message-row">
              <strong>{c.contactName}</strong>
              <span className="message-time">{timeAgo(c.lastMessageDate)}</span>
            </div>
            <div className={compactBody ? 'message-body' : 'message-body message-body-full'}>
              {c.lastMessageDirection === 'inbound' ? '← ' : '→ '}
              {c.lastMessageBody}
            </div>
            <div className="message-actions" onClick={(e) => e.stopPropagation()}>
              {c.phone && <WhatsAppButton phone={c.phone} />}
              {c.email && <EmailButton email={c.email} />}
              <button type="button" className="contact-btn reply" onClick={(e) => openReply(c, e)}>Responder</button>
            </div>

            {replyingId === c.id && (
              <div className="reply-box" onClick={(e) => e.stopPropagation()}>
                <select value={replyChannel} onChange={(e) => setReplyChannel(e.target.value as any)}>
                  <option value="SMS">SMS</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                </select>
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe tu mensaje…"
                />
                <div className="reply-box-actions">
                  <button type="button" className="primary" disabled={sending} onClick={(e) => sendReply(c, e)}>
                    {sending ? 'Enviando…' : 'Enviar'}
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setReplyingId(null); }}>Cancelar</button>
                  {sendResult && <span className="reply-result">{sendResult}</span>}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="card">
      <button type="button" className="mobile-launch mobile-msg" onClick={() => setExpanded(true)}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z" /></svg>
        <span>Mensajes</span>
      </button>
      <div className="card-header-row">
        <h3>Mensajes recientes</h3>
        <button type="button" className="expand-btn" onClick={() => setExpanded(true)} title="Agrandar">⤢</button>
      </div>
      {loading && <div className="empty">Cargando…</div>}
      {error && <div className="status-line error">Error: {error}</div>}
      {!loading && !error && renderList(conversations.slice(0, 8), true)}

      {openConv && createPortal(
        <ConversationModal conv={openConv} onClose={() => setOpenConv(null)} onOpenPatient={(id) => router.push(`/patients/${id}`)} />,
        document.body
      )}

      {expanded && createPortal(
        <div className="overlay modal-overlay" onClick={() => setExpanded(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button type="button" className="back-link modal-back" onClick={() => setExpanded(false)}>← Volver</button>
              <h2>Mensajes recientes</h2>
            </div>
            {loading && <div className="empty">Cargando…</div>}
            {error && <div className="status-line error">Error: {error}</div>}
            {!loading && !error && renderList(conversations, false)}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
