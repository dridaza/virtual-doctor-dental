'use client';

import { useEffect, useState } from 'react';
import PrintLetterhead from '@/app/components/PrintLetterhead';
import { useParams } from 'next/navigation';

type Patient = { id: string; name: string; dateOfBirth: string; numeroHistoriaClinica: string };
type Receta = {
  id: string;
  fecha: string;
  medicamentos: string;
  indicaciones: string;
  profesionalNombre: string;
  profesionalTitulo: string;
  profesionalCedula?: string;
  profesionalInstitucion?: string;
  profesionalCedulaEspecialidad?: string;
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es', { dateStyle: 'long' });
}

export default function RecetaPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const recetaId = params.recetaId as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [receta, setReceta] = useState<Receta | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/patients/${id}`).then((r) => r.json()),
      fetch(`/api/patients/${id}/recetas`).then((r) => r.json()),
    ]).then(([p, r]) => {
      if (p.patient) setPatient(p.patient);
      const found = (r.recetas || []).find((x: Receta) => x.id === recetaId);
      if (found) setReceta(found);
      setReady(true);
    });
  }, [id, recetaId]);

  if (!ready || !patient || !receta) {
    return <div className="print-page receta-print"><p>Cargando…</p></div>;
  }

  return (
    <div className="print-page receta-print">
      <div className="no-print">
        <button className="primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>

      <div className="print-sheet">
      <PrintLetterhead title="Receta médica" />

      <section className="print-block">
        <div className="print-grid">
          <div><strong>Paciente:</strong> {patient.name}</div>
          <div><strong>Fecha de receta:</strong> {formatDate(receta.fecha)}</div>
        </div>
      </section>

      <section className="print-block receta-block">
        <h2>Rp./</h2>
        <p className="receta-text">{receta.medicamentos}</p>
        {receta.indicaciones && (
          <>
            <h2>Indicaciones</h2>
            <p className="receta-text">{receta.indicaciones}</p>
          </>
        )}
      </section>

      <section className="print-block signature-block">
        <div className="signature-line">
          <div className="line" />
          <div className="sub">
            <strong>{receta.profesionalNombre || 'FIRMA DEL PROFESIONAL'}</strong>
            {receta.profesionalTitulo && <><br />{receta.profesionalTitulo}</>}
            <br />Cédula profesional: {receta.profesionalCedula || '________________'}
            {receta.profesionalCedulaEspecialidad && <><br />Cédula de especialidad: {receta.profesionalCedulaEspecialidad}</>}
            <br />{receta.profesionalInstitucion ? `Expedida por: ${receta.profesionalInstitucion}` : 'Institución: ________________'}
            {process.env.NEXT_PUBLIC_CLINIC_ADDRESS && <><br />Consultorio: {process.env.NEXT_PUBLIC_CLINIC_ADDRESS}</>}
          </div>
        </div>
      </section>
      </div>

      <div className="print-sheet receta-sheet-2">

      <section className="print-block">
        <div className="print-grid">
          <div><strong>Paciente:</strong> {patient.name}</div>
          <div><strong>Fecha de receta:</strong> {formatDate(receta.fecha)}</div>
        </div>
      </section>

      <section className="print-block receta-block">
        <h2>Rp./</h2>
        <p className="receta-text">{receta.medicamentos}</p>
        {receta.indicaciones && (
          <>
            <h2>Indicaciones</h2>
            <p className="receta-text">{receta.indicaciones}</p>
          </>
        )}
      </section>

      <section className="print-block signature-block">
        <div className="signature-line">
          <div className="line" />
          <div className="sub">
            <strong>{receta.profesionalNombre || 'FIRMA DEL PROFESIONAL'}</strong>
            {receta.profesionalTitulo && <><br />{receta.profesionalTitulo}</>}
            <br />Cédula profesional: {receta.profesionalCedula || '________________'}
            {receta.profesionalCedulaEspecialidad && <><br />Cédula de especialidad: {receta.profesionalCedulaEspecialidad}</>}
            <br />{receta.profesionalInstitucion ? `Expedida por: ${receta.profesionalInstitucion}` : 'Institución: ________________'}
            {process.env.NEXT_PUBLIC_CLINIC_ADDRESS && <><br />Consultorio: {process.env.NEXT_PUBLIC_CLINIC_ADDRESS}</>}
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
