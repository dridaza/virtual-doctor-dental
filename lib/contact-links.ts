export function waLink(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export function mailtoLink(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  return `mailto:${email}`;
}
