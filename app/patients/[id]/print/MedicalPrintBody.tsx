import { IntakeForm } from '@/lib/intake';
import { APARATOS, EXPLORACION, GINECO, HEREDOFAMILIARES, NO_PATOLOGICOS, PATOLOGICOS, SEXOS, SIGNOS, imc } from '@/lib/medical-ficha';

type Patient = { name: string; phone: string; email: string; address1: string; city: string; state: string; dateOfBirth: string; numeroHistoriaClinica: string };

const dash = (v: string) => (v && v.trim() ? v : '—');
const box = (v: boolean) => (v ? '☑' : '☐');

function ageOf(dob: string): string {
  const d = new Date(dob);
  if (!dob || Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return String(age);
}

function fecha(v: string): string {
  const d = new Date(v);
  return !v || Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es', { dateStyle: 'medium' });
}

function Checks({ rows, map }: { rows: readonly (readonly [string, string])[]; map: Record<string, boolean> }) {
  return (
    <div className="print-grid">
      {rows.map(([k, label]) => <div key={k}>{box(!!map[k])} {label}</div>)}
    </div>
  );
}

function Pairs({ rows, map }: { rows: readonly (readonly [string, string])[]; map: Record<string, string> }) {
  const filled = rows.filter(([k]) => (map[k] || '').trim());
  if (!filled.length) return <p>—</p>;
  return (
    <div className="print-grid">
      {filled.map(([k, label]) => <div key={k}><strong>{label}:</strong> {map[k]}</div>)}
    </div>
  );
}

// Historia clínica médica impresa, con el orden del expediente clínico (NOM-004-SSA3-2012).
export default function MedicalPrintBody({ patient, intake }: { patient: Patient; intake: IntakeForm }) {
  const m = intake.medical;
  const sexo = SEXOS.find(([k]) => k === m.sexo)?.[1] || '—';
  const imcValor = imc(m.signos.peso || '', m.signos.talla || '');

  return (
    <>
      <section className="print-block">
        <h2>Ficha de identificación</h2>
        {intake.fotoUrl && <img src={intake.fotoUrl} alt={patient.name} className="print-patient-photo" />}
        <div className="print-grid">
          <div><strong>Nombre:</strong> {patient.name}</div>
          <div><strong>Núm. historia clínica:</strong> {patient.numeroHistoriaClinica}</div>
          <div><strong>Sexo:</strong> {sexo}</div>
          <div><strong>Fecha de nacimiento:</strong> {fecha(patient.dateOfBirth)} <strong>Edad:</strong> {ageOf(patient.dateOfBirth)}</div>
          <div><strong>Estado civil:</strong> {dash(m.estadoCivil)}</div>
          <div><strong>Escolaridad:</strong> {dash(m.escolaridad)}</div>
          <div><strong>Ocupación:</strong> {dash(m.ocupacion)}</div>
          <div><strong>Grupo sanguíneo:</strong> {dash(m.tipoSangre)}</div>
          <div><strong>Teléfono:</strong> {dash(patient.phone)}</div>
          <div><strong>Correo:</strong> {dash(patient.email)}</div>
          <div><strong>Domicilio:</strong> {[patient.address1, patient.city, patient.state].filter(Boolean).join(', ') || '—'}</div>
          <div><strong>Contacto de emergencia:</strong> {dash(m.emergenciaNombre)} — {dash(m.emergenciaTel)}</div>
        </div>
      </section>

      <section className="print-block">
        <h2>Motivo de consulta y padecimiento actual</h2>
        <p><strong>Motivo:</strong> {dash(intake.motivoConsulta)}</p>
        <p><strong>Padecimiento actual:</strong> {dash(m.padecimientoActual)}</p>
      </section>

      <section className="print-block">
        <h2>Antecedentes heredofamiliares</h2>
        <Checks rows={HEREDOFAMILIARES} map={m.heredofamiliares} />
        <p><strong>Otros / parentesco:</strong> {dash(m.heredofamiliaresOtros)}</p>
      </section>

      <section className="print-block">
        <h2>Antecedentes personales no patológicos</h2>
        <Pairs rows={NO_PATOLOGICOS} map={m.noPatologicos} />
      </section>

      <section className="print-block">
        <h2>Antecedentes personales patológicos</h2>
        <Checks rows={PATOLOGICOS} map={m.patologicos} />
        <p><strong>Cirugías:</strong> {dash(m.cirugias)}</p>
        <p><strong>Hospitalizaciones:</strong> {dash(m.hospitalizaciones)}</p>
        <p><strong>Transfusiones:</strong> {dash(m.transfusiones)} <strong>Traumatismos:</strong> {dash(m.traumatismos)}</p>
        <p><strong>Alergias a medicamentos:</strong> {dash(m.alergiasMedicamentos)} <strong>Otras alergias:</strong> {dash(m.alergiasOtras)}</p>
        <p><strong>Medicamentos actuales:</strong> {dash(m.medicamentosActuales)}</p>
      </section>

      <section className="print-block">
        <h2>Antecedentes gineco-obstétricos</h2>
        <Pairs rows={GINECO} map={m.gineco} />
        <p><strong>Embarazo actual:</strong> {m.embarazoActual === 'si' ? 'Sí' : m.embarazoActual === 'no' ? 'No' : '—'}</p>
      </section>

      <section className="print-block">
        <h2>Interrogatorio por aparatos y sistemas</h2>
        <Pairs rows={APARATOS} map={m.aparatos} />
      </section>

      <section className="print-block">
        <h2>Exploración física</h2>
        <div className="print-grid">
          {SIGNOS.filter(([k]) => (m.signos[k] || '').trim()).map(([k, label]) => <div key={k}><strong>{label}:</strong> {m.signos[k]}</div>)}
          {imcValor && <div><strong>IMC:</strong> {imcValor}</div>}
        </div>
        <Pairs rows={EXPLORACION} map={m.exploracion} />
      </section>

      <section className="print-block">
        <h2>Estudios de laboratorio y gabinete</h2>
        <p>{dash(m.estudios)}</p>
      </section>

      <section className="print-block">
        <h2>Diagnósticos, plan y pronóstico</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}><strong>Diagnósticos:</strong> {dash(m.diagnosticos)}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}><strong>Plan de tratamiento:</strong> {dash(m.plan)}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}><strong>Indicaciones:</strong> {dash(m.indicaciones)}</p>
        <p><strong>Pronóstico:</strong> {dash(m.pronostico)}</p>
      </section>

      <section className="print-block declaracion-block">
        <h2>Declaración del paciente</h2>
        <p>
          Declaro que la información proporcionada en esta historia clínica es verdadera y completa, según mi conocimiento, y me
          comprometo a informar a mi médico cualquier cambio en mi estado de salud, medicación, alergias o embarazo. Autorizo al
          médico y al personal de la consulta a realizar la valoración clínica correspondiente. Esta historia clínica no sustituye
          el consentimiento informado de cada procedimiento.
        </p>
      </section>

      <section className="print-block signature-block">
        <div className="signature-line">
          {intake.firmaDibujoUrl ? (
            <div className="line signed"><img src={intake.firmaDibujoUrl} alt="Firma del paciente" className="signature-img" /></div>
          ) : intake.firmaAutorizacion ? (
            <div className="line signed">{intake.firmaAutorizacion}</div>
          ) : (
            <div className="line" />
          )}
          <div className="sub">FIRMA DEL PACIENTE</div>
        </div>
        <div className="signature-line">
          <div className="line" />
          <div className="sub">NOMBRE Y FIRMA DEL MÉDICO</div>
        </div>
      </section>
    </>
  );
}
