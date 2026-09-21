'use client';

import Link from 'next/link';
import FacturacionGate from '../components/FacturacionGate';
import UsersMetrics from '../components/UsersMetrics';
import ProfessionalProfileCard from '../components/ProfessionalProfileCard';

function SetupContent() {
  return (
    <div className="page">
      <div className="ficha-header">
        <div>
          <Link href="/" className="back-link">← Volver</Link>
          <h1>Setup</h1>
        </div>
      </div>

      <div className="cta-row setup-grid">
        <Link href="/facturacion" className="cta cta-fact">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>
          <span>Facturación<small>Ingresos, cobros y contraseña</small></span>
        </Link>
        <Link href="/backup" className="cta cta-backup">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
          <span>Backup<small>Respaldo protegido</small></span>
        </Link>
        <a href="/api/log" className="cta cta-setup">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
          <span>Registro de actividad<small>Descargar .log</small></span>
        </a>
      </div>

      <ProfessionalProfileCard />

      <UsersMetrics />
    </div>
  );
}

export default function SetupPage() {
  return (
    <FacturacionGate>
      <SetupContent />
    </FacturacionGate>
  );
}
