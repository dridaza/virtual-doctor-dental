export default function PrintLetterhead({ title, patientLine }: { title: string; patientLine?: string }) {
  const nombre = process.env.NEXT_PUBLIC_CLINIC_NAME;
  const direccion = process.env.NEXT_PUBLIC_CLINIC_ADDRESS;
  const telefono = process.env.NEXT_PUBLIC_CLINIC_PHONE;
  const web = process.env.NEXT_PUBLIC_CLINIC_WEBSITE;
  const meta = [direccion, telefono, web].filter(Boolean).join(' · ');

  return (
    <header className="print-letterhead">
      <div className="print-lh-row">
        <div className="print-lh-text">
          {nombre && <div className="print-clinic-name">{nombre}</div>}
          {meta && <div className="print-clinic-meta">{meta}</div>}
          <div className="print-letterhead-title">
            {title}
            {patientLine && <span className="print-lh-patient"> · {patientLine}</span>}
          </div>
        </div>
        <img src="/clinic-logo.png" alt="Logo" className="print-logo" />
      </div>
    </header>
  );
}
