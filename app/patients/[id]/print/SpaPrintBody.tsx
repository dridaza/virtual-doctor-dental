import { IntakeForm } from '@/lib/intake';
import { ALERTAS_SPA, CHECKLIST_COFEPRIS, CHECKLIST_PROCEDIMIENTO, CONDICIONES_PIEL, TIPOS_PIEL, USO_FPS } from '@/lib/spa-ficha';

type Patient = { name: string; phone: string; email: string; dateOfBirth: string; numeroHistoriaClinica: string };

const box = (v: boolean) => (v ? '☑' : '☐');
const dash = (v: string) => (v && v.trim() ? v : '—');

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
      {rows.map(([k, label]) => (
        <div key={k}>{box(!!map[k])} {label}</div>
      ))}
    </div>
  );
}

// Ficha de primera vez del spa, con las ocho secciones del formato en papel.
export default function SpaPrintBody({ patient, intake }: { patient: Patient; intake: IntakeForm }) {
  const s = intake.spa;
  const label = (rows: readonly (readonly [string, string])[], key: string) => rows.find(([k]) => k === key)?.[1] || '—';

  return (
    <>
      <section className="print-block">
        <h2>1. Datos de identificación</h2>
        {intake.fotoUrl && <img src={intake.fotoUrl} alt={patient.name} className="print-patient-photo" />}
        <div className="print-grid">
          <div><strong>Nombre:</strong> {patient.name}</div>
          <div><strong>Núm. historia clínica:</strong> {patient.numeroHistoriaClinica}</div>
          <div><strong>Fecha de nacimiento:</strong> {fecha(patient.dateOfBirth)} <strong>Edad:</strong> {ageOf(patient.dateOfBirth)}</div>
          <div><strong>Teléfono:</strong> {dash(patient.phone)}</div>
          <div><strong>Correo:</strong> {dash(patient.email)}</div>
          <div><strong>Ocupación:</strong> {dash(s.ocupacion)}</div>
          <div><strong>Contacto de emergencia:</strong> {dash(s.emergenciaNombre)} — {dash(s.emergenciaTel)}</div>
          <div><strong>Cómo nos conoció / referida por:</strong> {dash(intake.referidoPor)}</div>
        </div>
      </section>

      <section className="print-block">
        <h2>2. Motivo de consulta y autorizaciones iniciales</h2>
        <p><strong>Motivo principal / objetivo:</strong> {dash(intake.motivoConsulta)}</p>
        <p><strong>Tratamiento de interés:</strong> {dash(s.tratamientoInteres)}</p>
        <div className="print-grid">
          <div>{box(s.autorizaApertura)} Autoriza apertura de expediente y valoración inicial</div>
          <div>{box(s.avisoPrivacidad)} Recibió/vio aviso de privacidad</div>
          <div>{box(s.fotosClinicas === 'si')} Autoriza fotografías clínicas: {s.fotosClinicas === 'si' ? 'Sí' : s.fotosClinicas === 'no' ? 'No' : '—'}</div>
          <div>{box(s.autorizaContacto)} Autoriza contacto para seguimiento o reacción</div>
        </div>
      </section>

      <section className="print-block">
        <h2>3. Antecedentes importantes / alertas antes de tratamiento</h2>
        <div className="print-grid">
          <div><strong>Alergias:</strong> {dash(s.alergias)}</div>
          <div><strong>Medicamentos actuales:</strong> {dash(s.medicamentosActuales)}</div>
        </div>
        <Checks rows={ALERTAS_SPA} map={s.alertas} />
        <p><strong>Otra alerta:</strong> {dash(s.otraAlerta)}</p>
        <p><strong>Observaciones:</strong> {dash(s.observaciones)}</p>
      </section>

      <section className="print-block">
        <h2>4. Valoración profesional: piel y hábitos</h2>
        <div className="print-grid">
          <div><strong>Fototipo:</strong> {dash(s.fototipo)}</div>
          <div><strong>Piel:</strong> {s.tipoPiel ? label(TIPOS_PIEL, s.tipoPiel) : '—'}</div>
          <div><strong>Usa FPS:</strong> {s.usaFps ? label(USO_FPS, s.usaFps) : '—'}</div>
        </div>
        <Checks rows={CONDICIONES_PIEL} map={s.condiciones} />
        <p><strong>Rutina actual / activos:</strong> {dash(s.rutina)}</p>
        <p><strong>Procedimientos previos y reacción:</strong> {dash(s.procedimientosPrevios)}</p>
      </section>

      <section className="print-block">
        <h2>5. Plan inicial y seguimiento profesional</h2>
        <p><strong>Hallazgos de piel / zona a tratar:</strong> {dash(s.hallazgos)}</p>
        <p><strong>Riesgos o contraindicaciones detectadas:</strong> {dash(s.riesgos)}</p>
        <p><strong>Plan sugerido / prioridad:</strong> {dash(s.planSugerido)}</p>
        <p><strong>Tratamiento recomendado:</strong> {dash(s.tratamientoRecomendado)}</p>
        <p><strong>Cuidados iniciales o preparación antes de tratamiento:</strong> {dash(s.cuidadosIniciales)}</p>
        <p><strong>Próxima cita / seguimiento:</strong> {dash(s.proximaCita)}</p>
        <p><em>No iniciar procedimiento si hay contraindicación activa, datos incompletos o reacción no evaluada.</em></p>
      </section>

      <section className="print-block">
        <h2>6. Checklist antes de agendar o realizar procedimiento</h2>
        <Checks rows={CHECKLIST_PROCEDIMIENTO} map={s.checklist} />
      </section>

      <section className="print-block declaracion-block">
        <h2>7. Declaración y firmas</h2>
        <p>
          Declaro que la información proporcionada es verdadera y entiendo que debo avisar cualquier cambio de salud, medicamento,
          embarazo/lactancia, exposición solar o reacción previa antes de cada sesión. Esta ficha no sustituye el consentimiento
          específico de cada procedimiento.
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
          <div className="sub">FIRMA DEL PACIENTE {s.fechaFirma ? `· ${fecha(s.fechaFirma)}` : ''}</div>
        </div>
        <div className="signature-line">
          <div className="line" />
          <div className="sub">NOMBRE Y FIRMA DEL RESPONSABLE {s.nombreResponsable ? `· ${s.nombreResponsable}` : ''}</div>
        </div>
      </section>

      <section className="print-block">
        <h2>8. Checklist normativo COFEPRIS para expediente inicial</h2>
        <Checks rows={CHECKLIST_COFEPRIS} map={s.cofepris} />
        <p>
          <em>
            Marco de referencia operativo: Guía COFEPRIS de autoverificación para establecimientos de atención médica con fines estéticos
            sin procedimientos quirúrgicos; NOM-004-SSA3-2012 expediente clínico. Formato interno; no sustituye aviso, licencia,
            autorización ni visita sanitaria.
          </em>
        </p>
      </section>
    </>
  );
}
