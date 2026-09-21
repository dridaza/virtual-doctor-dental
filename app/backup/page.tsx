'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import FacturacionGate from '../components/FacturacionGate';

export default function BackupPage() {
  return (
    <FacturacionGate>
      <BackupContent />
    </FacturacionGate>
  );
}

function BackupContent() {
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadedAt, setDownloadedAt] = useState<Date | null>(null);

  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function downloadBackup(e: React.FormEvent) {
    e.preventDefault();
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo generar el backup');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : 'backup-pacientes.enc';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadedAt(new Date());
    } catch (err: any) {
      setDownloadError(err.message || 'Error desconocido');
    } finally {
      setDownloading(false);
    }
  }

  async function verifyBackup(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('password', verifyPassword);
      const res = await fetch('/api/backup/decrypt', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo verificar');
      setVerifyResult(`Backup válido: ${data.data.total} paciente(s), generado ${new Date(data.data.generatedAt).toLocaleString('es')}.`);
    } catch (err: any) {
      setVerifyResult(`Error: ${err.message || 'desconocido'}`);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="page">
      <div className="ficha-header">
        <div>
          <Link href="/" className="back-link">← Volver</Link>
          <h1>Backup de pacientes</h1>
        </div>
      </div>

      <div className="card">
        <h3>Descargar backup encriptado</h3>
        <p className="hint">
          Genera un archivo <code>.enc</code> con la lista de pacientes (nombre, teléfono, email, etiquetas, fecha de
          nacimiento, dirección) encriptado con AES-256 usando la contraseña que elijas abajo. Esa contraseña es tuya
          — guárdala bien, la necesitarás para abrir el archivo después; no queda guardada en ningún lugar. El
          archivo se descarga directamente a la carpeta de Descargas de tu navegador. Guárdalo tú donde prefieras
          (USB, Drive, OneDrive, etc.).
        </p>
        <form onSubmit={downloadBackup} className="grid2" style={{ alignItems: 'end', maxWidth: 480 }}>
          <label className="field">
            <span>Contraseña para encriptar este backup</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="primary" type="submit" disabled={downloading}>
            {downloading ? 'Generando…' : 'Descargar backup'}
          </button>
        </form>
        {downloadError && <p className="status-line error">Error: {downloadError}</p>}
        {downloadedAt && !downloadError && (
          <p className="status-line">Backup descargado a las {downloadedAt.toLocaleTimeString('es')}.</p>
        )}
      </div>

      <div className="card">
        <h3>Verificar / abrir un backup</h3>
        <p className="hint">Sube un archivo .enc y su contraseña para confirmar que abre correctamente.</p>
        <form onSubmit={verifyBackup} className="grid2" style={{ alignItems: 'end', maxWidth: 480 }}>
          <label className="field">
            <span>Archivo .enc</span>
            <input type="file" ref={fileRef} accept=".enc" required />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" required value={verifyPassword} onChange={(e) => setVerifyPassword(e.target.value)} />
          </label>
          <button className="primary" type="submit" disabled={verifying} style={{ gridColumn: 'span 2' }}>
            {verifying ? 'Verificando…' : 'Verificar backup'}
          </button>
        </form>
        {verifyResult && <p className="status-line">{verifyResult}</p>}
      </div>
    </div>
  );
}
