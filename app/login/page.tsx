'use client';

import { CLINIC_LOGO } from '@/lib/clinic-logo';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [code, setCode] = useState('');
  const [phoneHint, setPhoneHint] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(step === 'code' ? { code } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
      if (data.step === 'code') {
        setPhoneHint(data.phoneHint || '');
        setCode('');
        setStep('code');
        return;
      }
      const next = searchParams.get('next') || '/';
      router.push(next);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" style={{ marginTop: 16 }} onSubmit={submit}>
      {step === 'code' ? (
        <>
          <p className="hint">
            Es tu primera vez. Te mandamos un código de 6 dígitos por SMS al teléfono que termina en {phoneHint || '····'}
            para confirmar que eres tú. Vence en 5 minutos.
          </p>
          <label className="field"><span>Código</span>
            <input id="login-code" type="text" inputMode="numeric" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </label>
          {error && <p className="status-line error">{error}</p>}
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" onClick={() => { setStep('form'); setError(null); }} disabled={loading}>Atrás</button>
            <button className="primary" type="submit" disabled={loading || code.length !== 6}>{loading ? 'Verificando…' : 'Confirmar y entrar'}</button>
          </div>
        </>
      ) : (
      <>
      <label className="field"><span>Email</span>
        <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
      </label>
      <label className="field" style={{ marginTop: 10 }}><span>Contraseña</span>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </label>
      <p className="hint" style={{ marginTop: 10 }}>
        Debes ser un usuario existente de esta cuenta de GoHighLevel. Si es tu primera vez, te mandaremos un
        código por SMS a tu teléfono de GoHighLevel y la contraseña que escribas quedará registrada como la tuya.
      </p>
      {error && <p className="status-line error">{error}</p>}
      <button className="primary public-form-submit" type="submit" disabled={loading} style={{ marginTop: 6 }}>
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
      </>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="public-form-page">
      <header className="public-form-header">
        {CLINIC_LOGO && <img src={CLINIC_LOGO} alt="Logo" />}
        <div className="public-form-header-text">
          <div className="brand-name">Virtual Doctor</div>
          <div className="sub">Inicia sesión con tu usuario de GoHighLevel</div>
        </div>
      </header>

      <Suspense fallback={<div className="empty">Cargando…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
