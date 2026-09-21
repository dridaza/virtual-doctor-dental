'use client';

import { IntakeForm } from '@/lib/intake';
import {
  ALERTAS_SPA,
  CHECKLIST_COFEPRIS,
  CHECKLIST_PROCEDIMIENTO,
  CONDICIONES_PIEL,
  FOTOTIPOS,
  SpaFicha,
  TIPOS_PIEL,
  USO_FPS,
} from '@/lib/spa-ficha';

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

function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Segmented({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly (readonly [string, string])[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="yesno" style={{ flexWrap: 'wrap' }}>
      {options.map(([k, label]) => (
        <button key={k} type="button" className={value === k ? 'active' : ''} disabled={disabled} onClick={() => onChange(value === k ? '' : k)}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Ficha de primera vez del módulo Spa (Galatea Med Spa): mismas ocho secciones que el formato en papel.
export default function SpaFichaView({ value, onChange, readOnly }: Props) {
  const disabled = !!readOnly;
  const spa = value.spa;

  function set<K extends keyof SpaFicha>(key: K, v: SpaFicha[K]) {
    onChange({ ...value, spa: { ...spa, [key]: v } });
  }
  function setMap(key: 'alertas' | 'condiciones' | 'checklist' | 'cofepris', k: string, v: boolean) {
    onChange({ ...value, spa: { ...spa, [key]: { ...spa[key], [k]: v } } });
  }
  function setGeneral<K extends 'motivoConsulta' | 'referidoPor'>(key: K, v: string) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="intake">
      <fieldset disabled={disabled} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
        <section className="card">
          <h3>1. Datos de identificación</h3>
          <p className="hint">Nombre, teléfono, correo y fecha de nacimiento están en los datos de contacto de arriba.</p>
          <div className="grid2">
            <Field label="Ocupación"><input type="text" value={spa.ocupacion} onChange={(e) => set('ocupacion', e.target.value)} /></Field>
            <Field label="Cómo nos conoció / referida por"><input type="text" value={value.referidoPor} onChange={(e) => setGeneral('referidoPor', e.target.value)} /></Field>
            <Field label="Contacto de emergencia"><input type="text" value={spa.emergenciaNombre} onChange={(e) => set('emergenciaNombre', e.target.value)} /></Field>
            <Field label="Teléfono de emergencia"><input type="text" value={spa.emergenciaTel} onChange={(e) => set('emergenciaTel', e.target.value)} /></Field>
          </div>
        </section>

        <section className="card">
          <h3>2. Motivo de consulta y autorizaciones iniciales</h3>
          <Field label="Motivo principal / objetivo"><textarea rows={2} value={value.motivoConsulta} onChange={(e) => setGeneral('motivoConsulta', e.target.value)} /></Field>
          <Field label="Tratamiento de interés"><input type="text" value={spa.tratamientoInteres} onChange={(e) => set('tratamientoInteres', e.target.value)} /></Field>
          <div className="checkrow wrap">
            <Check label="Autoriza apertura de expediente y valoración inicial" checked={spa.autorizaApertura} onChange={(v) => set('autorizaApertura', v)} />
            <Check label="Recibió/vio el aviso de privacidad" checked={spa.avisoPrivacidad} onChange={(v) => set('avisoPrivacidad', v)} />
            <Check label="Autoriza contacto para seguimiento o reacción" checked={spa.autorizaContacto} onChange={(v) => set('autorizaContacto', v)} />
          </div>
          <Field label="Autoriza fotografías clínicas">
            <Segmented options={[['si', 'Sí'], ['no', 'No']]} value={spa.fotosClinicas} onChange={(v) => set('fotosClinicas', v as SpaFicha['fotosClinicas'])} disabled={disabled} />
          </Field>
          <p className="hint">Esta ficha es de primera vez. Cada tratamiento debe conservar su consentimiento informado específico.</p>
        </section>

        <section className="card">
          <h3>3. Antecedentes importantes / alertas antes de tratamiento</h3>
          <div className="grid2">
            <Field label="Alergias"><input type="text" value={spa.alergias} onChange={(e) => set('alergias', e.target.value)} /></Field>
            <Field label="Medicamentos actuales"><input type="text" value={spa.medicamentosActuales} onChange={(e) => set('medicamentosActuales', e.target.value)} /></Field>
          </div>
          <div className="checkrow wrap">
            {ALERTAS_SPA.map(([k, label]) => (
              <Check key={k} label={label} checked={!!spa.alertas[k]} onChange={(v) => setMap('alertas', k, v)} />
            ))}
          </div>
          <Field label="Otra alerta"><input type="text" value={spa.otraAlerta} onChange={(e) => set('otraAlerta', e.target.value)} /></Field>
          <Field label="Observaciones"><textarea rows={2} value={spa.observaciones} onChange={(e) => set('observaciones', e.target.value)} /></Field>
        </section>

        <section className="card">
          <h3>4. Valoración profesional: piel y hábitos</h3>
          <Field label="Fototipo (Fitzpatrick)">
            <Segmented options={FOTOTIPOS.map((f) => [f, f] as const)} value={spa.fototipo} onChange={(v) => set('fototipo', v as SpaFicha['fototipo'])} disabled={disabled} />
          </Field>
          <Field label="Tipo de piel">
            <Segmented options={TIPOS_PIEL} value={spa.tipoPiel} onChange={(v) => set('tipoPiel', v)} disabled={disabled} />
          </Field>
          <div className="checkrow wrap">
            {CONDICIONES_PIEL.map(([k, label]) => (
              <Check key={k} label={label} checked={!!spa.condiciones[k]} onChange={(v) => setMap('condiciones', k, v)} />
            ))}
          </div>
          <Field label="Usa FPS">
            <Segmented options={USO_FPS} value={spa.usaFps} onChange={(v) => set('usaFps', v)} disabled={disabled} />
          </Field>
          <Field label="Rutina actual / activos"><textarea rows={2} value={spa.rutina} onChange={(e) => set('rutina', e.target.value)} /></Field>
          <Field label="Procedimientos previos y reacción"><textarea rows={2} value={spa.procedimientosPrevios} onChange={(e) => set('procedimientosPrevios', e.target.value)} /></Field>
        </section>

        <section className="card">
          <h3>5. Plan inicial y seguimiento profesional</h3>
          <Field label="Hallazgos de piel / zona a tratar"><textarea rows={2} value={spa.hallazgos} onChange={(e) => set('hallazgos', e.target.value)} /></Field>
          <Field label="Riesgos o contraindicaciones detectadas"><textarea rows={2} value={spa.riesgos} onChange={(e) => set('riesgos', e.target.value)} /></Field>
          <Field label="Plan sugerido / prioridad"><textarea rows={2} value={spa.planSugerido} onChange={(e) => set('planSugerido', e.target.value)} /></Field>
          <Field label="Tratamiento recomendado"><textarea rows={2} value={spa.tratamientoRecomendado} onChange={(e) => set('tratamientoRecomendado', e.target.value)} /></Field>
          <Field label="Cuidados iniciales o preparación antes de tratamiento"><textarea rows={2} value={spa.cuidadosIniciales} onChange={(e) => set('cuidadosIniciales', e.target.value)} /></Field>
          <Field label="Próxima cita / seguimiento"><input type="text" value={spa.proximaCita} onChange={(e) => set('proximaCita', e.target.value)} /></Field>
          <p className="hint">No iniciar procedimiento si hay contraindicación activa, datos incompletos o reacción no evaluada.</p>
        </section>

        <section className="card">
          <h3>6. Checklist rápido antes de agendar o realizar procedimiento</h3>
          <div className="checkrow wrap">
            {CHECKLIST_PROCEDIMIENTO.map(([k, label]) => (
              <Check key={k} label={label} checked={!!spa.checklist[k]} onChange={(v) => setMap('checklist', k, v)} />
            ))}
          </div>
        </section>

        <section className="card">
          <h3>7. Declaración y firmas</h3>
          <p className="hint">
            Declaro que la información proporcionada es verdadera y entiendo que debo avisar cualquier cambio de salud, medicamento,
            embarazo/lactancia, exposición solar o reacción previa antes de cada sesión. Esta ficha no sustituye el consentimiento
            específico de cada procedimiento.
          </p>
          <p className="hint">
            Firma del paciente: {value.firmaDibujoUrl ? 'firmada digitalmente desde el formulario' : value.firmaAutorizacion ? `nombre registrado: ${value.firmaAutorizacion}` : 'pendiente'}.
          </p>
          <div className="grid2">
            <Field label="Nombre del responsable"><input type="text" value={spa.nombreResponsable} onChange={(e) => set('nombreResponsable', e.target.value)} /></Field>
            <Field label="Fecha de firma"><input type="date" value={spa.fechaFirma} onChange={(e) => set('fechaFirma', e.target.value)} /></Field>
          </div>
        </section>

        <section className="card">
          <h3>8. Checklist normativo COFEPRIS para expediente inicial</h3>
          <div className="checkrow wrap">
            {CHECKLIST_COFEPRIS.map(([k, label]) => (
              <Check key={k} label={label} checked={!!spa.cofepris[k]} onChange={(v) => setMap('cofepris', k, v)} />
            ))}
          </div>
          <p className="hint">
            Marco de referencia operativo: Guía COFEPRIS de autoverificación para establecimientos de atención médica con fines estéticos
            sin procedimientos quirúrgicos; NOM-004-SSA3-2012 expediente clínico. Formato interno; no sustituye aviso, licencia,
            autorización ni visita sanitaria.
          </p>
        </section>
      </fieldset>
    </div>
  );
}
