'use client';

import { IntakeForm, TEJIDOS_BLANDOS_OPCIONES, CABEZA_CUELLO_OPCIONES } from '@/lib/intake';
import { moduleConfig } from '@/lib/modules';
import { buildOdontogramaSummary } from '@/lib/odontograma-positions';
import Odontogram from './Odontogram';

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

function YesNo({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="yesno">
      <button type="button" className={value ? 'active' : ''} disabled={disabled} onClick={() => onChange(true)}>Sí</button>
      <button type="button" className={!value ? 'active' : ''} disabled={disabled} onClick={() => onChange(false)}>No</button>
    </div>
  );
}

export default function IntakeFormView({ value, onChange, readOnly }: Props) {
  function set<K extends keyof IntakeForm>(key: K, v: IntakeForm[K]) {
    onChange({ ...value, [key]: v });
  }
  function setFamiliar<K extends keyof IntakeForm['familiar']>(key: K, v: IntakeForm['familiar'][K]) {
    onChange({ ...value, familiar: { ...value.familiar, [key]: v } });
  }
  function setPersonal<K extends keyof IntakeForm['personal']>(key: K, v: IntakeForm['personal'][K]) {
    onChange({ ...value, personal: { ...value.personal, [key]: v } });
  }
  function setEnfermedad<K extends keyof IntakeForm['enfermedades']>(key: K, v: IntakeForm['enfermedades'][K]) {
    onChange({ ...value, enfermedades: { ...value.enfermedades, [key]: v } });
  }
  function setHabito<K extends keyof IntakeForm['habitos']>(key: K, v: IntakeForm['habitos'][K]) {
    onChange({ ...value, habitos: { ...value.habitos, [key]: v } });
  }
  function toggleListItem(list: 'tejidosBlandos' | 'cabezaCuello', item: string) {
    const current = value.exploracion[list];
    const next = current.includes(item) ? current.filter((i) => i !== item) : [...current, item];
    onChange({ ...value, exploracion: { ...value.exploracion, [list]: next } });
  }
  function setSignoVital<K extends keyof IntakeForm['exploracion']['signosVitales']>(key: K, v: string) {
    onChange({ ...value, exploracion: { ...value.exploracion, signosVitales: { ...value.exploracion.signosVitales, [key]: v } } });
  }

  const disabled = !!readOnly;

  return (
    <div className="intake">
      <fieldset disabled={disabled}>
        <section className="card">
          <h3>Motivo de consulta</h3>
          <Field label="Motivo de consulta">
            <textarea value={value.motivoConsulta} onChange={(e) => set('motivoConsulta', e.target.value)} rows={2} />
          </Field>
          <Field label="Referido por">
            <input type="text" value={value.referidoPor} onChange={(e) => set('referidoPor', e.target.value)} />
          </Field>
        </section>

        <section className="card">
          <h3>Antecedentes familiares</h3>
          <Field label="Descripción">
            <textarea value={value.antecedentesFamiliares} onChange={(e) => set('antecedentesFamiliares', e.target.value)} rows={2} />
          </Field>
          <div className="checkrow">
            {(['diabetes', 'hta', 'cancer', 'obesidad'] as const).map((k) => (
              <label key={k} className="checkbox">
                <input type="checkbox" checked={value.familiar[k]} disabled={disabled} onChange={(e) => setFamiliar(k, e.target.checked)} />
                {k === 'hta' ? 'HTA' : k[0].toUpperCase() + k.slice(1)}
              </label>
            ))}
          </div>
          <Field label="Otros">
            <input type="text" value={value.familiar.otros} onChange={(e) => setFamiliar('otros', e.target.value)} />
          </Field>
        </section>

        <section className="card">
          <h3>Antecedentes personales</h3>
          <div className="grid2">
            <div>
              <div className="qrow"><span>¿Está bajo medicamento actualmente?</span><YesNo value={value.personal.bajoMedicamento} disabled={disabled} onChange={(v) => setPersonal('bajoMedicamento', v)} /></div>
              {value.personal.bajoMedicamento && (
                <Field label="Indique la causa">
                  <input type="text" value={value.personal.bajoMedicamentoCausa} onChange={(e) => setPersonal('bajoMedicamentoCausa', e.target.value)} />
                </Field>
              )}
              <div className="qrow"><span>¿Toma algún medicamento?</span><YesNo value={value.personal.tomaMedicamento} disabled={disabled} onChange={(v) => setPersonal('tomaMedicamento', v)} /></div>
              {value.personal.tomaMedicamento && (
                <Field label="¿Cuál(es)?">
                  <input type="text" value={value.personal.tomaMedicamentoCual} onChange={(e) => setPersonal('tomaMedicamentoCual', e.target.value)} />
                </Field>
              )}
            </div>
            <div>
              <div className="qrow"><span>¿Ha estado hospitalizado?</span><YesNo value={value.personal.hospitalizado} disabled={disabled} onChange={(v) => setPersonal('hospitalizado', v)} /></div>
              {value.personal.hospitalizado && (
                <Field label="Indique la causa">
                  <input type="text" value={value.personal.hospitalizadoCausa} onChange={(e) => setPersonal('hospitalizadoCausa', e.target.value)} />
                </Field>
              )}
              <div className="qrow"><span>¿Alérgico a medicamento o alimento?</span><YesNo value={value.personal.alergico} disabled={disabled} onChange={(v) => setPersonal('alergico', v)} /></div>
              {value.personal.alergico && (
                <Field label="Indique cuál(es)">
                  <input type="text" value={value.personal.alergicoCual} onChange={(e) => setPersonal('alergicoCual', e.target.value)} />
                </Field>
              )}
            </div>
          </div>
          <div className="qrow"><span>¿Está usted embarazada?</span><YesNo value={value.personal.embarazada} disabled={disabled} onChange={(v) => setPersonal('embarazada', v)} /></div>
          {value.personal.embarazada && (
            <Field label="¿En qué mes?">
              <input type="text" value={value.personal.embarazadaMes} onChange={(e) => setPersonal('embarazadaMes', e.target.value)} />
            </Field>
          )}
        </section>

        <section className="card">
          <h3>¿Padece o ha padecido alguna de las siguientes enfermedades?</h3>
          <div className="checkrow wrap">
            {(Object.keys(value.enfermedades) as (keyof IntakeForm['enfermedades'])[]).map((k) => (
              <label key={k} className="checkbox">
                <input type="checkbox" checked={value.enfermedades[k]} disabled={disabled} onChange={(e) => setEnfermedad(k, e.target.checked)} />
                {enfermedadLabel(k)}
              </label>
            ))}
          </div>
          <Field label="Indique si existe alguna condición no descrita">
            <input type="text" value={value.condicionNoDescrita} onChange={(e) => set('condicionNoDescrita', e.target.value)} />
          </Field>
        </section>

        <section className="card">
          <h3>Hábitos</h3>
          <div className="grid2">
            <Field label="¿Fuma?"><input type="text" value={value.habitos.fuma} onChange={(e) => setHabito('fuma', e.target.value)} /></Field>
            <Field label="¿Aprieta o rechina los dientes?"><input type="text" value={value.habitos.aprietaORechinaDientes} onChange={(e) => setHabito('aprietaORechinaDientes', e.target.value)} /></Field>
            <Field label="¿Muerde objetos con los dientes?"><input type="text" value={value.habitos.muerdeObjetos} onChange={(e) => setHabito('muerdeObjetos', e.target.value)} /></Field>
            {moduleConfig.habitosDentales && (
              <>
            <Field label="¿Cuántas veces al día se cepilla?"><input type="text" value={value.habitos.cepilladoVecesDia} onChange={(e) => setHabito('cepilladoVecesDia', e.target.value)} /></Field>
            <Field label="¿Usa hilo dental?"><input type="text" value={value.habitos.usaHiloDental} onChange={(e) => setHabito('usaHiloDental', e.target.value)} /></Field>
            <Field label="Última visita al dentista y por qué"><input type="text" value={value.habitos.ultimaVisitaDentista} onChange={(e) => setHabito('ultimaVisitaDentista', e.target.value)} /></Field>
              </>
            )}
          </div>
        </section>

        <section className="card">
          <h3>Exploración de tejidos blandos</h3>
          <div className="checkrow wrap">
            {TEJIDOS_BLANDOS_OPCIONES.map((opt) => (
              <label key={opt} className="checkbox">
                <input type="checkbox" checked={value.exploracion.tejidosBlandos.includes(opt)} disabled={disabled} onChange={() => toggleListItem('tejidosBlandos', opt)} />
                {opt}
              </label>
            ))}
          </div>
          <Field label="Observaciones">
            <textarea value={value.exploracion.tejidosObservaciones} onChange={(e) => onChange({ ...value, exploracion: { ...value.exploracion, tejidosObservaciones: e.target.value } })} rows={2} />
          </Field>
        </section>

        <section className="card">
          <h3>Exploración cabeza y cuello</h3>
          <div className="checkrow wrap">
            {CABEZA_CUELLO_OPCIONES.map((opt) => (
              <label key={opt} className="checkbox">
                <input type="checkbox" checked={value.exploracion.cabezaCuello.includes(opt)} disabled={disabled} onChange={() => toggleListItem('cabezaCuello', opt)} />
                {opt}
              </label>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>Signos vitales</h3>
          <div className="grid5">
            <Field label="PA"><input type="text" value={value.exploracion.signosVitales.pa} onChange={(e) => setSignoVital('pa', e.target.value)} /></Field>
            <Field label="FC"><input type="text" value={value.exploracion.signosVitales.fc} onChange={(e) => setSignoVital('fc', e.target.value)} /></Field>
            <Field label="O2"><input type="text" value={value.exploracion.signosVitales.o2} onChange={(e) => setSignoVital('o2', e.target.value)} /></Field>
            <Field label="Temp"><input type="text" value={value.exploracion.signosVitales.temp} onChange={(e) => setSignoVital('temp', e.target.value)} /></Field>
            <Field label="Peso"><input type="text" value={value.exploracion.signosVitales.peso} onChange={(e) => setSignoVital('peso', e.target.value)} /></Field>
          </div>
        </section>

        <section className="card">
          <h3>Diagnóstico y plan</h3>
          <Field label="Diagnóstico">
            <textarea value={value.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} rows={3} />
          </Field>
          <Field label="Plan de tratamiento">
            <textarea value={value.planTratamiento} onChange={(e) => set('planTratamiento', e.target.value)} rows={3} />
          </Field>
          <Field label="Pronóstico">
            <textarea value={value.pronostico} onChange={(e) => set('pronostico', e.target.value)} rows={2} />
          </Field>
        </section>

        {moduleConfig.odontograma && (
        <section className="card">
          <h3>Odontograma y periodontograma</h3>
          <p className="hint">Haz clic en la corona de una pieza para registrar hallazgos (ej. Do, PM, C), o en la raíz para registrar la profundidad de sondaje (0-10 mm).</p>
          <Odontogram
            corona={value.odontograma}
            raiz={value.periodontograma}
            onChangeCorona={(next) => onChange({ ...value, odontograma: next })}
            onChangeRaiz={(next) => onChange({ ...value, periodontograma: next })}
            readOnly={disabled}
          />
          {(Object.keys(value.odontograma).length > 0 || Object.keys(value.periodontograma).length > 0) && (
            <p className="odontograma-summary">{buildOdontogramaSummary(value.odontograma, value.periodontograma)}</p>
          )}
        </section>
        )}

        <section className="card">
          <h3>Declaración del paciente</h3>
          <label className="checkbox declaracion-text">
            <input type="checkbox" checked={value.declaracionAceptada} disabled={disabled} onChange={(e) => set('declaracionAceptada', e.target.checked)} />
            <span>
              Declaro que la información proporcionada en esta historia clínica es verdadera y completa, según mi
              conocimiento. Me comprometo a informar al odontólogo cualquier cambio en mi estado de salud,
              diagnóstico, medicación, alergia, embarazo o tratamiento médico que pueda influir en mi atención
              médica y odontológica. La firma de esta historia acredita y autoriza al odontólogo y personal dentro
              de la consulta a revisar, tomar estudios, explorar físicamente, toma de fotografías, toma de videos
              con fines que el profesional convenga.
            </span>
          </label>
          <p className="hint">Al imprimir la ficha se generan las líneas de firma del paciente y del profesional para firmar en papel.</p>
        </section>
      </fieldset>
    </div>
  );
}

function enfermedadLabel(key: string) {
  const labels: Record<string, string> = {
    anemia: 'Anemia',
    asma: 'Asma',
    gastritis: 'Gastritis',
    cancer: 'Cáncer',
    sida: 'S.I.D.A',
    sinusitis: 'Sinusitis',
    diabetes: 'Diabetes',
    problemasHigado: 'Problemas de hígado',
    hipoxia: 'Hipoxia',
    neurologicos: 'Neurológicos',
    problemasRenales: 'Problemas renales',
    fiebreReumatica: 'Fiebre reumática',
    hipertension: 'Hipertensión arterial',
    alcoholismo: 'Alcoholismo',
    covid19: 'COVID-19',
  };
  return labels[key] || key;
}
