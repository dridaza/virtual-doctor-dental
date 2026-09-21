'use client';

import { waLink, mailtoLink } from '@/lib/contact-links';

export function WhatsAppButton({ phone }: { phone: string }) {
  const href = waLink(phone);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="contact-btn whatsapp"
      title="Enviar WhatsApp"
      onClick={(e) => e.stopPropagation()}
    >
      WhatsApp
    </a>
  );
}

export function EmailButton({ email }: { email: string }) {
  const href = mailtoLink(email);
  if (!href) return null;
  return (
    <a
      href={href}
      className="contact-btn email"
      title="Enviar correo"
      onClick={(e) => e.stopPropagation()}
    >
      Correo
    </a>
  );
}
