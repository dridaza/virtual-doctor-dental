'use client';

import { useState } from 'react';

export default function SecurityCard() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/facturacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setPassword('');
      setConfirm('');
      setSaved(true);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Seguridad — contraseña de Facturación y Backup</h3>
      <p className="hint">
        Segunda contraseña, distinta a la de inicio de sesión. Se pide, junto con un código por SMS, al entrar a
        Facturación y a Backup. Cámbiala aquí cuando quieras.
      </p>
      <form onSubmit={save} style={{ maxWidth: 420 }}>
        <label className="field"><span>Nueva contraseña</span>
          <input id="sec-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="field" style={{ marginTop: 10 }}><span>Confirmar contraseña</span>
          <input id="sec-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && <p className="status-line error">{error}</p>}
        {saved && <p className="status-line">Contraseña actualizada.</p>}
        <button type="submit" className="primary" style={{ marginTop: 10 }} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}
