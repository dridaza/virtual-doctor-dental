import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { montoEnLetras } from './numero-a-letras';

export type ReceiptData = {
  folio: string;
  fecha: string;
  clinic: { name: string; address: string; phone: string; website: string; email: string };
  patient: { name: string; numeroHistoriaClinica: string; phone: string; email: string };
  concepto: string;
  cargo: number;
  pago: number;
  saldo: number;
  profesional: { nombre: string; titulo: string };
};

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Genera el PDF del recibo de pago con el formato clásico de un recibo
// contable mexicano: folio, datos del paciente y la clínica, concepto,
// importe con y sin letra, y espacio de firma.
export function buildReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new (PDFDocument as any)({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const accent = '#0071e3';
    const dim = '#6e6e73';
    const text = '#1d1d1f';

    // Encabezado
    const logoPath = path.join(process.cwd(), 'public', 'clinic-logo.png');
    let logoHeight = 0;
    try {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 45, { height: 45 });
        logoHeight = 45;
      }
    } catch {
      // si el logo no carga, el recibo se genera igual sin él
    }

    doc.fillColor(text).fontSize(18).font('Helvetica-Bold').text('RECIBO DE PAGO', 300, 48, { width: 245, align: 'right' });
    doc.fillColor(dim).fontSize(9).font('Helvetica').text(`Folio: ${data.folio}`, 300, 70, { width: 245, align: 'right' });
    doc.text(`Fecha: ${formatDate(data.fecha)}`, 300, 83, { width: 245, align: 'right' });

    let y = Math.max(logoHeight + 55, 110);
    doc.moveTo(50, y).lineTo(545, y).strokeColor(accent).lineWidth(1.5).stroke();
    y += 14;

    doc.fillColor(text).font('Helvetica-Bold').fontSize(11).text(data.clinic.name, 50, y);
    y += 15;
    doc.fillColor(dim).font('Helvetica').fontSize(9);
    if (data.clinic.address) { doc.text(data.clinic.address, 50, y); y += 12; }
    const clinicContact = [data.clinic.phone, data.clinic.email, data.clinic.website].filter(Boolean).join('  ·  ');
    if (clinicContact) { doc.text(clinicContact, 50, y); y += 12; }

    y += 12;

    // Datos del paciente
    doc.fillColor(text).font('Helvetica-Bold').fontSize(10).text('RECIBÍ DE', 50, y);
    y += 14;
    doc.font('Helvetica').fontSize(10);
    doc.text(`Nombre: ${data.patient.name}`, 50, y); y += 13;
    doc.text(`Núm. historia clínica: ${data.patient.numeroHistoriaClinica}`, 50, y); y += 13;
    const patientContact = [data.patient.phone, data.patient.email].filter(Boolean).join('  ·  ');
    if (patientContact) { doc.text(patientContact, 50, y); y += 13; }

    y += 14;

    // Tabla de concepto
    doc.rect(50, y, 495, 24).fill('#f2f2f4');
    doc.fillColor(dim).font('Helvetica-Bold').fontSize(9);
    doc.text('CONCEPTO', 60, y + 8, { width: 260 });
    doc.text('CARGO', 340, y + 8, { width: 90, align: 'right' });
    doc.text('PAGO', 445, y + 8, { width: 90, align: 'right' });
    y += 24;

    doc.rect(50, y, 495, 28).stroke('#e6e6ea');
    doc.fillColor(text).font('Helvetica').fontSize(10);
    doc.text(data.concepto || 'Consulta / tratamiento dental', 60, y + 9, { width: 260 });
    doc.text(data.cargo ? money(data.cargo) : '—', 340, y + 9, { width: 90, align: 'right' });
    doc.text(money(data.pago), 445, y + 9, { width: 90, align: 'right' });
    y += 40;

    // Total e importe en letra
    doc.font('Helvetica-Bold').fontSize(12).fillColor(accent);
    doc.text(`TOTAL PAGADO: ${money(data.pago)}`, 50, y, { width: 495, align: 'right' });
    y += 22;

    doc.font('Helvetica-Oblique').fontSize(9).fillColor(dim);
    doc.text(`SON: ${montoEnLetras(data.pago)}`, 50, y, { width: 495 });
    y += 20;

    if (data.saldo !== 0) {
      doc.font('Helvetica').fontSize(10).fillColor(text);
      doc.text(`Saldo pendiente: ${money(data.saldo)}`, 50, y, { width: 495, align: 'right' });
      y += 18;
    }

    y += 30;

    // Firma
    doc.moveTo(50, y).lineTo(250, y).strokeColor('#1d1d1f').lineWidth(0.75).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(dim);
    doc.text(data.profesional.nombre || 'Atendió', 50, y + 4, { width: 200 });
    if (data.profesional.titulo) doc.text(data.profesional.titulo, 50, y + 14, { width: 200 });

    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(dim);
    doc.text(
      'Este recibo es un comprobante interno de pago y no sustituye una factura fiscal (CFDI).',
      50,
      770,
      { width: 495, align: 'center' }
    );

    doc.end();
  });
}
