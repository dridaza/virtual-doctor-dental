'use client';

import { IntakeForm } from '@/lib/intake';
import { ANTECEDENTES, EXPLORACION_CAMPOS, MedicalFicha, Trazo } from '@/lib/medical-ficha';
import EsquemaMarcado from '../../components/EsquemaMarcado';

type Props = {
  value: IntakeForm;
  onChange: (next: IntakeForm) => void;
  readOnly?: boolean;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

// Historia clínica médica: copia del formato "Historia clínica" del Dr. José Daza.
export default function MedicalFichaView({ value, onChange, readOnly }: Props) {
  const m = value.medical;

  function set<K extends keyof MedicalFicha>(key: K, v: MedicalFicha[K]) {
    onChange({ ...value, medical: { ...m, [key]: v } });
  }
  function setAnt(k: string, patch: Partial<{ si: '' | 'si' | 'no'; detalle: string }>) {
    onChange({ ...value, medical: { ...m, antecedentes: { ...m.antecedentes, [k]: { ...m.antecedentes[k], ...patch } } } });
  }
  function setExp(k: string, v: string) {
    onChange({ ...value, medical: { ...m, exploracion: { ...m.exploracion, [k]: v } } });
  }
  function setEmb(k: 'e' | 'p' | 'a' | 'c', v: string) {
    onChange({ ...value, medical: { ...m, embarazos: { ...m.embarazos, [k]: v } } });
  }

  return (
    <div className="intake">
      <fieldset disabled={!!readOnly} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
        <section className="card">
          <h3>Datos personales</h3>
          <p className="hint">Nombre, fecha de nacimiento, teléfono, domicilio y correo están en los datos de contacto de arriba.</p>
          <div className="grid2">
            <Field label="Fecha de la historia"><input type="date" value={m.fechaHistoria} onChange={(e) => set('fechaHistoria', e.target.value)} /></Field>
            <Field label="Sexo">
              <div className="yesno">
                <button type="button" className={m.sexo === 'M' ? 'active' : ''} onClick={() => set('sexo', m.sexo === 'M' ? '' : 'M')}>M</button>
                <button type="button" className={m.sexo === 'F' ? 'active' : ''} onClick={() => set('sexo', m.sexo === 'F' ? '' : 'F')}>F</button>
              </div>
            </Field>
            <Field label="País"><input type="text" value={m.pais} onChange={(e) => set('pais', e.target.value)} /></Field>
            <Field label="Estado civil"><input type="text" value={m.estadoCivil} onChange={(e) => set('estadoCivil', e.target.value)} /></Field>
            <Field label="Ocupación"><input type="text" value={m.ocupacion} onChange={(e) => set('ocupacion', e.target.value)} /></Field>
            <Field label="Recomendado por"><input type="text" value={value.referidoPor} onChange={(e) => onChange({ ...value, referidoPor: e.target.value })} /></Field>
            <Field label="Acompañante"><input type="text" value={m.acompanante} onChange={(e) => set('acompanante', e.target.value)} /></Field>
          </div>
        </section>

        <section className="card">
          <h3>Antecedentes médicos personales</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {ANTECEDENTES.map(([k, pregunta, detalle]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) auto minmax(160px, 1.2fr)', gap: 10, alignItems: 'center' }}>
                <span>{pregunta}</span>
                <div className="yesno">
                  <button type="button" className={m.antecedentes[k].si === 'si' ? 'active' : ''} onClick={() => setAnt(k, { si: m.antecedentes[k].si === 'si' ? '' : 'si' })}>Sí</button>
                  <button type="button" className={m.antecedentes[k].si === 'no' ? 'active' : ''} onClick={() => setAnt(k, { si: m.antecedentes[k].si === 'no' ? '' : 'no' })}>No</button>
                </div>
                <input type="text" aria-label={`${pregunta} ${detalle}`} placeholder={detalle} value={m.antecedentes[k].detalle} onChange={(e) => setAnt(k, { detalle: e.target.value })} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) auto', gap: 10, alignItems: 'center' }}>
              <span>¿Número de embarazos? <span className="hint" style={{ margin: 0 }}>(E: embarazos · P: partos · A: abortos · C: cesáreas)</span></span>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['e', 'p', 'a', 'c'] as const).map((k) => (
                  <label key={k} className="field" style={{ width: 62 }}>
                    <span>{k.toUpperCase()}</span>
                    <input type="text" inputMode="numeric" value={m.embarazos[k]} onChange={(e) => setEmb(k, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <h3>Motivo de consulta</h3>
          <Field label="¿Cuál es el motivo principal de su visita?"><textarea rows={2} value={value.motivoConsulta} onChange={(e) => onChange({ ...value, motivoConsulta: e.target.value })} /></Field>
          <Field label="¿Qué procedimiento desea realizarse?"><textarea rows={2} value={m.procedimientoDeseado} onChange={(e) => set('procedimientoDeseado', e.target.value)} /></Field>
          <Field label="¿Se ha realizado procedimientos estéticos antes?"><textarea rows={2} value={m.procedimientosPrevios} onChange={(e) => set('procedimientosPrevios', e.target.value)} /></Field>
        </section>

        <section className="card">
          <h3>Exploración física</h3>
          <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            {EXPLORACION_CAMPOS.map(([k, label]) => (
              <Field key={k} label={label}><input type="text" value={m.exploracion[k] || ''} onChange={(e) => setExp(k, e.target.value)} /></Field>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>Esquemas</h3>
          <p className="hint">Marca con el dedo o el ratón sobre los esquemas (rostro, cuerpo, nariz y plano del implante). Se guardan solas.</p>
          <EsquemaMarcado trazos={m.esquema} onChange={(t: Trazo[]) => set('esquema', t)} readOnly={readOnly} />
        </section>

        <section className="card">
          <h3>Diagnóstico y plan</h3>
          <div className="grid2">
            <Field label="Diagnóstico"><textarea rows={8} value={m.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} /></Field>
            <Field label="Plan"><textarea rows={8} value={m.plan} onChange={(e) => set('plan', e.target.value)} /></Field>
          </div>
          <p className="hint">
            Firma del paciente: {value.firmaDibujoUrl ? 'firmada digitalmente desde el formulario' : value.firmaAutorizacion ? `nombre registrado: ${value.firmaAutorizacion}` : 'pendiente'}.
          </p>
        </section>
      </fieldset>
    </div>
  );
}
