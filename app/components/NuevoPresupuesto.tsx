'use client';

import { useEffect, useState } from 'react';

type Row = { name: string; amount: string; qty: string; productId?: string; priceId?: string };
type Product = { id: string; priceId: string; name: string; amount: number };

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function NuevoPresupuesto({
  patientId,
  patientName,
  mode = 'presupuesto',
  onClose,
  onDone,
}: {
  patientId: string;
  patientName: string;
  mode?: 'presupuesto' | 'pago';
  onClose: () => void;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([{ name: '', amount: '', qty: '1' }]);
  const [discount, setDiscount] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const isPago = mode === 'pago';
  const [byEmail, setByEmail] = useState(false);
  const [bySms, setBySms] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const subtotal = rows.reduce((s, r) => s + (Number(r.amount) || 0) * Math.max(1, Number(r.qty) || 1), 0);
  const pct = Math.min(100, Math.max(0, Number(discount) || 0));
  const total = subtotal * (1 - pct / 100);

  function loadProducts() {
    setLoadingProducts(true);
    setProductsError(null);
    fetch('/api/products')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'No se pudieron cargar los productos');
        setProducts(d.products || []);
      })
      .catch((e) => setProductsError(e.message))
      .finally(() => setLoadingProducts(false));
  }

  useEffect(loadProducts, []);

  // Cada clic en un producto suma 1 a su cantidad (3 clics = 3).
  function addProduct(p: Product) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.productId === p.id);
      if (idx >= 0) return prev.map((r, i) => (i === idx ? { ...r, qty: String((Number(r.qty) || 0) + 1) } : r));
      const blank = prev.length === 1 && !prev[0].name && !prev[0].amount;
      const row: Row = { name: p.name, amount: String(p.amount), qty: '1', productId: p.id, priceId: p.priceId };
      return blank ? [row] : [...prev, row];
    });
  }

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function crear() {
    setSaving(true);
    setError(null);
    try {
      const items = rows.map((r) => ({ name: r.name, amount: Number(r.amount), qty: Number(r.qty), productId: r.productId, priceId: r.priceId }));
      if (isPago) {
        const res = await fetch(`/api/patients/${patientId}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, discountPercent: pct, amount: payAmount === '' ? undefined : Number(payAmount), method, notes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo registrar el pago');
        setResult(
          `Pago de ${money(data.amount)} registrado en GoHighLevel.` +
            (data.pending > 0 ? ` Saldo pendiente de esta factura: ${money(data.pending)}.` : ' Factura pagada por completo.') +
            ' Ya aparece en Seguimiento y Facturación; desde ahí puedes enviar el recibo.'
        );
        onDone();
        return;
      }
      const send = byEmail && bySms ? 'sms_and_email' : byEmail ? 'email' : bySms ? 'sms' : 'none';
      const res = await fetch(`/api/patients/${patientId}/estimates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, discountPercent: pct, validDays: Number(validDays), notes, send }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear');
      setResult(
        send === 'none'
          ? 'Presupuesto creado (borrador en GoHighLevel, sin enviar). Puedes enviarlo desde Seguimiento.'
          : `Presupuesto creado: ${data.sendMessage}. Si algo falló, puedes reenviarlo desde Seguimiento.`
      );
      onDone();
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay overlay" onClick={() => !saving && onClose()}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header"><h2>{isPago ? 'Registrar pago de' : 'Presupuesto para'} {patientName}</h2></div>

        {result ? (
          <>
            <p className="hint">{result}</p>
            <div className="modal-actions"><button type="button" className="primary" onClick={onClose}>Listo</button></div>
          </>
        ) : (
          <>
                        <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={loadingProducts ? 'Cargando productos…' : 'Buscar producto…'}
              style={{ marginBottom: 8 }}
            />
            {productsError && (
              <p className="status-line error">
                {productsError} <button type="button" onClick={loadProducts}>Reintentar</button>
              </p>
            )}
            {!loadingProducts && !productsError && products.length === 0 && <p className="hint">No hay productos con precio en GoHighLevel.</p>}
            <div className="product-chips">
              {products
                .filter((p) => p.name.toLowerCase().includes(filter.trim().toLowerCase()))
                .map((p) => {
                  const n = Number(rows.find((r) => r.productId === p.id)?.qty || 0);
                  return (
                    <button key={p.id} type="button" className={'product-chip' + (n ? ' on' : '')} onClick={() => addProduct(p)}>
                      <span className="product-chip-name">{p.name}</span>
                      <span className="product-chip-price">{money(p.amount)}</span>
                      {n > 0 && <span className="product-chip-count">{n}</span>}
                    </button>
                  );
                })}
            </div>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px 110px auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
                <label className="field"><span>{i === 0 ? 'Concepto' : ''}</span>
                  <input type="text" value={r.name} onChange={(e) => setRow(i, { name: e.target.value, productId: undefined, priceId: undefined })} placeholder="Concepto" />
                </label>
                <label className="field"><span>{i === 0 ? 'Cant.' : ''}</span>
                  <input type="number" min={1} value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
                </label>
                <label className="field"><span>{i === 0 ? 'Precio' : ''}</span>
                  <input type="number" min={0} step="0.01" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} placeholder="0" />
                </label>
                <button type="button" onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))} disabled={rows.length === 1} title="Quitar">✕</button>
              </div>
            ))}
            <button type="button" className="tint-teal" onClick={() => setRows((p) => [...p, { name: '', amount: '', qty: '1' }])}>+ Concepto libre</button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <label className="field"><span>Descuento %</span>
                <input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
              </label>
              {isPago ? (
                <label className="field"><span>Forma de pago</span>
                  <select value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="bank_transfer">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Otro</option>
                  </select>
                </label>
              ) : (
                <label className="field"><span>Vigencia (días)</span>
                  <input type="number" min={1} value={validDays} onChange={(e) => setValidDays(e.target.value)} />
                </label>
              )}
            </div>
            <label className="field" style={{ marginTop: 10 }}><span>Notas</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condiciones, formas de pago…" />
            </label>

            <p style={{ margin: '12px 0 4px', fontWeight: 700 }}>
              Total: {money(total)}{pct > 0 && <span className="hint" style={{ fontWeight: 400 }}> (subtotal {money(subtotal)}, descuento {pct}%)</span>}
            </p>

            {isPago ? (
              <label className="field" style={{ marginTop: 6 }}><span>Monto que paga ahora (vacío = total)</span>
                <input type="number" min={0} step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={total ? String(total) : '0'} />
              </label>
            ) : (
              <>
                <div className="checkrow" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <label><input type="checkbox" checked={byEmail} onChange={(e) => setByEmail(e.target.checked)} /> Enviar por email</label>
                  <label><input type="checkbox" checked={bySms} onChange={(e) => setBySms(e.target.checked)} /> Enviar por SMS</label>
                </div>
                <p className="hint" style={{ marginTop: 4 }}>Si no marcas ninguno, queda como borrador en GoHighLevel.</p>
              </>
            )}

            {error && <p className="status-line error">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="button" className="primary" onClick={crear} disabled={saving || subtotal <= 0}>{saving ? (isPago ? 'Registrando…' : 'Creando…') : isPago ? 'Registrar pago' : 'Crear presupuesto'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
