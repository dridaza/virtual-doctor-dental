import { NextResponse } from 'next/server';
import { ghlFetch, getLocationId } from '@/lib/ghl';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Product = { id: string; priceId: string; name: string; amount: number };

let cache: { at: number; items: Product[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((r) => setTimeout(r, 500));
    return await fn();
  }
}

// Catálogo de productos de GoHighLevel con su precio (un precio de pago único por producto).
export async function GET() {
  try {
    if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json({ products: cache.items });

    const list = await ghlFetch<{ products: any[] }>(`/products/?locationId=${getLocationId()}&limit=100&offset=0`);
    const products = (list.products || []).filter((p) => p.status !== 'inactive');

    const items: Product[] = [];
    for (let i = 0; i < products.length; i += 8) {
      const batch = products.slice(i, i + 8);
      const results = await Promise.all(
        batch.map(async (p) => {
          try {
            const d = await withRetry(() => ghlFetch<{ prices: any[] }>(`/products/${p._id}/price?locationId=${getLocationId()}`));
            const prices = (d.prices || []).filter((x) => !x.deleted);
            const price = prices.find((x) => x.type === 'one_time') || prices[0];
            if (!price) return null;
            return { id: p._id as string, priceId: price._id as string, name: String(p.name || '').trim(), amount: Number(price.amount || 0) };
          } catch {
            return null;
          }
        })
      );
      for (const r of results) if (r && r.name) items.push(r);
    }
    items.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    cache = { at: Date.now(), items };
    return NextResponse.json({ products: items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudieron cargar los productos' }, { status: 502 });
  }
}
