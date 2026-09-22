'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import ConsentimientosInformadosCard from '@/app/components/ConsentimientosInformadosCard';
import TratamientosSeguimientoCard from '@/app/components/TratamientosSeguimientoCard';
import MedicalFichaView from './MedicalFichaView';
import PaquetesCard, { PaqueteUI } from '../../components/PaquetesCard';
import { moduleConfig } from '@/lib/modules';
import SpaFichaView from './SpaFichaView';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import IntakeFormView from './IntakeForm';
import { IntakeForm, defaultIntake } from '@/lib/intake';
import { EmailButton } from '../../components/ContactActions';
import DuplicatesPanel from './DuplicatesPanel';
import FacturacionGate from '../../components/FacturacionGate';
import AgendarCita from '../../components/AgendarCita';
import NuevoPresupuesto from '../../components/NuevoPresupuesto';
import ImageEditor from '../../components/ImageEditor';
import CameraCapture from '../../components/CameraCapture';

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  country: string;
  dateOfBirth: string;
  tags: string[];
  dateAdded: string | null;
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
  estado?: string;
  notaTexto?: string;
  notaId?: string;
  citaId?: string;
  citaTitulo?: string;
  paqueteId?: string;
  soap?: { s: string; o: string; a: string; p: string };
  presupuesto?: number;
};

type TimelineEntry = {
  type: 'appointment' | 'note';
  date: string | null;
  title: string;
  detail: string;
  status?: string;
};

type Receta = {
  id: string;
  fecha: string;
  medicamentos: string;
  indicaciones: string;
  profesionalNombre: string;
  profesionalTitulo: string;
};

type ProfessionalProfile = { nombre: string; titulo: string; cedula: string; institucion: string };

type ConsentDoc = { url: string; name: string; uploadedAt: string };

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es', { dateStyle: 'medium' });
}

