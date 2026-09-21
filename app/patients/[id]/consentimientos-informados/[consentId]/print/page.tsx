'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PrintLetterhead from '@/app/components/PrintLetterhead';

type Consent = { id: string; fecha: string; procedimiento: string; texto: string; firmaUrl: string; firmante: string; profesionalNombre: string; profesionalTitulo: string; profesionalCedula: string };

export default function ConsentPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const consentId = params.consentId as string;
  const [patient, setPatient] = useState<{ name: string } | null>(null);
  const [c, setC] = useState<Consent | null>(null);

  useEffect(() => {
    Promise.all([fetch(`/api/patients/${id}`).then((r) => r.json()), fetch(`/api/patients/${id}/consentimientos-informados`).then((r) => r.json())]).then(([p, d]) => {
      if (p.patient) setPatient(p.patient);
      setC((d.consentimientos || []).find((x: Consent) => x.id === consentId) || null);
    });
  }, [id, consentId]);

  if (!patient || !c) return <div className="print-page"><p>Cargando…</p></div>;
  const fecha = new Date(c.fecha).toLocaleDateString('es', { dateStyle: 'long' });
  return (
    <div className="print-page">
      <div className="no-print"><button className="primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button></div>
      <div className="print-sheet">
        <PrintLetterhead title="Consentimiento informado" />
        <section className="print-block">
          <div className="print-grid">
            <div><strong>Paciente:</strong> {patient.name}</div>
            <div><strong>Fecha:</strong> {fecha}</div>
            <div><strong>Procedimiento:</strong> {c.procedimiento}</div>
          </div>
        </section>
        <section className="print-block"><p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{c.texto}</p></section>
        <section className="print-block signature-block">
          <div style={{ display: 'flex', gap: 40, justifyContent: 'space-around', flexWrap: 'wrap' }}>
            <div className="signature-line" style={{ textAlign: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.firmaUrl && <img src={c.firmaUrl} alt="Firma del paciente" style={{ maxHeight: 70, maxWidth: 220 }} />}
              <div className="line" />
              <div className="sub"><strong>{c.firmante || patient.name}</strong><br />Firma del paciente</div>
            </div>
            <div className="signature-line" style={{ textAlign: 'center' }}>
              <div style={{ height: 70 }} />
              <div className="line" />
              <div className="sub">
                <strong>{c.profesionalNombre || 'Profesional'}</strong>
                {c.profesionalTitulo && <><br />{c.profesionalTitulo}</>}
                {c.profesionalCedula && <><br />Cédula: {c.profesionalCedula}</>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
