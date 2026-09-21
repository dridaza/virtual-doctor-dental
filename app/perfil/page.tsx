'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Datos fijos del creador del programa.
const CREADOR = {
  titulo: 'Creador de Virtual Doctor',
  email: 'ivodaza@hotmail.com',
  rol: 'Diseñador',
  programa: 'Claude Code (Anthropic)',
  creacion: '2026-09-19',
};

export default function PerfilPage() {
  const [nombre, setNombre] = useState('Iván Daza');
  const [fotoUrl, setFotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.profile?.nombre) setNombre(d.profile.nombre);
        if (d.profile?.fotoUrl) setFotoUrl(d.profile.fotoUrl);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fecha = new Date(`${CREADOR.creacion}T12:00:00`).toLocaleDateString('es', { dateStyle: 'medium' });

  return (
    <div className="page">
      {playing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000' }}>
          <iframe
            src="/gato-doom/index.html"
            title="Tilcayo Rules"
            allow="fullscreen; autoplay"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
          <button
            type="button"
            className="danger"
            onClick={() => setPlaying(false)}
            style={{ position: 'absolute', top: 12, right: 12 }}
          >
            ✕ Cerrar juego
          </button>
        </div>
      )}
      <div className="ficha-header">
        <div>
          <Link href="/" className="back-link">← Volver</Link>
          <h1>Perfil del creador</h1>
        </div>
      </div>

      {loading ? (
        <div className="empty">Cargando…</div>
      ) : (
        <div className="card profile-card">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={nombre}
              className="profile-photo"
              onClick={() => setPlaying(true)}
              style={{ cursor: 'pointer' }}
            />
          ) : (
            <div className="profile-photo patient-photo-empty">+</div>
          )}
          <div className="profile-info">
            <h2>{nombre}</h2>
            <div className="profile-title">{CREADOR.titulo}</div>
            <div className="hint">{CREADOR.email}</div>
            <p className="profile-bio">
              {CREADOR.rol} · Programa usado: {CREADOR.programa}
            </p>
            <div className="hint">Creación del programa: {fecha}</div>
          </div>
        </div>
      )}
    </div>
  );
}
