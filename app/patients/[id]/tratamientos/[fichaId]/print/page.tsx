'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PrintLetterhead from '@/app/components/PrintLetterhead';
import { getProtocolo, TratamientoFicha } from '@/lib/tratamiento-protocolos';

export default function TratamientoPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const fichaId = params.fichaId as string;
  const [patient, setPatient] = useState<{ name: string; numeroHistoriaClinica: string } | null>(null);
  const [ficha, setFicha] = useState<TratamientoFicha | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/patients/${id}`).then((r) => r.json()),
      fetch(`/api/patients/${id}/tratamientos`).then((r) => r.json()),
    ]).then(([p, d]) => {
      if (p.patient) setPatient(p.patient);
      setFicha((d.fichas || []).find((x: TratamientoFicha) => x.id === fichaId) || null);
    });
  }, [id, fichaId]);

  if (!patient || !ficha) return <div className="print-page"><p>Cargando…</p></div>;
  const protocolo = getProtocolo(ficha.protocolo);
  if (!protocolo) return <div className="print-page"><p>Protocolo desconocido.</p></div>;
  const fecha = new Date(ficha.fecha).toLocaleDateString('es', { dateStyle: 'long' });

  return (
    <div className="print-page">
      <div className="no-print"><button className="primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button></div>
      <div className="print-sheet">
        <PrintLetterhead title={protocolo.nombre} patientLine={patient.name} />
        <section className="print-block">
          <div className="print-grid">
            <div><strong>Paciente:</strong> {patient.name}</div>
            <div><strong>HC:</strong> {patient.numeroHistoriaClinica}</div>
            <div><strong>Fecha de inicio:</strong> {fecha}</div>
          </div>
        </section>

        <section className="print-block">
          <h2>Datos del tratamiento</h2>
          <div className="print-grid">
            {protocolo.campos.map((c) => (
              <div key={c.key}><strong>{c.label}:</strong> {ficha.campos[c.key] || '—'}</div>
            ))}
          </div>
        </section>

        <section className="print-block">
          <h2>Consentimiento informado</h2>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{protocolo.consentTexto}</p>
          <ul>
            {protocolo.consentChecks.map((c) => (
              <li key={c.key}>{ficha.consent[c.key] ? '☑' : '☐'} {c.label}</li>
            ))}
          </ul>
        </section>

        <section className="print-block signature-block">
          <div className="signature-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {ficha.firmaUrl && <img src={ficha.firmaUrl} alt="Firma del paciente" style={{ maxHeight: 70, maxWidth: 220 }} />}
            <div className="line" />
            <div className="sub"><strong>{ficha.firmante || patient.name}</strong><br />Firma del paciente</div>
          </div>
        </section>
      </div>

      {ficha.sesiones.length > 0 && (
        <div className="print-sheet">
          <PrintLetterhead title={`${protocolo.nombre} · Bitácora de sesiones`} patientLine={patient.name} />
          <section className="print-block">
            <table className="print-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  {protocolo.columnasSesion.map((c) => <th key={c.key}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {ficha.sesiones.map((s, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{new Date(s.fecha).toLocaleDateString('es', { dateStyle: 'short' })}</td>
                    {protocolo.columnasSesion.map((c) => <td key={c.key}>{s[c.key] || '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
