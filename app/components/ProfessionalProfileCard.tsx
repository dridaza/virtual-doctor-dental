'use client';

import { useEffect, useState } from 'react';
import { moduleConfig } from '@/lib/modules';

type Profile = { nombre: string; titulo: string; cedula: string; institucion: string; cedulaEspecialidad: string };

export default function ProfessionalProfileCard() {
  const [p, setP] = useState<Profile>({ nombre: '', titulo: '', cedula: '', institucion: '', cedulaEspecialidad: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/professional')
      .then((r) => r.json())
      .then((d) => { if (d.profile) setP(d.profile); })
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/professional', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo guardar');
      setMsg({ ok: true, text: moduleConfig.recetas ? 'Datos profesionales guardados. Se usarán en las recetas nuevas y en los recibos.' : 'Datos profesionales guardados. Se usarán en los recibos.' });
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Error desconocido' });
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value });

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3>{moduleConfig.recetas ? 'Datos profesionales (recetas y recibos)' : 'Datos profesionales (recibos)'}</h3>
      <p className="hint">
        Estos datos salen en cada receta: nombre completo, cédula profesional, institución que expidió el título, y el
        domicilio del consultorio que ya está en la configuración de la clínica.
      </p>
      {loading ? (
        <div className="empty">Cargando…</div>
      ) : (
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          <label className="field"><span>Nombre completo</span><input id="prof-nombre" value={p.nombre} onChange={set('nombre')} placeholder="Dr. Nombre Apellidos" /></label>
          <label className="field"><span>Título / especialidad</span><input id="prof-titulo" value={p.titulo} onChange={set('titulo')} placeholder={moduleConfig.tituloEjemplo} /></label>
          <label className="field"><span>Cédula profesional</span><input id="prof-cedula" value={p.cedula} onChange={set('cedula')} /></label>
          <label className="field"><span>Institución que expidió el título</span><input id="prof-inst" value={p.institucion} onChange={set('institucion')} placeholder="Universidad…" /></label>
          <label className="field"><span>Cédula de especialidad (opcional)</span><input id="prof-cedesp" value={p.cedulaEspecialidad} onChange={set('cedulaEspecialidad')} /></label>
          <div style={{ gridColumn: '1 / -1' }}>
            {msg && <p className={msg.ok ? 'hint' : 'status-line error'}>{msg.text}</p>}
            <button type="submit" className="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar datos profesionales'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
