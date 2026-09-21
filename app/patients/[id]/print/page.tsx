'use client';

import { useEffect, useState } from 'react';
import { moduleConfig } from '@/lib/modules';
import { useParams } from 'next/navigation';
import PrintLetterhead from '@/app/components/PrintLetterhead';
import { IntakeForm, defaultIntake, TEJIDOS_BLANDOS_OPCIONES, CABEZA_CUELLO_OPCIONES } from '@/lib/intake';
import { TOOTH_POSITIONS, ODONTOGRAMA_IMG, buildOdontogramaSummary, getCrownRootRects } from '@/lib/odontograma-positions';

type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  dateOfBirth: string;
  numeroHistoriaClinica: string;
};

type LedgerRow = {
  id: string;
  source: 'invoice' | 'nota' | 'cita' | 'estimate';
  fecha: string | null;
  tratamiento: string;
  pieza: string;
  material: string;
  cargo: number;
  pago: number;
  saldo: number;
  citaId?: string;
  presupuesto?: number;
};

type TimelineEntry = {
  type: 'appointment' | 'note';
  date: string | null;
  title: string;
  detail: string;
  status?: string;
};

const SOURCE_LABEL: Record<LedgerRow['source'], string> = { invoice: 'Factura', nota: 'Nota', cita: 'Cita', estimate: 'Presupuesto' };

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es', { dateStyle: 'medium' });
}

function yn(v: boolean) {
  return v ? 'Sí' : 'No';
}

function calcAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

