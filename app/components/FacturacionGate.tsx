'use client';

import { useEffect, useState } from 'react';

type Status = 'loading' | 'locked' | 'otp' | 'unlocked' | 'needs-setup';

// Segunda verificación en dos pasos (2FA real), compartida por Facturación y
// Backup: primero la contraseña de seguridad (distinta a la de inicio de
// sesión), luego un código de 6 dígitos que llega por SMS al teléfono del
// usuario. La primera vez que alguien entra, crea la contraseña aquí mismo;
// después queda desbloqueada unas horas por navegador, no hay que repetir
// los dos pasos en cada clic.
export default function FacturacionGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/facturacion')
      .then((r) => r.json())
      .then((d) => {
        if (d.unlocked) setStatus('unlocked');
        else if (!d.hasPassword) setStatus('needs-setup');
        else setStatus('locked');
      })
      .catch(() => setStatus('locked'));
  }, []);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/facturacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo verificar');
      setPhoneHint(data.phoneHint || '');
      setCode('');
      setStatus('otp');
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/facturacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-otp', code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo verificar');
      setStatus('unlocked');
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSetup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/facturacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setStatus('locked');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') return <div className="empty">Cargando…</div>;
  if (status === 'unlocked') return <>{children}</>;

  if (status === 'needs-setup') {
    return (
      <div className="card gate-card">
        <h3>Crea la contraseña de seguridad</h3>
        <p className="hint">
          Es una segunda contraseña, distinta a la de tu inicio de sesión. Junto con un código por SMS, protege la
          entrada a Facturación y a Backup.
        </p>
        <form onSubmit={submitSetup}>
          <label className="field"><span>Nueva contraseña</span>
            <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="field" style={{ marginTop: 10 }}><span>Confirmar contraseña</span>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
          {error && <p className="status-line error">{error}</p>}
          <button className="primary" type="submit" disabled={submitting} style={{ marginTop: 10 }}>
            {submitting ? 'Guardando…' : 'Crear contraseña'}
          </button>
        </form>
      </div>
    );
  }

  if (status === 'otp') {
    return (
      <div className="card gate-card">
        <h3>Código de verificación</h3>
        <p className="hint">
          Te mandamos un código de 6 dígitos por SMS al teléfono que termina en {phoneHint || '····'}. Vence en 5
          minutos.
        </p>
        <form onSubmit={submitCode}>
          <label className="field"><span>Código</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          {error && <p className="status-line error">{error}</p>}
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" onClick={() => setStatus('locked')} disabled={submitting}>Atrás</button>
            <button className="primary" type="submit" disabled={submitting || code.length !== 6}>
              {submitting ? 'Verificando…' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card gate-card">
      <h3>Área protegida</h3>
      <p className="hint">Escribe la contraseña de seguridad. Después te pediremos un código por SMS.</p>
      <form onSubmit={submitPassword}>
        <label className="field"><span>Contraseña</span>
          <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="status-line error">{error}</p>}
        <button className="primary" type="submit" disabled={submitting} style={{ marginTop: 10 }}>
          {submitting ? 'Verificando…' : 'Continuar'}
        </button>
      </form>
    </div>
  );
}
