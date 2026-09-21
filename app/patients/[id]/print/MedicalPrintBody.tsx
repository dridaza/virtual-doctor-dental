import { IntakeForm } from '@/lib/intake';
import { ANTECEDENTES, EXPLORACION_CAMPOS } from '@/lib/medical-ficha';
import { EsquemaVista } from '../../../components/EsquemaMarcado';

type Patient = { name: string; phone: string; email: string; address1: string; city: string; state: string; dateOfBirth: string; numeroHistoriaClinica: string };

const val = (v: string) => (v && v.trim() ? v : '');

function ageOf(dob: string): string {
  const d = new Date(dob);
  if (!dob || Number.isNaN(d.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return String(age);
}

function fecha(v: string): string {
  const d = new Date(v.length === 10 ? v + 'T12:00:00' : v);
  return !v || Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX');
}

function Line({ label, value, style }: { label: string; value: string; style?: React.CSSProperties }) {
  return (
    <div className="med-line" style={style}>
      <span className="med-line-label">{label}</span>
      <span className="med-line-value">{value}</span>
    </div>
  );
}

// Historia clínica médica impresa: réplica del formato del Dr. José Daza (dos páginas).
export default function MedicalPrintBody({ patient, intake }: { patient: Patient; intake: IntakeForm }) {
  const m = intake.medical;
  const domicilio = [patient.address1, patient.city, patient.state].filter(Boolean).join(', ');

  return (
    <div className="med-doc">
      <div className="med-title-row">
        <h1 className="med-title">Historia clínica</h1>
        <div className="med-fecha"><strong>Fecha:</strong> {fecha(m.fechaHistoria || intake.fechaFicha)}</div>
      </div>

      <h2 className="med-h">Datos personales</h2>
      <Line label="Nombre del paciente:" value={patient.name} />
      <div className="med-row">
        <Line label="Fecha de nacimiento:" value={fecha(patient.dateOfBirth)} />
        <Line label="Edad:" value={ageOf(patient.dateOfBirth)} />
        <div className="med-line">
          <span className="med-line-label">Sexo:</span>
          <span className="med-radio">{m.sexo === 'M' ? '◉' : '○'} M</span>
          <span className="med-radio">{m.sexo === 'F' ? '◉' : '○'} F</span>
        </div>
        <Line label="País:" value={val(m.pais)} />
      </div>
      <div className="med-row">
        <Line label="Ocupación:" value={val(m.ocupacion)} style={{ flex: 2 }} />
        <Line label="Estado civil:" value={val(m.estadoCivil)} />
      </div>
      <Line label="Domicilio:" value={domicilio} />
      <div className="med-row">
        <Line label="Teléfono:" value={val(patient.phone)} />
        <Line label="E-mail:" value={val(patient.email)} style={{ flex: 1.4 }} />
      </div>
      <div className="med-row">
        <Line label="Recomendado por:" value={val(intake.referidoPor)} />
        <Line label="Acompañante:" value={val(m.acompanante)} />
      </div>

      <h2 className="med-h">Antecedentes médicos personales</h2>
      <div className="med-ant">
        {ANTECEDENTES.map(([k, pregunta, detalle], i) => {
          const a = m.antecedentes[k];
          const bandas = Math.floor(i / 2) % 2 === 1;
          return (
            <div key={k} className={'med-ant-cell' + (bandas ? ' band' : '')}>
              <div className="med-ant-q">
                <div>{pregunta}</div>
                <div className="med-ant-d">{detalle} {val(a.detalle)}</div>
              </div>
              <div className="med-yn">
                <span className="med-box">{a.si === 'si' ? '✕' : ''}</span> Sí
                <span className="med-box">{a.si === 'no' ? '✕' : ''}</span> No
              </div>
            </div>
          );
        })}
        <div className="med-ant-cell band">
          <div className="med-ant-q">
            <div>¿Número de embarazos?</div>
            <div className="med-ant-d">E: Embarazos P: Partos A: Abortos C: Cesáreas</div>
          </div>
          <div className="med-yn">
            {(['e', 'p', 'a', 'c'] as const).map((k) => (
              <span key={k}><span className="med-box wide">{m.embarazos[k]}</span> {k.toUpperCase()} </span>
            ))}
          </div>
        </div>
      </div>

      <h2 className="med-h">Motivo de consulta</h2>
      <div className="med-q"><strong>● ¿Cuál es el motivo principal de su visita?</strong><div className="med-a">{val(intake.motivoConsulta)}</div></div>
      <div className="med-q"><strong>● ¿Qué procedimiento desea realizarse?</strong><div className="med-a">{val(m.procedimientoDeseado)}</div></div>
      <div className="med-q"><strong>● ¿Se ha realizado procedimientos estéticos antes?</strong><div className="med-a">{val(m.procedimientosPrevios)}</div></div>

      <h2 className="med-h">Exploración física</h2>
      <div className="med-exp">
        {EXPLORACION_CAMPOS.map(([k, label]) => (
          <div key={k} className="med-exp-cell">
            <span>{label}:</span>
            <span className="med-pill">{val(m.exploracion[k] || '')}</span>
          </div>
        ))}
      </div>

      <div className="med-page2">
        <EsquemaVista trazos={m.esquema} />
        <div className="med-dp">
          <div className="med-dp-box"><h3>Diagnóstico</h3><div className="med-dp-text">{val(m.diagnostico)}</div></div>
          <div className="med-dp-box"><h3>Plan</h3><div className="med-dp-text">{val(m.plan)}</div></div>
        </div>
        <div className="med-firmas">
          <div className="med-firma">
            {intake.firmaDibujoUrl ? <img src={intake.firmaDibujoUrl} alt="Firma del paciente" className="signature-img" /> : <div style={{ height: 40 }}>{val(intake.firmaAutorizacion)}</div>}
            <div className="med-firma-line" />
            <div>Firma del paciente</div>
          </div>
          <div className="med-firma">
            <div style={{ height: 40 }} />
            <div className="med-firma-line" />
            <div>Firma del médico</div>
          </div>
        </div>
      </div>
    </div>
  );
}