export default function PrintPage() {
  const params = useParams();
  const id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [intake, setIntake] = useState<IntakeForm>(defaultIntake());
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [saldoActual, setSaldoActual] = useState(0);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/patients/${id}`).then((r) => r.json()),
      fetch(`/api/patients/${id}/intake`).then((r) => r.json()),
      fetch(`/api/patients/${id}/ledger`).then((r) => r.json()),
      fetch(`/api/patients/${id}/history`).then((r) => r.json()),
    ]).then(([p, i, l, h]) => {
      if (p.patient) setPatient(p.patient);
      if (i.intake) setIntake(i.intake);
      setLedger(l.rows || []);
      setSaldoActual(l.saldoActual || 0);
      setTimeline(h.timeline || []);
      setReady(true);
    });
  }, [id]);

  if (!ready || !patient) {
    return <div className="print-page"><p>Cargando…</p></div>;
  }

  return (
    <div className="print-page">
      <div className="no-print">
        <button className="primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>

      <div className="print-sheet">
      <PrintHeader patient={patient} sheetTitle="Historia clínica" />

      <section className="print-block">
        <h2>Datos del paciente</h2>
        {intake.fotoUrl && <img src={intake.fotoUrl} alt={patient.name} className="print-patient-photo" />}
        <div className="print-grid">
          <div><strong>Nombre:</strong> {patient.name}</div>
          <div><strong>Núm. historia clínica:</strong> {patient.numeroHistoriaClinica}</div>
          <div><strong>Fecha de nacimiento:</strong> {formatDate(patient.dateOfBirth)}{calcAge(patient.dateOfBirth) !== null ? ` (${calcAge(patient.dateOfBirth)} años)` : ''}</div>
          <div><strong>Teléfono:</strong> {patient.phone || '—'}</div>
          <div><strong>Email:</strong> {patient.email || '—'}</div>
          <div><strong>Dirección:</strong> {[patient.address1, patient.city, patient.state].filter(Boolean).join(', ') || '—'}</div>
          <div><strong>Fecha de impresión:</strong> {formatDate(new Date().toISOString())}</div>
        </div>
      </section>

      <section className="print-block">
        <h2>Motivo de consulta</h2>
        <p>{intake.motivoConsulta || '—'}</p>
        <div className="print-grid">
          <div><strong>Referido por:</strong> {intake.referidoPor || '—'}</div>
        </div>
      </section>

      <section className="print-block">
        <h2>Antecedentes</h2>
        <p><strong>Familiares:</strong> {intake.antecedentesFamiliares || '—'}
          {' — '}
          {[intake.familiar.diabetes && 'Diabetes', intake.familiar.hta && 'HTA', intake.familiar.cancer && 'Cáncer', intake.familiar.obesidad && 'Obesidad', intake.familiar.otros].filter(Boolean).join(', ') || 'ninguno reportado'}
        </p>
        <div className="print-grid">
          <div><strong>¿Bajo medicamento?</strong> {yn(intake.personal.bajoMedicamento)} {intake.personal.bajoMedicamentoCausa}</div>
          <div><strong>¿Toma medicamento?</strong> {yn(intake.personal.tomaMedicamento)} {intake.personal.tomaMedicamentoCual}</div>
          <div><strong>¿Hospitalizado?</strong> {yn(intake.personal.hospitalizado)} {intake.personal.hospitalizadoCausa}</div>
          <div><strong>¿Alérgico?</strong> {yn(intake.personal.alergico)} {intake.personal.alergicoCual}</div>
          <div><strong>¿Embarazada?</strong> {yn(intake.personal.embarazada)} {intake.personal.embarazadaMes}</div>
        </div>
        <p><strong>Enfermedades:</strong> {Object.entries(intake.enfermedades).filter(([, v]) => v).map(([k]) => k).join(', ') || 'ninguna reportada'}</p>
        {intake.condicionNoDescrita && <p><strong>Otra condición:</strong> {intake.condicionNoDescrita}</p>}
      </section>

      <section className="print-block">
        <h2>Hábitos</h2>
        <div className="print-grid">
          <div><strong>Fuma:</strong> {intake.habitos.fuma || '—'}</div>
          <div><strong>Aprieta/rechina dientes:</strong> {intake.habitos.aprietaORechinaDientes || '—'}</div>
          <div><strong>Muerde objetos:</strong> {intake.habitos.muerdeObjetos || '—'}</div>
          {moduleConfig.habitosDentales && (
            <>
          <div><strong>Cepillado (veces/día):</strong> {intake.habitos.cepilladoVecesDia || '—'}</div>
          <div><strong>Usa hilo dental:</strong> {intake.habitos.usaHiloDental || '—'}</div>
          <div><strong>Última visita al dentista:</strong> {intake.habitos.ultimaVisitaDentista || '—'}</div>
            </>
          )}
        </div>
      </section>

      <section className="print-block">
        <h2>Exploración</h2>
        <p><strong>Tejidos blandos:</strong> {intake.exploracion.tejidosBlandos.length ? intake.exploracion.tejidosBlandos.join(', ') : 'sin alteraciones reportadas'}</p>
        {intake.exploracion.tejidosObservaciones && <p><strong>Observaciones:</strong> {intake.exploracion.tejidosObservaciones}</p>}
        <p><strong>Cabeza y cuello:</strong> {intake.exploracion.cabezaCuello.length ? intake.exploracion.cabezaCuello.join(', ') : '—'}</p>
        <div className="print-grid">
          <div><strong>PA:</strong> {intake.exploracion.signosVitales.pa || '—'}</div>
          <div><strong>FC:</strong> {intake.exploracion.signosVitales.fc || '—'}</div>
          <div><strong>O2:</strong> {intake.exploracion.signosVitales.o2 || '—'}</div>
          <div><strong>Temp:</strong> {intake.exploracion.signosVitales.temp || '—'}</div>
          <div><strong>Peso:</strong> {intake.exploracion.signosVitales.peso || '—'}</div>
        </div>
      </section>

      <section className="print-block">
        <h2>Diagnóstico y plan de tratamiento</h2>
        <p><strong>Diagnóstico:</strong> {intake.diagnostico || '—'}</p>
        <p><strong>Plan de tratamiento:</strong> {intake.planTratamiento || '—'}</p>
        <p><strong>Pronóstico:</strong> {intake.pronostico || '—'}</p>
      </section>

      {moduleConfig.odontograma && (
      <section className="print-block odontograma-block">
        <h2>Odontograma y periodontograma</h2>
        <div className="odontograma-canvas" style={{ aspectRatio: `${ODONTOGRAMA_IMG.width} / ${ODONTOGRAMA_IMG.height}` }}>
          <img src="/odontograma.png" alt="Odontograma" className="odontograma-img" />
          {Object.keys(TOOTH_POSITIONS).map((tooth) => {
            const { corona, raiz } = getCrownRootRects(tooth);
            return (
              <span key={tooth}>
                <span className="periodontograma-lines" style={{ left: `${raiz.xPct}%`, top: `${raiz.yPct}%`, width: `${raiz.wPct}%`, height: `${raiz.hPct}%` }} />
                {intake.odontograma[tooth] && (
                  <span className="tooth-print-tag" style={{ left: `${corona.xPct + corona.wPct / 2}%`, top: `${corona.yPct + corona.hPct - 4}%` }}>
                    {intake.odontograma[tooth]}
                  </span>
                )}
                {intake.periodontograma[tooth] && (
                  <span className="tooth-print-tag raiz" style={{ left: `${raiz.xPct + raiz.wPct / 2}%`, top: `${raiz.yPct + raiz.hPct - 4}%` }}>
                    {intake.periodontograma[tooth]}mm
                  </span>
                )}
              </span>
            );
          })}
        </div>
        {(Object.keys(intake.odontograma).length > 0 || Object.keys(intake.periodontograma).length > 0) && (
          <p className="odontograma-list">{buildOdontogramaSummary(intake.odontograma, intake.periodontograma)}</p>
        )}
      </section>
      )}

      <section className="print-block declaracion-block">
        <h2>Declaración del paciente</h2>
        <p>
          Declaro que la información proporcionada en esta historia clínica es verdadera y completa, según mi
          conocimiento. Me comprometo a informar al odontólogo cualquier cambio en mi estado de salud, diagnóstico,
          medicación, alergia, embarazo o tratamiento médico que pueda influir en mi atención médica y odontológica.
          La firma de esta historia acredita y autoriza al odontólogo y personal dentro de la consulta a revisar,
          tomar estudios, explorar físicamente, toma de fotografías, toma de videos con fines que el profesional
          convenga.
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
          <div className="sub">
            FIRMA DEL PACIENTE
            {(intake.firmaDibujoUrl || intake.firmaAutorizacion) && ` (firmado digitalmente${intake.firmaAutorizacion ? ' — ' + intake.firmaAutorizacion : ''})`}
          </div>
        </div>
        <div className="signature-line">
          <div className="line" />
          <div className="sub">FIRMA DEL PROFESIONAL</div>
        </div>
      </section>
      </div>

      <div className="print-sheet">
        <PrintHeader patient={patient} sheetTitle="Seguimiento" />
        <section className="print-block">
          <h2>Seguimiento</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Tratamiento</th>
                <th>Pieza</th>
                <th>Material</th>
                <th>Cargo</th>
              </tr>
            </thead>
            <tbody>
              {ledger.filter((row) => row.source === 'nota' || row.source === 'cita' || row.source === 'estimate').map((row) => (
                <tr key={row.id}>
                  <td>{SOURCE_LABEL[row.source]}</td>
                  <td>{formatDate(row.fecha)}</td>
                  <td>{row.tratamiento}</td>
                  <td>{row.pieza || '—'}</td>
                  <td>{row.material || '—'}</td>
                  <td>{row.source === 'estimate' ? `Presup. ${money(row.presupuesto || 0)}` : row.cargo ? money(row.cargo) : '—'}</td>
                </tr>
              ))}
              {ledger.filter((row) => row.source === 'nota' || row.source === 'cita' || row.source === 'estimate').length === 0 && (
                <tr><td colSpan={6}>Sin visitas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <div className="print-sheet">
        <PrintHeader patient={patient} sheetTitle="Facturación" />
        <section className="print-block">
          <h2>Facturación</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Cargo</th>
                <th>Pago</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {ledger.filter((row) => row.source === 'cita' || !!row.citaId || row.cargo !== 0 || row.pago !== 0).map((row) => (
                <tr key={row.id}>
                  <td>{SOURCE_LABEL[row.source]}</td>
                  <td>{formatDate(row.fecha)}</td>
                  <td>{row.tratamiento}</td>
                  <td>{row.cargo ? money(row.cargo) : '—'}</td>
                  <td>{row.pago ? money(row.pago) : '—'}</td>
                  <td>{money(row.saldo)}</td>
                </tr>
              ))}
              {ledger.filter((row) => row.source === 'cita' || !!row.citaId || row.cargo !== 0 || row.pago !== 0).length === 0 && (
                <tr><td colSpan={6}>Sin cobros ni pagos registrados.</td></tr>
              )}
            </tbody>
          </table>
          <p className="print-total"><strong>Saldo actual: {money(saldoActual)}</strong></p>
        </section>
      </div>

      <div className="print-sheet">
        <PrintHeader patient={patient} sheetTitle="Citas" />
        <section className="print-block">
          <h2>Citas</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Título</th>
                <th>Detalle</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((entry, i) => (
                <tr key={i}>
                  <td>{entry.type === 'appointment' ? 'Cita' : 'Nota'}</td>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.title}</td>
                  <td>{entry.detail || '—'}</td>
                  <td>{entry.status || '—'}</td>
                </tr>
              ))}
              {timeline.length === 0 && (
                <tr><td colSpan={5}>Sin citas ni notas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function PrintHeader({ patient, sheetTitle }: { patient: Patient; sheetTitle: string }) {
  return <PrintLetterhead title={`Historia Clínica — ${sheetTitle}`} patientLine={`${patient.name} · ${patient.numeroHistoriaClinica}`} />;
}
