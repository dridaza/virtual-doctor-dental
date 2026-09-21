'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Profile = { email: string; nombre: string; fotoUrl: string; rol: string };

function resizeToDataUrl(file: File, max = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function iniciales(nombre: string, email: string) {
  const base = (nombre || email || '?').trim();
  const parts = base.split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export default function UserProfileCard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [foto, setFoto] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/user-profile')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setProfile(d); })
      .catch(() => {});
  }, []);

  if (!profile) return null;

  function openEditor() {
    setNombre(profile!.nombre);
    setFoto(undefined);
    setError(null);
    setOpen(true);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFoto(await resizeToDataUrl(file));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, ...(foto !== undefined ? { fotoDataUrl: foto } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setProfile(data);
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  const preview = foto === undefined ? profile.fotoUrl : foto || '';

  return (
    <>
      <button type="button" className="user-widget" onClick={openEditor} title="Editar mi perfil">
        <span className="user-widget-avatar">
          {profile.fotoUrl ? <img src={profile.fotoUrl} alt="" /> : iniciales(profile.nombre, profile.email)}
        </span>
        <span className="user-widget-text">
          <strong>{profile.nombre || 'Agrega tu nombre'}</strong>
          <small>{profile.email}</small>
          <span className="user-widget-role">{profile.rol}</span>
        </span>
      </button>

      {open && createPortal(
        <div className="modal-overlay overlay" onClick={() => !saving && setOpen(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header"><h2>Mi perfil</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: '8px 0 14px' }}>
              <button type="button" className="user-widget-avatar big" onClick={() => fileRef.current?.click()} title="Cambiar foto">
                {preview ? <img src={preview} alt="" /> : iniciales(nombre, profile.email)}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="tint-teal" onClick={() => fileRef.current?.click()}>Cambiar foto</button>
                {preview && <button type="button" onClick={() => setFoto(null)}>Quitar</button>}
              </div>
            </div>
            <label className="field">
              <span>Nombre</span>
              <input id="user-nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            </label>
            <p className="hint" style={{ marginTop: 8 }}>{profile.email}</p>
            {error && <p className="status-line error">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
              <button type="button" className="primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
