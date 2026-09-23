'use client';

import { CLINIC_LOGO } from '@/lib/clinic-logo';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AccesoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo entrar');
      const next = searchParams.get('next') || '/';
      window.location.href = next; // recarga completa: el middleware ya ve la cookie nueva
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      setLoading(false);
    }
  }

  return (
    <form className="card" style={{ marginTop: 16 }} onSubmit={submit}>
      <label className="field"><span>Contraseña de acceso</span>
        <input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </label>
      <p className="hint" style={{ marginTop: 10 }}>
        Es la contraseña compartida del equipo (no la tuya personal). Después de esto seguirás entrando con tu
        correo y tu código por SMS como siempre.
      </p>
      {error && <p className="status-line error">{error}</p>}
      <button className="primary public-form-submit" type="submit" disabled={loading || !password} style={{ marginTop: 6 }}>
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

export default function AccesoPage() {
  return (
    <div className="public-form-page">
      <header className="public-form-header">
        {CLINIC_LOGO && <img src={CLINIC_LOGO} alt="Logo" />}
        <div className="public-form-header-text">
          <div className="brand-name">Virtual Doctor</div>
          <div className="sub">Acceso del equipo</div>
        </div>
      </header>

      <Suspense fallback={<div className="empty">Cargando…</div>}>
        <AccesoForm />
      </Suspense>
    </div>
  );
}
