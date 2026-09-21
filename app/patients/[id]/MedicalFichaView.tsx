'use client';

import { IntakeForm } from '@/lib/intake';
import {
  APARATOS,
  EXPLORACION,
  GINECO,
  HEREDOFAMILIARES,
  MedicalFicha,
  NO_PATOLOGICOS,
  PATOLOGICOS,
  SEXOS,
  SIGNOS,
  imc,
} from '@/lib/medical-ficha';

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

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

// Historia clínica médica (estructura del expediente clínico, NOM-004-SSA3-2012).
export default function MedicalFichaView({ value, onChange, readOnly }: Props) {
  const m = value.medical;

  function set<K extends keyof MedicalFicha>(key: K, v: MedicalFicha[K]) {
    onChange({ ...value, medical: { ...m, [key]: v } });
  }
  function setIn(key: 'heredofamiliares' | 'patologicos', k: string, v: boolean): void;
  function setIn(key: 'noPatologicos' | 'gineco' | 'aparatos' | 'signos' | 'exploracion', k: string, v: string): void;
  function setIn(key: 'heredofamiliares' | 'patologicos' | 'noPatologicos' | 'gineco' | 'aparatos' | 'signos' | 'exploracion', k: string, v: boolean | string) {
    onChange({ ...value, medical: { ...m, [key]: { ...(m[key] as Record<string, unknown>), [k]: v } } });
  }

  const imcValor = imc(m.signos.peso || '', m.signos.talla || '');

  return (
    <div className="intake">
      <fieldset disabled={!!readOnly} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
        <section className="card">
          <h3>1. Ficha de identificación</h3>
          <p className="hint">Nombre, teléfono, correo y fecha de nacimiento están en los datos de contacto de arriba.</p>
          <div className="grid2">
            <Field label="Sexo">
              <select value={m.sexo} onChange={(e) => set('sexo', e.target.value)}>
                <option value="">—</option>
                {SEXOS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </Field>
            <Field label="Estado civil"><input type="text" value={m.estadoCivil} onChange={(e) => set('estadoCivil', e.target.value)} /></Field>
            <Field label="Escolaridad"><input type="text" value={m.escolaridad} onChange={(e) => set('escolaridad', e.target.value)} /></Field>
            <Field label="Ocupación"><input type="text" value={m.ocupacion} onChange={(e) => set('ocupacion', e.target.value)} /></Field>
            <Field label="Grupo sanguíneo y Rh"><input type="text" value={m.tipoSangre} onChange={(e) => set('tipoSangre', e.target.value)} placeholder="O+" /></Field>
            <Field label="Referido por"><input type="text" value={value.referidoPor} onChange={(e) => onChange({ ...value, referidoPor: e.target.value })} /></Field>
            <Field label="Contacto de emergencia"><input type="text" value={m.emergenciaNombre} onChange={(e) => set('emergenciaNombre', e.target.value)} /></Field>
            <Field label="Teléfono de emergencia"><input type="text" value={m.emergenciaTel} onChange={(e) => set('emergenciaTel', e.target.value)} /></Field>
          </div>
        </section>

        <section className="card">
          <h3>2. Motivo de consulta y padecimiento actual</h3>
          <Field label="Motivo de consulta"><textarea rows={2} value={value.motivoConsulta} onChange={(e) => onChange({ ...value, motivoConsulta: e.target.value })} /></Field>
          <Field label="Padecimiento actual (inicio, evolución, síntomas, tratamientos previos)"><textarea rows={4} value={m.padecimientoActual} onChange={(e) => set('padecimientoActual', e.target.value)} /></Field>
        </section>

        <section className="card">
          <h3>3. Antecedentes heredofamiliares</h3>
          <div className="checkrow wrap">
            {HEREDOFAMILIARES.map(([k, label]) => <Check key={k} label={label} checked={!!m.heredofamiliares[k]} onChange={(v) => setIn('heredofamiliares', k, v)} />)}
          </div>
          <Field label="Otros / parentesco"><input type="text" value={m.heredofamiliaresOtros} onChange={(e) => set('heredofamiliaresOtros', e.target.value)} /></Field>
        </section>

        <section className="card">
          <h3>4. Antecedentes personales no patológicos</h3>
          <div className="grid2">
            {NO_PATOLOGICOS.map(([k, label]) => (
              <Field key={k} label={label}><input type="text" value={m.noPatologicos[k] || ''} onChange={(e) => setIn('noPatologicos', k, e.target.value)} /></Field>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>5. Antecedentes personales patológicos</h3>
          <div className="checkrow wrap">
            {PATOLOGICOS.map(([k, label]) => <Check key={k} label={label} checked={!!m.patologicos[k]} onChange={(v) => setIn('patologicos', k, v)} />)}
          </div>
          <div className="grid2">
            <Field label="Cirugías previas"><textarea rows={2} value={m.cirugias} onChange={(e) => set('cirugias', e.target.value)} /></Field>
            <Field label="Hospitalizaciones"><textarea rows={2} value={m.hospitalizaciones} onChange={(e) => set('hospitalizaciones', e.target.value)} /></Field>
            <Field label="Transfusiones"><input type="text" value={m.transfusiones} onChange={(e) => set('transfusiones', e.target.value)} /></Field>
            <Field label="Traumatismos / fracturas"><input type="text" value={m.traumatismos} onChange={(e) => set('traumatismos', e.target.value)} /></Field>
            <Field label="Alergias a medicamentos"><input type="text" value={m.alergiasMedicamentos} onChange={(e) => set('alergiasMedicamentos', e.target.value)} /></Field>
            <Field label="Otras alergias (alimentos, látex…)"><input type="text" value={m.alergiasOtras} onChange={(e) => set('alergiasOtras', e.target.value)} /></Field>
          </div>
          <Field label="Medicamentos actuales (dosis y horario)"><textarea rows={2} value={m.medicamentosActuales} onChange={(e) => set('medicamentosActuales', e.target.value)} /></Field>
        </section>

        <section className="card">
          <h3>6. Antecedentes gineco-obstétricos (si aplica)</h3>
          <div className="grid2">
            {GINECO.map(([k, label]) => <Field key={k} label={label}><input type="text" value={m.gineco[k] || ''} onChange={(e) => setIn('gineco', k, e.target.value)} /></Field>)}
          </div>
          <Field label="Embarazo actual">
            <div className="yesno">
              <button type="button" className={m.embarazoActual === 'si' ? 'active' : ''} onClick={() => set('embarazoActual', m.embarazoActual === 'si' ? '' : 'si')}>Sí</button>
              <button type="button" className={m.embarazoActual === 'no' ? 'active' : ''} onClick={() => set('embarazoActual', m.embarazoActual === 'no' ? '' : 'no')}>No</button>
            </div>
          </Field>
        </section>

        <section className="card">
          <h3>7. Interrogatorio por aparatos y sistemas</h3>
          <div className="grid2">
            {APARATOS.map(([k, label]) => <Field key={k} label={label}><textarea rows={2} value={m.aparatos[k] || ''} onChange={(e) => setIn('aparatos', k, e.target.value)} /></Field>)}
          </div>
        </section>

        <section className="card">
          <h3>8. Exploración física</h3>
          <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {SIGNOS.map(([k, label]) => <Field key={k} label={label}><input type="text" value={m.signos[k] || ''} onChange={(e) => setIn('signos', k, e.target.value)} /></Field>)}
            <Field label="IMC (calculado)"><input type="text" value={imcValor} readOnly /></Field>
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            {EXPLORACION.map(([k, label]) => <Field key={k} label={label}><textarea rows={2} value={m.exploracion[k] || ''} onChange={(e) => setIn('exploracion', k, e.target.value)} /></Field>)}
          </div>
        </section>

        <section className="card">
          <h3>9. Estudios de laboratorio y gabinete</h3>
          <Field label="Resultados relevantes (fecha, estudio, resultado)"><textarea rows={3} value={m.estudios} onChange={(e) => set('estudios', e.target.value)} /></Field>
        </section>

        <section className="card">
          <h3>10. Diagnósticos, plan y pronóstico</h3>
          <Field label="Diagnósticos o problemas clínicos (uno por línea, con CIE-10 si aplica)"><textarea rows={3} value={m.diagnosticos} onChange={(e) => set('diagnosticos', e.target.value)} /></Field>
          <Field label="Plan de tratamiento / indicación terapéutica"><textarea rows={3} value={m.plan} onChange={(e) => set('plan', e.target.value)} /></Field>
          <Field label="Indicaciones y recomendaciones al paciente"><textarea rows={2} value={m.indicaciones} onChange={(e) => set('indicaciones', e.target.value)} /></Field>
          <Field label="Pronóstico"><textarea rows={2} value={m.pronostico} onChange={(e) => set('pronostico', e.target.value)} /></Field>
        </section>

        <section className="card">
          <h3>11. Declaración y firma</h3>
          <p className="hint">
            Firma del paciente: {value.firmaDibujoUrl ? 'firmada digitalmente desde el formulario' : value.firmaAutorizacion ? `nombre registrado: ${value.firmaAutorizacion}` : 'pendiente'}.
          </p>
          <p className="hint">Cada procedimiento que lo requiera debe tener su consentimiento informado específico (pestaña Consentimientos).</p>
        </section>
      </fieldset>
    </div>
  );
}
