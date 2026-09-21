import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';
import { getNumeroHistoriaClinica } from '@/lib/historia-clinica';

export const dynamic = 'force-dynamic';

function normWords(name: string): string[] {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Busca posibles contactos duplicados del paciente actual: usa la última
// palabra del nombre (normalmente el apellido) como red amplia de búsqueda -
// la misma técnica que reveló los casos de Lourdes que la búsqueda exacta
// del nombre completo no encontraba.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = await params;
  try {
    const data = await ghlFetch<{ contact: any }>(`/contacts/${contactId}`);
    const contact = data.contact;
    const name = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    const words = normWords(name);
    const lastWord = words[words.length - 1];
    if (!lastWord) return NextResponse.json({ candidates: [] });

    const searchData = await ghlFetch<{ contacts: any[] }>('/contacts/search', {
      method: 'POST',
      body: JSON.stringify({ locationId: getLocationId(), pageLimit: 10, query: lastWord }),
    });

    const candidates = (searchData.contacts || [])
      .filter((c) => c.id !== contactId)
      .map((c) => {
        const candWords = new Set(normWords(c.name || [c.firstName, c.lastName].filter(Boolean).join(' ')));
        const matchCount = words.filter((w) => candWords.has(w)).length;
        return {
          id: c.id,
          name: c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || '(sin nombre)',
          phone: c.phone || '',
          email: c.email || '',
          dateAdded: c.dateAdded || null,
          numeroHistoriaClinica: getNumeroHistoriaClinica(c.id),
          matchCount,
          samePhone: !!contact.phone && contact.phone === c.phone,
          sameEmail: !!contact.email && contact.email === c.email,
        };
      })
      .filter((c) => c.matchCount >= 1)
      .sort((a, b) => Number(b.samePhone || b.sameEmail) - Number(a.samePhone || a.sameEmail) || b.matchCount - a.matchCount);

    return NextResponse.json({ candidates });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo buscar duplicados' }, { status: 502 });
  }
}
