import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export type RecetaPdfData = {
  fecha: string;
  clinic: { name: string; address: string; phone: string; website: string };
  patient: { name: string; numeroHistoriaClinica: string };
  medicamentos: string;
  indicaciones: string;
  profesional: { nombre: string; titulo: string; cedula: string; institucion: string; cedulaEspecialidad: string };
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Receta médica en PDF (tamaño carta): membrete de la clínica, paciente, fecha, Rp./, indicaciones y
// bloque del profesional con cédula, institución y firma.
export function buildRecetaPdf(data: RecetaPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new (PDFDocument as any)({ size: 'LETTER', margin: 54 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const accent = '#0071e3';
    const dim = '#6e6e73';
    const text = '#1d1d1f';
    const W = 612 - 108;

    // Membrete
    const logoPath = path.join(process.cwd(), 'public', 'clinic-logo.png');
    try {
      if (fs.existsSync(logoPath)) doc.image(logoPath, 612 - 54 - 90, 46, { fit: [90, 44], align: 'right' });
    } catch {
      /* sin logo */
    }
    doc.fillColor(text).font('Helvetica-Bold').fontSize(13).text(data.clinic.name, 54, 48, { width: W - 110 });
    doc.fillColor(dim).font('Helvetica').fontSize(8.5);
    const meta = [data.clinic.address, data.clinic.phone, data.clinic.website].filter(Boolean).join(' · ');
    if (meta) doc.text(meta, 54, doc.y + 1, { width: W - 110 });
    const pr = data.profesional;
    const creds = [pr.cedula && `Ced. Profesional: ${pr.cedula}`, pr.cedulaEspecialidad && `Ced. Esp.: ${pr.cedulaEspecialidad}`].filter(Boolean).join(' • ');
    if (creds) doc.text(creds, 54, doc.y + 1, { width: W - 110 });
    if (pr.institucion) doc.text(pr.institucion, 54, doc.y + 1, { width: W - 110 });

    let y = Math.max(doc.y, 96) + 8;
    doc.moveTo(54, y).lineTo(558, y).lineWidth(1.2).strokeColor(accent).stroke();
    y += 10;

    doc.fillColor(accent).font('Helvetica-Bold').fontSize(12).text('RECETA MÉDICA', 54, y);
    doc.fillColor(dim).font('Helvetica').fontSize(9).text(`Fecha: ${formatDate(data.fecha)}`, 54, y + 2, { width: W, align: 'right' });
    y += 22;

    doc.fillColor(text).font('Helvetica-Bold').fontSize(10).text('Paciente: ', 54, y, { continued: true });
    doc.font('Helvetica').text(`${data.patient.name}   ·   ${data.patient.numeroHistoriaClinica}`);
    y = doc.y + 14;

    doc.fillColor(accent).font('Helvetica-Bold').fontSize(13).text('Rp./', 54, y);
    doc.fillColor(text).font('Helvetica').fontSize(11).text(data.medicamentos, 54, doc.y + 4, { width: W, lineGap: 3 });

    if (data.indicaciones.trim()) {
      doc.moveDown(1.2);
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(11).text('Indicaciones', 54, doc.y);
      doc.fillColor(text).font('Helvetica').fontSize(10.5).text(data.indicaciones, 54, doc.y + 3, { width: W, lineGap: 3 });
    }

    // Firma del profesional (siempre al pie de la hoja)
    const yFirma = 640;
    doc.moveTo(190, yFirma).lineTo(422, yFirma).lineWidth(0.8).strokeColor(text).stroke();
    doc.fillColor(text).font('Helvetica-Bold').fontSize(10).text(pr.nombre || 'Firma del profesional', 54, yFirma + 5, { width: W, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor(dim);
    if (pr.titulo) doc.text(pr.titulo, { width: W, align: 'center' });
    const lineaCed = [pr.cedula && `Cédula profesional: ${pr.cedula}`, pr.institucion && pr.institucion].filter(Boolean).join(' · ');
    if (lineaCed) doc.text(lineaCed, { width: W, align: 'center' });
    if (data.clinic.address) doc.text(`Consultorio: ${data.clinic.address}`, { width: W, align: 'center' });

    doc.end();
  });
}