function sourceLabel(source: LedgerRow['source']) {
  return { invoice: 'Factura', nota: 'Nota', cita: 'Cita', estimate: 'Presupuesto' }[source];
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${p(d.getFullYear() % 100)}, Hrs. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toLocalInput(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function withinEditWindow(fecha: string | null, lockDays: number): boolean {
  if (!fecha || lockDays <= 0) return true;
  return (Date.now() - new Date(fecha).getTime()) / 86400000 <= lockDays;
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

function isInRange(fecha: string | null, range: 'hoy' | 'semana' | 'mes'): boolean {
  if (!fecha) return false;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (range === 'hoy') return d.toDateString() === now.toDateString();
  if (range === 'semana') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo && d <= now;
  }
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const text = { saving: 'Guardando…', saved: 'Guardado', error: 'Error al guardar' }[state];
  return <span className={`save-indicator ${state}`}>{text}</span>;
}

export default function PatientPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tab, setTab] = useState<'historia' | 'seguimiento' | 'facturacion' | 'recetas' | 'consentimientos' | 'citas'>('historia');

  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientSave, setPatientSave] = useState<SaveState>('idle');

  const [intake, setIntake] = useState<IntakeForm>(defaultIntake());
  const [intakeLoaded, setIntakeLoaded] = useState(false);
  const [intakeSave, setIntakeSave] = useState<SaveState>('idle');

  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [paquetes, setPaquetes] = useState<PaqueteUI[]>([]);
  const [saldoActual, setSaldoActual] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const [newVisit, setNewVisit] = useState({ fecha: '', tratamiento: '', pieza: '', material: '', cargo: '', pago: '' });
  const emptySoap = { s: '', o: '', a: '', p: '' };
  const [newSoap, setNewSoap] = useState(emptySoap);
  const [editSoap, setEditSoap] = useState(emptySoap);
  const [addingVisit, setAddingVisit] = useState(false);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ fecha: '', tratamiento: '', pieza: '', material: '', cargo: '', pago: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const [newPago, setNewPago] = useState({ fecha: '', concepto: '', cargo: '', pago: '' });
  const [addingPago, setAddingPago] = useState(false);
  const [reportRange, setReportRange] = useState<'hoy' | 'semana' | 'mes'>('hoy');

  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null);
  const [receiptResult, setReceiptResult] = useState<Record<string, { ok: boolean; message: string }>>({});

  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [recetasLoading, setRecetasLoading] = useState(true);
  const [sendingReceta, setSendingReceta] = useState<string | null>(null);
  const [newReceta, setNewReceta] = useState({ fecha: '', medicamentos: '', indicaciones: '' });
  const [addingReceta, setAddingReceta] = useState(false);
  const [professional, setProfessional] = useState<ProfessionalProfile>({ nombre: '', titulo: '', cedula: '', institucion: '' });

  const [consentUploading, setConsentUploading] = useState(false);
  const consentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/patients/${id}`).then((r) => r.json()).then((d) => { if (d.patient) setPatient(d.patient); });
    fetch(`/api/patients/${id}/intake`).then((r) => r.json()).then((d) => { if (d.intake) setIntake(d.intake); setIntakeLoaded(true); });
    fetch(`/api/patients/${id}/history`).then((r) => r.json()).then((d) => { if (d.timeline) setTimeline(d.timeline); });
    fetch('/api/professional').then((r) => r.json()).then((d) => { if (d.profile) setProfessional(d.profile); });
    loadLedger();
    if (moduleConfig.recetas) loadRecetas();
  }, [id]);

  const loadLedger = useCallback(() => {
    if (!id) return;
    setLedgerLoading(true);
    fetch(`/api/patients/${id}/ledger`)
      .then((r) => r.json())
      .then((d) => {
        setLedger(d.rows || []);
        setPaquetes(d.paquetes || []);
        setEditLockDays(typeof d.editLockDays === 'number' ? d.editLockDays : 45);
        setSaldoActual(d.saldoActual || 0);
      })
      .finally(() => setLedgerLoading(false));
  }, [id]);

  const loadRecetas = useCallback(() => {
    if (!id) return;
    setRecetasLoading(true);
    fetch(`/api/patients/${id}/recetas`)
      .then((r) => r.json())
      .then((d) => setRecetas(d.recetas || []))
      .finally(() => setRecetasLoading(false));
  }, [id]);

  // Autosave patient basic fields
  const patientTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function updatePatientField(field: keyof Patient, value: string) {
    if (!patient) return;
    const next = { ...patient, [field]: value };
    setPatient(next);
    setPatientSave('saving');
    if (patientTimeout.current) clearTimeout(patientTimeout.current);
    patientTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        });
        if (!res.ok) throw new Error();
        setPatientSave('saved');
        setTimeout(() => setPatientSave('idle'), 1500);
      } catch {
        setPatientSave('error');
      }
    }, 700);
  }

  // Autosave intake form
  const intakeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function updateIntake(next: IntakeForm) {
    setIntake(next);
    if (!intakeLoaded) return;
    setIntakeSave('saving');
    if (intakeTimeout.current) clearTimeout(intakeTimeout.current);
    intakeTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients/${id}/intake`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error();
        setIntakeSave('saved');
        setTimeout(() => setIntakeSave('idle'), 1500);
      } catch {
        setIntakeSave('error');
      }
    }, 900);
  }

  async function submitVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!newVisit.tratamiento.trim()) return;
    setAddingVisit(true);
    try {
      const res = await fetch(`/api/patients/${id}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: newVisit.fecha ? new Date(newVisit.fecha).toISOString() : new Date().toISOString(),
          tratamiento: newVisit.tratamiento,
          pieza: newVisit.pieza,
          material: newVisit.material,
          cargo: newVisit.cargo,
          pago: newVisit.pago,
          soap: moduleConfig.notasEvolucion ? newSoap : undefined,
        }),
      });
      if (res.ok) {
        setNewVisit({ fecha: '', tratamiento: '', pieza: '', material: '', cargo: '', pago: '' });
        setNewSoap(emptySoap);
        loadLedger();
      }
    } finally {
      setAddingVisit(false);
    }
  }

  function startEdit(row: LedgerRow) {
    setEditingRowId(row.id);
    setEditSoap(row.soap || emptySoap);
    setEditDraft({
      fecha: toLocalInput(row.fecha),
      tratamiento: row.tratamiento,
      pieza: row.pieza,
      material: row.material,
      cargo: row.cargo ? String(row.cargo) : '',
      pago: row.pago ? String(row.pago) : '',
    });
  }

  function cancelEdit() {
    setEditingRowId(null);
  }

  async function saveEdit() {
    if (!editingRowId) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/patients/${id}/ledger/${editingRowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: editDraft.fecha ? new Date(editDraft.fecha).toISOString() : new Date().toISOString(),
          tratamiento: editDraft.tratamiento,
          pieza: editDraft.pieza,
          material: editDraft.material,
          cargo: editDraft.cargo,
          pago: editDraft.pago,
          soap: moduleConfig.notasEvolucion ? editSoap : undefined,
        }),
      });
      if (res.ok) {
        setEditingRowId(null);
        loadLedger();
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteRow(row: LedgerRow) {
    if (!confirm('¿Eliminar esta visita del seguimiento?')) return;
    const res = await fetch(`/api/patients/${id}/ledger/${row.id}`, { method: 'DELETE' });
    if (res.ok) loadLedger();
  }

  async function sendReceipt(row: LedgerRow) {
    setSendingReceiptId(row.id);
    try {
      const res = await fetch(`/api/patients/${id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: row.fecha, concepto: row.tratamiento, cargo: row.cargo, pago: row.pago, saldo: row.saldo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el recibo');
      const canales = [data.emailSent && 'email', data.smsSent && 'SMS'].filter(Boolean) as string[];
      const detalle = data.errors?.length ? ` (${data.errors.join('; ')})` : '';
      setReceiptResult((prev) => ({
        ...prev,
        [row.id]: canales.length
          ? { ok: true, message: `Enviado por ${canales.join(' y ')}${detalle}` }
          : { ok: false, message: `PDF generado, pero no se pudo enviar${detalle || ' (sin email ni teléfono)'}` },
      }));
    } catch (err: any) {
      setReceiptResult((prev) => ({ ...prev, [row.id]: { ok: false, message: err.message || 'Error desconocido' } }));
    } finally {
      setSendingReceiptId(null);
    }
  }

  async function submitPago(e: React.FormEvent) {
    e.preventDefault();
    if (!newPago.concepto.trim()) return;
    setAddingPago(true);
    try {
      const res = await fetch(`/api/patients/${id}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: newPago.fecha ? new Date(newPago.fecha).toISOString() : new Date().toISOString(),
          tratamiento: newPago.concepto,
          pieza: '',
          material: '',
          cargo: newPago.cargo,
          pago: newPago.pago,
        }),
      });
      if (res.ok) {
        setNewPago({ fecha: '', concepto: '', cargo: '', pago: '' });
        loadLedger();
      }
    } finally {
      setAddingPago(false);
    }
  }

  async function submitReceta(e: React.FormEvent) {
    e.preventDefault();
    if (!newReceta.medicamentos.trim()) return;
    setAddingReceta(true);
    try {
      const res = await fetch(`/api/patients/${id}/recetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: newReceta.fecha ? new Date(newReceta.fecha).toISOString() : new Date().toISOString(),
          medicamentos: newReceta.medicamentos,
          indicaciones: newReceta.indicaciones,
        }),
      });
      if (res.ok) {
        setNewReceta({ fecha: '', medicamentos: '', indicaciones: '' });
        loadRecetas();
      }
    } finally {
      setAddingReceta(false);
    }
  }

  async function sendReceta(receta: Receta, via: { email?: boolean; sms?: boolean }) {
    setSendingReceta(receta.id);
    try {
      const res = await fetch(`/api/patients/${id}/recetas/${receta.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(via),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) alert(via.email ? 'Receta enviada por email.' : 'Receta enviada por SMS.');
      else alert(d.error || (d.errors || []).join('\n') || 'No se pudo enviar la receta.');
    } finally {
      setSendingReceta(null);
    }
  }

  async function deleteReceta(receta: Receta) {
    if (!confirm('¿Eliminar esta receta?')) return;
    const res = await fetch(`/api/patients/${id}/recetas/${receta.id}`, { method: 'DELETE' });
    if (res.ok) loadRecetas();
  }

  async function onConsentSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setConsentUploading(true);
    try {
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('name', file.name);
      const res = await fetch(`/api/patients/${id}/consentimientos`, { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok && data.consentimientos) {
        setIntake((prev) => ({ ...prev, consentimientos: data.consentimientos }));
      }
    } finally {
      setConsentUploading(false);
    }
  }

  async function deleteConsent(doc: ConsentDoc) {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;
    const res = await fetch(`/api/patients/${id}/consentimientos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: doc.url }),
    });
    const data = await res.json();
    if (res.ok && data.consentimientos) {
      setIntake((prev) => ({ ...prev, consentimientos: data.consentimientos }));
    }
  }

  const [showGallery, setShowGallery] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const [deletingImg, setDeletingImg] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [editorBlob, setEditorBlob] = useState<Blob | null>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const galleryCameraRef = useRef<HTMLInputElement>(null);

  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editLockDays, setEditLockDays] = useState(45);
  const [sendingForm, setSendingForm] = useState(false);
  const [sendFormResult, setSendFormResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showAgendar, setShowAgendar] = useState(false);
  const [showPresupuesto, setShowPresupuesto] = useState(false);
  const [showPago, setShowPago] = useState(false);
  const [estimateMsg, setEstimateMsg] = useState<Record<string, string>>({});
  const [sendingEstimate, setSendingEstimate] = useState<string | null>(null);

  async function sendEstimateRow(row: LedgerRow, send: 'email' | 'sms') {
    setSendingEstimate(row.id + send);
    try {
      const res = await fetch(`/api/patients/${id}/estimates/${row.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ send }),
      });
      const d = await res.json();
      setEstimateMsg((p) => ({ ...p, [row.id]: d.message || d.error || 'Sin respuesta' }));
    } catch (e: any) {
      setEstimateMsg((p) => ({ ...p, [row.id]: e.message || 'Error desconocido' }));
    } finally {
      setSendingEstimate(null);
    }
  }
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  useEffect(() => {
    if (!showShareForm || !id) return;
    fetch(`/api/patients/${id}/formulario-link`).then((r) => r.json()).then((d) => setShareUrl(d.url || ''));
  }, [showShareForm, id]);

  async function sendFormulario() {
    setSendingForm(true);
    setSendFormResult(null);
    try {
      const res = await fetch(`/api/patients/${id}/send-formulario`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar');
      setSendFormResult({ ok: true, message: `Enviado por ${data.canal}` });
    } catch (err: any) {
      setSendFormResult({ ok: false, message: err.message || 'Error desconocido' });
    } finally {
      setSendingForm(false);
    }
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      // clipboard API not available; the user can still select and copy manually
    }
  }

  async function confirmDeletePatient() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el paciente');
      router.push('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Error desconocido');
    } finally {
      setDeleting(false);
    }
  }

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  function resizeImageToBlob(file: File, maxDimension = 480, quality = 0.75): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('No se pudo leer la imagen'));
        img.onload = () => {
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('No se pudo procesar la imagen')); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', quality);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoUploading(true);
    try {
      const blob = await resizeImageToBlob(file);
      const form = new FormData();
      form.append('file', blob, 'foto.jpg');
      const res = await fetch(`/api/patients/${id}/photo`, { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok && data.fotoUrl) {
        setIntake((prev) => ({ ...prev, fotoUrl: data.fotoUrl }));
      }
    } finally {
      setPhotoUploading(false);
    }
  }

  async function uploadGalleryBlob(blob: Blob, name: string) {
    setGalleryUploading(true);
    setGalleryError('');
    try {
      const form = new FormData();
      form.append('file', blob, name);
      const res = await fetch(`/api/patients/${id}/images`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir la imagen');
      setIntake((prev) => ({ ...prev, imagenes: data.imagenes }));
    } catch (err: any) {
      setGalleryError(err.message || 'No se pudo subir la imagen');
    } finally {
      setGalleryUploading(false);
    }
  }

  // "Subir foto", pegar (Ctrl+V) y la cámara del celular pasan primero por el editor, para poder
  // recortar antes de guardar; "Confirmar" ahí llama a uploadGalleryBlob.
  function onGalleryFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setEditorBlob(file);
  }

  useEffect(() => {
    if (!showGallery) return;
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items || []).find((it) => it.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        setEditorBlob(file);
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [showGallery]);

  // Botón explícito para pegar (además del Ctrl+V): lee el portapapeles directamente, sin
  // depender de que el usuario sepa que puede pegar con el teclado.
  async function pegarDelPortapapeles() {
    setGalleryError('');
    try {
      if (!navigator.clipboard?.read) throw new Error('Este navegador no permite leer el portapapeles con un botón; copia la imagen y presiona Ctrl+V (Cmd+V en Mac) dentro de esta ventana.');
      const items = await navigator.clipboard.read();
      let blob: Blob | null = null;
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) { blob = await item.getType(type); break; }
      }
      if (!blob) throw new Error('No hay ninguna imagen copiada. Copia una imagen (clic derecho → Copiar imagen, o una captura de pantalla) e inténtalo de nuevo.');
      setEditorBlob(blob);
    } catch (err: any) {
      setGalleryError(err?.message || 'No se pudo leer el portapapeles. Copia la imagen e inténtalo de nuevo.');
    }
  }

  async function deleteGalleryImage(url: string) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    setDeletingImg(url);
    try {
      const res = await fetch(`/api/patients/${id}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (res.ok) setIntake((prev) => ({ ...prev, imagenes: data.imagenes }));
    } finally {
      setDeletingImg(null);
    }
  }

  if (!patient) {
    return <div className="page"><div className="empty">Cargando paciente…</div></div>;
  }

  return (
    <div className="page page-wide">
      <div className="ficha-header">
        <div className="ficha-header-identity">
          <div className="patient-photo-wrap">
            <button
              type="button"
              className="patient-photo-btn"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              title={intake.fotoUrl ? 'Cambiar foto' : 'Agregar foto'}
            >
              {intake.fotoUrl ? (
                <img src={intake.fotoUrl} alt={patient.name} className="patient-photo" />
              ) : (
                <span className="patient-photo patient-photo-empty">{photoUploading ? '…' : '+'}</span>
              )}
            </button>
            {!intake.fotoUrl && <span className="patient-photo-label">{photoUploading ? 'Subiendo…' : 'Agregar foto'}</span>}
            <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoSelected} hidden />
          </div>
          <div>
            <Link href="/" className="back-link">← Volver</Link>
            <h1>{patient.name}</h1>
            <div className="hc-number">{patient.numeroHistoriaClinica}</div>
          </div>
        </div>
        <div className="controls">
          <button type="button" className="primary" onClick={() => setShowAgendar(true)}>Agendar cita</button>
          <button type="button" className="tint-amber" onClick={() => setShowPago(true)}>Crear pago</button>
          <button type="button" className="success" onClick={() => setShowPresupuesto(true)}>Presupuesto</button>
          {moduleConfig.recetas && <button type="button" className="button tint-teal" onClick={() => setTab('recetas')}>Receta</button>}
          <Link href={`/patients/${id}/print`} target="_blank" className="button tint-teal">Imprimir ficha</Link>
          <button type="button" className="tint-violet" onClick={() => setShowShareForm(true)}>Compartir formulario</button>
          <button type="button" className="tint-amber" onClick={() => setShowDuplicates(true)}>Posibles duplicados</button>
          <button type="button" className="danger" onClick={() => setShowDeleteConfirm(true)}>Eliminar paciente</button>
        </div>
      </div>

      <div className="card">
        <div className="contact-grid">
          <Field label="Nombre" value={patient.firstName} onSave={(v) => updatePatientField('firstName', v)} />
          <Field label="Apellido" value={patient.lastName} onSave={(v) => updatePatientField('lastName', v)} />
          <Field label="Teléfono" value={patient.phone} onSave={(v) => updatePatientField('phone', v)} />
          <Field label="Email" value={patient.email} onSave={(v) => updatePatientField('email', v)} extra={patient.email ? <EmailButton contactId={patient.id} email={patient.email} patientName={patient.name} /> : null} />
          <Field
            label="Fecha de nacimiento"
            value={patient.dateOfBirth?.slice(0, 10) || ''}
            type="date"
            onSave={(v) => updatePatientField('dateOfBirth', v)}
            extra={calcAge(patient.dateOfBirth) !== null ? <span className="age-badge">{calcAge(patient.dateOfBirth)} años</span> : null}
          />
          <Field label="Dirección" value={patient.address1} onSave={(v) => updatePatientField('address1', v)} />
          <Field label="Ciudad" value={patient.city} onSave={(v) => updatePatientField('city', v)} />
          <Field label="Estado" value={patient.state} onSave={(v) => updatePatientField('state', v)} />
        </div>
        <SaveIndicator state={patientSave} />
      </div>

      <div className="tabs">
        <button className={tab === 'historia' ? 'active' : ''} onClick={() => setTab('historia')}>Historia clínica</button>
        <button className={tab === 'seguimiento' ? 'active' : ''} onClick={() => setTab('seguimiento')}>Seguimiento</button>
        <button className={tab === 'facturacion' ? 'active' : ''} onClick={() => setTab('facturacion')}>
          Facturación
        </button>
        {moduleConfig.recetas && <button className={tab === 'recetas' ? 'active' : ''} onClick={() => setTab('recetas')}>Recetas</button>}
        <button className={tab === 'consentimientos' ? 'active' : ''} onClick={() => setTab('consentimientos')}>Consentimientos</button>
        <button className={tab === 'citas' ? 'active' : ''} onClick={() => setTab('citas')}>Citas</button>
      </div>

      {tab === 'historia' && (
        <div>
          <div className="tab-toolbar"><SaveIndicator state={intakeSave} /></div>
          {moduleConfig.id === 'spa' ? <SpaFichaView value={intake} onChange={updateIntake} /> : moduleConfig.id === 'medical' ? <MedicalFichaView value={intake} onChange={updateIntake} /> : <IntakeFormView value={intake} onChange={updateIntake} />}
        </div>
      )}

      {tab === 'seguimiento' && (
        <div>
          <div className="tab-toolbar" style={{ gap: 8 }}>
            <button type="button" className="success" onClick={() => setShowPresupuesto(true)}>+ Presupuesto</button>
            <button type="button" onClick={() => setShowGallery(true)}>
              Imágenes {intake.imagenes.length > 0 && <span className="pill">{intake.imagenes.length}</span>}
            </button>
          </div>
          {moduleConfig.paquetes && patient && (
            <PaquetesCard patientId={id} patientName={patient.name} paquetes={paquetes} onChanged={loadLedger} />
          )}

          {moduleConfig.consentimientosInformados && patient && <ConsentimientosInformadosCard patientId={id} patientName={patient.name} />}
          {moduleConfig.tratamientosPorSesion && patient && <TratamientosSeguimientoCard patientId={id} patientName={patient.name} />}
          <form className="card visit-form" onSubmit={submitVisit}>
            <h3>Agregar visita</h3>
            <p className="hint">{moduleConfig.visitaHint} El cargo que anotes aquí aparece automáticamente en Facturación.</p>
            <div className="grid5">
              <label className="field"><span>Fecha</span>
                <input type="datetime-local" value={newVisit.fecha} onChange={(e) => setNewVisit({ ...newVisit, fecha: e.target.value })} />
              </label>
              <label className="field" style={{ gridColumn: 'span 2' }}><span>Tratamiento</span>
                <input type="text" required value={newVisit.tratamiento} onChange={(e) => setNewVisit({ ...newVisit, tratamiento: e.target.value })} placeholder={moduleConfig.tratamientoEjemplo} />
              </label>
              <label className="field"><span>{moduleConfig.piezaLabel}</span>
                <input type="text" value={newVisit.pieza} onChange={(e) => setNewVisit({ ...newVisit, pieza: e.target.value })} placeholder={moduleConfig.piezaEjemplo} />
              </label>
              <label className="field"><span>{moduleConfig.materialLabel}</span>
                {!moduleConfig.materialLista ? (
                  <input type="text" value={newVisit.material} onChange={(e) => setNewVisit({ ...newVisit, material: e.target.value })} />
                ) : (
                <select value={newVisit.material} onChange={(e) => setNewVisit({ ...newVisit, material: e.target.value })}>
                  <option value="">—</option>
                  <option value="Temporal">Temporal</option>
                  <option value="Definitivo">Definitivo</option>
                  <option value="Ninguno">Ninguno</option>
                  <option value="Control">Control</option>
                </select>
                )}
              </label>
              <label className="field"><span>Cargo</span>
                <input type="number" min={0} step="0.01" value={newVisit.cargo} onChange={(e) => setNewVisit({ ...newVisit, cargo: e.target.value })} placeholder="0" />
              </label>
              <label className="field"><span>Pago</span>
                <input type="number" min={0} step="0.01" value={newVisit.pago} onChange={(e) => setNewVisit({ ...newVisit, pago: e.target.value })} placeholder="0" />
              </label>
            </div>
            {moduleConfig.notasEvolucion && (
              <div className="soap-grid" style={{ margin: '10px 0' }}>
                <p className="hint" style={{ margin: 0 }}>Nota de evolución (SOAP)</p>
                {([['s', 'S — Subjetivo (motivo, síntomas)'], ['o', 'O — Objetivo (exploración, signos)'], ['a', 'A — Análisis (diagnóstico)'], ['p', 'P — Plan (tratamiento, indicaciones)']] as const).map(([k, label]) => (
                  <label className="field" key={k} style={{ marginTop: 6 }}><span>{label}</span>
                    <textarea rows={2} value={newSoap[k]} onChange={(e) => setNewSoap({ ...newSoap, [k]: e.target.value })} />
                  </label>
                ))}
              </div>
            )}
            <button className="primary" type="submit" disabled={addingVisit}>{addingVisit ? 'Guardando…' : 'Agregar'}</button>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="actions-col">Acciones</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Tratamiento</th>
                  <th>{moduleConfig.piezaLabel}</th>
                  <th>{moduleConfig.materialLabel}</th>
                  <th>Cargo</th>
                </tr>
              </thead>
              <tbody>
                {ledger.filter((row) => row.source === 'nota' || row.source === 'cita' || row.source === 'estimate').map((row) => {
                  const editable = row.source === 'nota' && withinEditWindow(row.fecha, editLockDays);
                  const isEditing = editingRowId === row.id;

                  if (isEditing) {
                    return (
                      <Fragment key={row.id}>
                      <tr className="editing-row">
                        <td className="actions-col row-actions">
                          <button type="button" className="primary" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? 'Guardando…' : '✓ Guardar'}</button>
                          <button type="button" onClick={cancelEdit}>Cancelar</button>
                        </td>
                        <td><span className={`badge source-${row.source}`}>{sourceLabel(row.source)}</span></td>
                        <td><input type="datetime-local" value={editDraft.fecha} onChange={(e) => setEditDraft({ ...editDraft, fecha: e.target.value })} /></td>
                        <td><input type="text" value={editDraft.tratamiento} onChange={(e) => setEditDraft({ ...editDraft, tratamiento: e.target.value })} /></td>
                        <td><input type="text" value={editDraft.pieza} onChange={(e) => setEditDraft({ ...editDraft, pieza: e.target.value })} style={{ width: 60 }} /></td>
                        <td><input type="text" value={editDraft.material} onChange={(e) => setEditDraft({ ...editDraft, material: e.target.value })} style={{ width: 90 }} /></td>
                        <td><input type="number" min={0} step="0.01" value={editDraft.cargo} onChange={(e) => setEditDraft({ ...editDraft, cargo: e.target.value })} style={{ width: 80 }} /></td>
                      </tr>
                      {moduleConfig.notasEvolucion && (
                        <tr className="editing-row"><td colSpan={7}>
                          <div className="soap-grid">
                            {([['s', 'S — Subjetivo'], ['o', 'O — Objetivo'], ['a', 'A — Análisis'], ['p', 'P — Plan']] as const).map(([k, label]) => (
                              <label className="field" key={k} style={{ marginTop: 6 }}><span>{label}</span>
                                <textarea rows={2} value={editSoap[k]} onChange={(e) => setEditSoap({ ...editSoap, [k]: e.target.value })} />
                              </label>
                            ))}
                          </div>
                        </td></tr>
                      )}
                      </Fragment>
                    );
                  }

                  return (
                    <Fragment key={row.id}>
                    <tr>
                      <td className="actions-col row-actions">
                        <div className="row-actions">
                          {editable ? (
                            <>
                              <button type="button" onClick={() => startEdit(row)}>Editar</button>
                              <button type="button" onClick={() => deleteRow(row)}>Eliminar</button>
                            </>
                          ) : (
                            row.source === 'estimate' ? (
                            <>
                              <span className="hint" style={{ margin: 0 }}>{row.estado || 'Presupuesto'}</span>
                              <button type="button" className="success" disabled={!!sendingEstimate} onClick={() => sendEstimateRow(row, 'email')}>{sendingEstimate === row.id + 'email' ? 'Enviando…' : 'Enviar email'}</button>
                              <button type="button" className="success" disabled={!!sendingEstimate} onClick={() => sendEstimateRow(row, 'sms')}>{sendingEstimate === row.id + 'sms' ? 'Enviando…' : 'Enviar SMS'}</button>
                            </>
                          ) : (
                            <span className="hint" style={{ margin: 0 }} title="Pasaron más de 45 días: registro cerrado">{row.source === 'cita' ? row.estado || 'Agendada' : 'Cerrado'}</span>
                          )
                          )}
                          {row.pago > 0 && (
                            <button type="button" className="success" onClick={() => sendReceipt(row)} disabled={sendingReceiptId === row.id}>
                              {sendingReceiptId === row.id ? 'Enviando…' : 'Enviar recibo'}
                            </button>
                          )}
                        </div>
                        {receiptResult[row.id] && (
                          <div className={receiptResult[row.id].ok ? 'hint' : 'status-line error'} style={{ margin: '4px 0 0' }}>
                            {receiptResult[row.id].message}
                          </div>
                        )}
                        {estimateMsg[row.id] && <div className="hint" style={{ margin: '4px 0 0' }}>{estimateMsg[row.id]}</div>}
                      </td>
                      <td><span className={`badge source-${row.source}`}>{sourceLabel(row.source)}</span></td>
                      <td>{formatDateTime(row.fecha)}</td>
                      <td>
                        {row.tratamiento || (
                          <span className="hint" style={{ margin: 0 }}>
                            Pendiente de llenar{row.citaTitulo ? ` — ${row.citaTitulo}` : ''}
                          </span>
                        )}
                        {row.paqueteId && <span className="badge" style={{ marginLeft: 6, background: '#5e5ce6', color: '#fff' }}>Paquete</span>}
                      </td>
                      <td>{row.pieza || '—'}</td>
                      <td>{row.material || '—'}</td>
                      <td>{row.source === 'estimate' ? <span title="Presupuesto (no es un cargo)">Presup. {money(row.presupuesto || 0)}</span> : row.cargo ? money(row.cargo) : '—'}</td>
                    </tr>
                    {moduleConfig.notasEvolucion && row.soap && (
                      <tr><td colSpan={7} style={{ background: 'rgba(120,80,180,.06)' }}>
                        <div className="soap-view" style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                          {([['s', 'S'], ['o', 'O'], ['a', 'A'], ['p', 'P']] as const).filter(([k]) => row.soap![k]).map(([k, l]) => (
                            <div key={k}><strong>{l}:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{row.soap![k]}</span></div>
                          ))}
                        </div>
                      </td></tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!ledgerLoading && ledger.filter((row) => row.source === 'nota' || row.source === 'cita' || row.source === 'estimate').length === 0 && (
              <div className="empty">Sin visitas registradas.</div>
            )}
          </div>
        </div>
      )}

      {tab === 'facturacion' && (() => {
        const facturaRows = ledger.filter((row) => row.source === 'cita' || !!row.citaId || row.cargo !== 0 || row.pago !== 0);
        const reportRows = facturaRows.filter((row) => isInRange(row.fecha, reportRange));
        const reportTotal = reportRows.reduce((sum, row) => sum + row.pago, 0);
        const totalHistorico = facturaRows.reduce((sum, row) => sum + row.pago, 0);
        return (
          <FacturacionGate>
          <div>
            <div className="card">
              <h3>Informe de ingresos</h3>
              <div className="income-stats">
                <div className="income-stat">
                  <div className="income-stat-label">Total histórico</div>
                  <div className="income-stat-value">{money(totalHistorico)}</div>
                </div>
                <div className="income-stat">
                  <div className="income-stat-label">
                    {{ hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes' }[reportRange]}
                  </div>
                  <div className="income-stat-value">{money(reportTotal)}</div>
                  <div className="hint" style={{ margin: 0 }}>{reportRows.length} transacción(es)</div>
                </div>
              </div>
              <div className="tabs" style={{ marginTop: 14, marginBottom: 4 }}>
                <button className={reportRange === 'hoy' ? 'active' : ''} onClick={() => setReportRange('hoy')}>Hoy</button>
                <button className={reportRange === 'semana' ? 'active' : ''} onClick={() => setReportRange('semana')}>Esta semana</button>
                <button className={reportRange === 'mes' ? 'active' : ''} onClick={() => setReportRange('mes')}>Este mes</button>
              </div>
            </div>

            <form className="card visit-form" onSubmit={submitPago}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Agregar cobro / pago</h3>
                <button type="button" className="tint-amber" onClick={() => setShowPago(true)}>Crear pago (GHL)</button>
              </div>
              <div className="grid5">
                <label className="field"><span>Fecha</span>
                  <input type="date" value={newPago.fecha} onChange={(e) => setNewPago({ ...newPago, fecha: e.target.value })} />
                </label>
                <label className="field" style={{ gridColumn: 'span 2' }}><span>Concepto</span>
                  <input type="text" required value={newPago.concepto} onChange={(e) => setNewPago({ ...newPago, concepto: e.target.value })} placeholder="Ej. Abono tratamiento de conducto" />
                </label>
                <label className="field"><span>Cargo</span>
                  <input type="number" min={0} step="0.01" value={newPago.cargo} onChange={(e) => setNewPago({ ...newPago, cargo: e.target.value })} placeholder="0" />
                </label>
                <label className="field"><span>Pago</span>
                  <input type="number" min={0} step="0.01" value={newPago.pago} onChange={(e) => setNewPago({ ...newPago, pago: e.target.value })} placeholder="0" />
                </label>
              </div>
              <button className="primary" type="submit" disabled={addingPago}>{addingPago ? 'Guardando…' : 'Agregar'}</button>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="actions-col">Acciones</th>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Cargo</th>
                    <th>Pago</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {facturaRows.map((row) => {
                    const editable = row.source === 'nota' && withinEditWindow(row.fecha, editLockDays);
                    const isEditing = editingRowId === row.id;

                    if (isEditing) {
                      return (
                        <tr key={row.id} className="editing-row">
                          <td className="actions-col row-actions">
                            <button type="button" className="primary" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? 'Guardando…' : '✓ Guardar'}</button>
                            <button type="button" onClick={cancelEdit}>Cancelar</button>
                          </td>
                          <td><span className={`badge source-${row.source}`}>{sourceLabel(row.source)}</span></td>
                          <td><input type="datetime-local" value={editDraft.fecha} onChange={(e) => setEditDraft({ ...editDraft, fecha: e.target.value })} /></td>
                          <td><input type="text" value={editDraft.tratamiento} onChange={(e) => setEditDraft({ ...editDraft, tratamiento: e.target.value })} /></td>
                          <td><input type="number" min={0} step="0.01" value={editDraft.cargo} onChange={(e) => setEditDraft({ ...editDraft, cargo: e.target.value })} style={{ width: 80 }} /></td>
                          <td><input type="number" min={0} step="0.01" value={editDraft.pago} onChange={(e) => setEditDraft({ ...editDraft, pago: e.target.value })} style={{ width: 80 }} /></td>
                          <td className="computed-cell" title="Calculado automáticamente">{money(row.saldo)}</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={row.id}>
                        <td className="actions-col row-actions">
                          <div className="row-actions">
                            {editable ? (
                              <>
                                <button type="button" onClick={() => startEdit(row)}>Editar</button>
                                <button type="button" onClick={() => deleteRow(row)}>Eliminar</button>
                              </>
                            ) : (
                              <span className="hint" style={{ margin: 0 }} title="Registro cerrado por antigüedad; las facturas se gestionan en GoHighLevel">{row.source === 'nota' ? 'Cerrado' : row.source === 'cita' ? 'Cita: se gestiona en GHL' : 'Factura: se gestiona en GHL'}</span>
                            )}
                            {row.pago > 0 && (
                              <button type="button" className="success" onClick={() => sendReceipt(row)} disabled={sendingReceiptId === row.id}>
                                {sendingReceiptId === row.id ? 'Enviando…' : 'Enviar recibo'}
                              </button>
                            )}
                          </div>
                          {receiptResult[row.id] && (
                            <div className={receiptResult[row.id].ok ? 'hint' : 'status-line error'} style={{ margin: '4px 0 0' }}>
                              {receiptResult[row.id].message}
                            </div>
                          )}
                        </td>
                        <td><span className={`badge source-${row.source}`}>{sourceLabel(row.source)}</span></td>
                        <td>{formatDate(row.fecha)}</td>
                        <td>{row.tratamiento}</td>
                        <td>{row.cargo ? money(row.cargo) : '—'}</td>
                        <td>{row.pago ? money(row.pago) : '—'}</td>
                        <td className="computed-cell" title="Calculado automáticamente">{money(row.saldo)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!ledgerLoading && facturaRows.length === 0 && <div className="empty">Sin cobros ni pagos registrados.</div>}
            </div>
          </div>
          </FacturacionGate>
        );
      })()}

      {moduleConfig.recetas && tab === 'recetas' && (
        <div>
          <form className="card visit-form" onSubmit={submitReceta}>
            <h3>Nueva receta</h3>
            <p className="hint">
              Prescrito por: <strong>{professional.nombre || 'Sin nombre profesional'}</strong>
              {professional.titulo && ` — ${professional.titulo}`}
              {professional.cedula && ` · Cédula ${professional.cedula}`}
              {' '}(<Link href="/setup">editar en Setup</Link>)
              {(!professional.nombre || !professional.cedula || !professional.institucion) && (
                <span className="status-line error" style={{ display: 'block' }}>
                  Faltan datos del profesional (nombre, cédula o institución). La receta debe llevarlos: complétalos en Setup.
                </span>
              )}
            </p>
            <label className="field"><span>Fecha</span>
              <input type="date" value={newReceta.fecha} onChange={(e) => setNewReceta({ ...newReceta, fecha: e.target.value })} />
            </label>
            <label className="field" style={{ marginTop: 10 }}><span>Medicamentos</span>
              <textarea rows={3} required value={newReceta.medicamentos} onChange={(e) => setNewReceta({ ...newReceta, medicamentos: e.target.value })} placeholder="Ej. Amoxicilina 500mg, cada 8h por 7 días" />
            </label>
            <label className="field" style={{ marginTop: 10 }}><span>Indicaciones</span>
              <textarea rows={2} value={newReceta.indicaciones} onChange={(e) => setNewReceta({ ...newReceta, indicaciones: e.target.value })} />
            </label>
            <button className="primary" type="submit" disabled={addingReceta} style={{ marginTop: 10 }}>{addingReceta ? 'Guardando…' : 'Guardar receta'}</button>
          </form>

          {!recetasLoading && recetas.length === 0 && <div className="empty">Sin recetas registradas.</div>}
          {recetas.map((r) => (
            <div key={r.id} className="card receta-card">
              <div className="receta-card-header">
                <strong>{formatDate(r.fecha)}</strong>
                <div className="row-actions">
                  <Link href={`/patients/${id}/recetas/${r.id}/print`} target="_blank" className="button">Imprimir</Link>
                  <button type="button" disabled={sendingReceta === r.id} onClick={() => sendReceta(r, { email: true })}>Enviar email</button>
                  <button type="button" disabled={sendingReceta === r.id} onClick={() => sendReceta(r, { sms: true })}>Enviar SMS</button>
                  <button type="button" onClick={() => deleteReceta(r)}>Eliminar</button>
                </div>
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{r.medicamentos}</p>
              {r.indicaciones && <p className="hint" style={{ whiteSpace: 'pre-wrap' }}>{r.indicaciones}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'consentimientos' && (
        <div>
          <div className="tab-toolbar">
            <button type="button" onClick={() => consentInputRef.current?.click()} disabled={consentUploading}>
              {consentUploading ? 'Subiendo…' : '+ Subir documento'}
            </button>
            <input ref={consentInputRef} type="file" onChange={onConsentSelected} hidden />
          </div>
          {intake.consentimientos.length === 0 ? (
            <div className="empty">Sin documentos de consentimiento.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="actions-col">Acciones</th>
                    <th>Documento</th>
                    <th>Subido</th>
                  </tr>
                </thead>
                <tbody>
                  {intake.consentimientos.map((doc) => (
                    <tr key={doc.url}>
                      <td className="actions-col row-actions">
                        <a href={doc.url} target="_blank" rel="noreferrer" className="button">Descargar</a>
                        <button type="button" onClick={() => deleteConsent(doc)}>Eliminar</button>
                      </td>
                      <td>{doc.name}</td>
                      <td>{formatDate(doc.uploadedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'citas' && (
        <div style={{ marginBottom: 12 }}>
          <button type="button" className="primary" onClick={() => setShowAgendar(true)}>+ Agendar cita</button>
        </div>
      )}

      {tab === 'citas' && (
        <ul className="timeline">
          {timeline.length === 0 && <div className="empty">Sin citas ni notas registradas.</div>}
          {timeline.map((entry, i) => (
            <li key={i} className="timeline-item">
              <div className="row">
                <span>{entry.type === 'appointment' ? 'Cita' : 'Nota'}</span>
                <span>{formatDate(entry.date)}</span>
              </div>
              <div>
                <strong>{entry.title}</strong>
                {entry.status && <span className={`badge ${entry.status.toLowerCase()}`} style={{ marginLeft: 8 }}>{entry.status}</span>}
              </div>
              {entry.detail && <div style={{ marginTop: 4, fontSize: '0.85rem' }}>{entry.detail}</div>}
            </li>
          ))}
        </ul>
      )}

      {showGallery && (
        <div className="overlay" onClick={() => setShowGallery(false)}>
          <div className="drawer gallery-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Imágenes</h2>
              <button className="close-btn" onClick={() => setShowGallery(false)}>✕</button>
            </div>
            <div className="gallery-toolbar">
              <button type="button" className="primary" disabled={galleryUploading} onClick={() => galleryFileRef.current?.click()}>
                {galleryUploading ? 'Subiendo…' : 'Subir foto'}
              </button>
              <button type="button" disabled={galleryUploading} onClick={() => setShowCamera(true)}>
                Tomar foto
              </button>
              <button type="button" disabled={galleryUploading} onClick={pegarDelPortapapeles}>
                Pegar imagen
              </button>
              <input ref={galleryFileRef} type="file" accept="image/*" onChange={onGalleryFileSelected} hidden />
              <input ref={galleryCameraRef} type="file" accept="image/*" capture="environment" onChange={onGalleryFileSelected} hidden />
            </div>
            <p className="hint">Para pegar: primero copia una imagen (clic derecho sobre una foto → Copiar imagen, o una captura de pantalla), luego pulsa "Pegar imagen" arriba o presiona Ctrl+V (Cmd+V en Mac) aquí.</p>
            {galleryUploading && <p className="hint">Subiendo imagen…</p>}
            {galleryError && <p className="status-line error">{galleryError}</p>}
            {intake.imagenes.length === 0 ? (
              <div className="empty">Sin imágenes registradas.</div>
            ) : (
              <div className="gallery-grid">
                {[...intake.imagenes].reverse().map((img) => (
                  <div key={img.url} className="gallery-thumb">
                    <button type="button" onClick={() => setLightboxUrl(img.url)}>
                      <img src={img.url} alt={img.name} />
                    </button>
                    <span className="gallery-thumb-name">{img.name}</span>
                    <span className="gallery-thumb-date">{formatDate(img.uploadedAt)}</span>
                    <button
                      type="button"
                      className="gallery-thumb-delete"
                      disabled={deletingImg === img.url}
                      onClick={() => deleteGalleryImage(img.url)}
                    >
                      {deletingImg === img.url ? '…' : 'Eliminar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {lightboxUrl && (
        <div className="overlay lightbox" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" />
        </div>
      )}

      {showCamera && (
        <CameraCapture
          onCancel={() => setShowCamera(false)}
          onCapture={(blob) => { setShowCamera(false); setEditorBlob(blob); }}
          onFallback={() => { setShowCamera(false); galleryCameraRef.current?.click(); }}
        />
      )}

      {editorBlob && (
        <ImageEditor
          blob={editorBlob}
          onCancel={() => setEditorBlob(null)}
          onConfirm={(out) => { setEditorBlob(null); uploadGalleryBlob(out, 'imagen.jpg'); }}
        />
      )}

      {showDuplicates && (
        <DuplicatesPanel
          patientId={id}
          patientName={patient.name}
          onClose={() => setShowDuplicates(false)}
          onMerged={() => {
            fetch(`/api/patients/${id}`).then((r) => r.json()).then((d) => { if (d.patient) setPatient(d.patient); });
            fetch(`/api/patients/${id}/intake`).then((r) => r.json()).then((d) => { if (d.intake) setIntake(d.intake); });
            loadLedger();
          }}
        />
      )}

      {showPago && (
        <NuevoPresupuesto
          mode="pago"
          patientId={id}
          patientName={patient.name}
          onClose={() => setShowPago(false)}
          onDone={() => { loadLedger(); }}
        />
      )}

      {showPresupuesto && (
        <NuevoPresupuesto
          patientId={id}
          patientName={patient.name}
          onClose={() => setShowPresupuesto(false)}
          onDone={loadLedger}
        />
      )}

      {showAgendar && (
        <AgendarCita
          patientId={id}
          patientName={patient.name}
          onClose={() => setShowAgendar(false)}
          onDone={() => {
            fetch(`/api/patients/${id}/history`).then((r) => r.json()).then((d) => { if (d.timeline) setTimeline(d.timeline); });
            loadLedger();
          }}
        />
      )}

      {showShareForm && (
        <div className="modal-overlay overlay" onClick={() => setShowShareForm(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Compartir formulario con {patient.name}</h2>
            </div>
            <p>
              Envía este enlace al paciente (por WhatsApp, email o SMS) para que llene o actualice su historia clínica
              desde su teléfono. Sus respuestas se guardan automáticamente en esta ficha y en GoHighLevel en cuanto
              las envíe — no toca lo que tú ya hayas registrado en el consultorio (exploración, diagnóstico, plan,
              odontograma).
            </p>
            <input type="text" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
            {sendFormResult && <p className={sendFormResult.ok ? 'hint' : 'status-line error'}>{sendFormResult.message}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setShowShareForm(false)}>Cerrar</button>
              <button type="button" className="success" onClick={sendFormulario} disabled={sendingForm}>{sendingForm ? 'Enviando…' : 'Enviar por WhatsApp'}</button>
              <button type="button" className="primary" onClick={copyShareUrl}>{shareCopied ? 'Copiado ✓' : 'Copiar enlace'}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="modal-window danger-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar paciente</h2>
            </div>
            <p>
              Esta acción borra <strong>permanentemente</strong> el contacto <strong>{patient.name}</strong> ({patient.numeroHistoriaClinica}) de GoHighLevel,
              junto con su ficha clínica, notas y seguimiento. No se puede deshacer.
            </p>
            <p>Para confirmar, escribe el nombre completo del paciente:</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={patient.name}
              autoFocus
            />
            {deleteError && <p className="status-line error">{deleteError}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancelar</button>
              <button
                type="button"
                className="danger"
                disabled={deleteConfirmText.trim() !== patient.name.trim() || deleting}
                onClick={confirmDeletePatient}
              >
                {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onSave, type = 'text', extra }: { label: string; value: string; onSave: (v: string) => void; type?: string; extra?: React.ReactNode }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field-input-row">
        <input
          type={type}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => { if (local !== value) onSave(local); }}
        />
        {extra}
      </span>
    </label>
  );
}
