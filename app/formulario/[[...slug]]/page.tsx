'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PatientQuestionnaire, IntakeForm, defaultQuestionnaire } from '@/lib/intake';

type ContactDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  address1: string;
  city: string;
  state: string;
};

function emptyContact(): ContactDraft {
  return { firstName: '', lastName: '', phone: '', email: '', dateOfBirth: '', address1: '', city: '', state: '' };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="yesno">
      <button type="button" className={value ? 'active' : ''} onClick={() => onChange(true)}>Sí</button>
      <button type="button" className={!value ? 'active' : ''} onClick={() => onChange(false)}>No</button>
    </div>
  );
}

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const drawnRef = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#182634';
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    drawnRef.current = true;
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (drawnRef.current && canvasRef.current) {
      setEmpty(false);
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawnRef.current = false;
    setEmpty(true);
    onChange(null);
  }

  return (
    <div className="signature-pad-wrap">
      <canvas
        ref={canvasRef}
        className="signature-pad-canvas"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      {empty && <span className="signature-pad-placeholder">Dibuja tu firma aquí</span>}
      <button type="button" className="signature-pad-clear" onClick={clear}>Borrar firma</button>
    </div>
  );
}

// Foto pequeña de tipo avatar: se comprime a un cuadro de 480px máximo y se
// reduce la calidad JPEG, así el archivo queda ligero tanto para el envío
// como para el espacio que ocupa en GoHighLevel.
const MAX_PHOTO_DIMENSION = 480;

function readAndResizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No se pudo procesar la imagen')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function PhotoPicker({ preview, onPick, onClear }: { preview: string | null; onPick: (dataUrl: string) => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await readAndResizeImage(file);
      onPick(dataUrl);
    } catch {
      // el navegador no pudo leer la imagen; el paciente puede intentar con otra
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo-avatar-picker">
      <button type="button" className="photo-avatar-circle" onClick={() => inputRef.current?.click()} disabled={busy} title="Foto del paciente">
        {preview ? <img src={preview} alt="Foto del paciente" /> : <span>{busy ? '…' : '+'}</span>}
      </button>
      {preview && !busy && (
        <button type="button" className="photo-avatar-clear" onClick={onClear} title="Quitar foto">✕</button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="user" onChange={onFileChange} hidden />
    </div>
  );
}

function enfermedadLabel(key: string) {
  const labels: Record<string, string> = {
    anemia: 'Anemia', asma: 'Asma', gastritis: 'Gastritis', cancer: 'Cáncer', sida: 'S.I.D.A',
    sinusitis: 'Sinusitis', diabetes: 'Diabetes', problemasHigado: 'Problemas de hígado', hipoxia: 'Hipoxia',
    neurologicos: 'Neurológicos', problemasRenales: 'Problemas renales', fiebreReumatica: 'Fiebre reumática',
    hipertension: 'Hipertensión arterial', alcoholismo: 'Alcoholismo', covid19: 'COVID-19',
  };
  return labels[key] || key;
}

export default function FormularioPage() {
  const params = useParams();
  const formToken = useSearchParams().get('t') || '';
  const slugParam = params.slug as string[] | undefined;
  const contactId = slugParam && slugParam[0] ? slugParam[0] : null;

  const [loading, setLoading] = useState(!!contactId);
  const [notFound, setNotFound] = useState(false);
  const [contact, setContact] = useState<ContactDraft>(emptyContact());
  const [q, setQ] = useState<PatientQuestionnaire>(defaultQuestionnaire());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ numeroHistoriaClinica?: string; created: boolean } | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoChanged, setFotoChanged] = useState(false);
  const signatureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contactId) return;
    Promise.all([
      fetch(`/api/patients/${contactId}?t=${encodeURIComponent(formToken)}`).then((r) => r.json()),
      fetch(`/api/patients/${contactId}/intake?t=${encodeURIComponent(formToken)}`).then((r) => r.json()),
    ])
      .then(([p, i]) => {
        if (!p.patient) { setNotFound(true); return; }
        setContact({
          firstName: p.patient.firstName || '',
          lastName: p.patient.lastName || '',
          phone: p.patient.phone || '',
          email: p.patient.email || '',
          dateOfBirth: p.patient.dateOfBirth ? String(p.patient.dateOfBirth).slice(0, 10) : '',
          address1: p.patient.address1 || '',
          city: p.patient.city || '',
          state: p.patient.state || '',
        });
        const intake: IntakeForm | undefined = i.intake;
        if (intake) {
          setQ({
            motivoConsulta: intake.motivoConsulta,
            referidoPor: intake.referidoPor,
            antecedentesFamiliares: intake.antecedentesFamiliares,
            familiar: intake.familiar,
            personal: intake.personal,
            enfermedades: intake.enfermedades,
            condicionNoDescrita: intake.condicionNoDescrita,
            habitos: intake.habitos,
            declaracionAceptada: intake.declaracionAceptada,
            firmaAutorizacion: intake.firmaAutorizacion || '',
          });
          if (intake.fotoUrl) setFotoPreview(intake.fotoUrl);
        }
      })
      .finally(() => setLoading(false));
  }, [contactId]);

  function setFamiliar<K extends keyof IntakeForm['familiar']>(key: K, v: IntakeForm['familiar'][K]) {
    setQ((prev) => ({ ...prev, familiar: { ...prev.familiar, [key]: v } }));
  }
  function setPersonal<K extends keyof IntakeForm['personal']>(key: K, v: IntakeForm['personal'][K]) {
    setQ((prev) => ({ ...prev, personal: { ...prev.personal, [key]: v } }));
  }
  function setEnfermedad<K extends keyof IntakeForm['enfermedades']>(key: K, v: IntakeForm['enfermedades'][K]) {
    setQ((prev) => ({ ...prev, enfermedades: { ...prev.enfermedades, [key]: v } }));
  }
  function setHabito<K extends keyof IntakeForm['habitos']>(key: K, v: IntakeForm['habitos'][K]) {
    setQ((prev) => ({ ...prev, habitos: { ...prev.habitos, [key]: v } }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!contact.firstName.trim() || !contact.lastName.trim()) {
      setError('El nombre y apellido son obligatorios.');
      return;
    }
    if (!q.declaracionAceptada || !q.firmaAutorizacion.trim() || !signatureDataUrl) {
      setError('Debes marcar la casilla de autorización, escribir tu nombre completo y dibujar tu firma antes de enviar.');
      signatureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/formulario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          token: formToken,
          ...contact,
          questionnaire: q,
          firmaDibujoDataUrl: signatureDataUrl,
          ...(fotoChanged && fotoPreview ? { fotoDataUrl: fotoPreview } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el formulario');
      setResult({ numeroHistoriaClinica: data.numeroHistoriaClinica, created: data.created });
    } catch (err: any) {
      setError(err.message || 'Error desconocido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="public-form-page"><div className="empty">Cargando…</div></div>;
  }

  if (notFound) {
    return (
      <div className="public-form-page">
        <div className="public-form-card">
          <h1>Enlace no válido</h1>
          <p>Este enlace de historia clínica ya no está disponible. Contacta a la clínica para obtener uno nuevo.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="public-form-page">
        <div className="public-form-card success">
          <h1>¡Gracias!</h1>
          <p>Tu historia clínica fue {result.created ? 'registrada' : 'actualizada'} correctamente. La clínica ya la tiene disponible.</p>
          {result.numeroHistoriaClinica && <p className="hc-number">{result.numeroHistoriaClinica}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-page">
      <header className="public-form-header">
        <img src="/clinic-logo.png" alt="Logo" />
        <div className="public-form-header-text">
          <div className="brand-name">{process.env.NEXT_PUBLIC_CLINIC_NAME}</div>
          <div className="sub">Historia clínica del paciente</div>
        </div>
        <PhotoPicker
          preview={fotoPreview}
          onPick={(dataUrl) => { setFotoPreview(dataUrl); setFotoChanged(true); }}
          onClear={() => { setFotoPreview(null); setFotoChanged(true); }}
        />
      </header>
      <p className="hint public-form-photo-hint">Toca el círculo de arriba para agregar tu foto (opcional).</p>

      <p className="hint public-form-intro">
        Completa este formulario con tus datos y antecedentes de salud. Esta información es confidencial y solo la
        usará tu odontólogo para tu atención.
      </p>

      <form className="public-form" onSubmit={submit}>
        <section className="card">
          <h3>Datos de contacto</h3>
          <div className="grid2">
            <Field label="Nombre(s)">
              <input type="text" required value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} />
            </Field>
            <Field label="Apellidos">
              <input type="text" required value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} />
            </Field>
            <Field label="Teléfono">
              <input type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            </Field>
            <Field label="Fecha de nacimiento">
              <input type="date" value={contact.dateOfBirth} onChange={(e) => setContact({ ...contact, dateOfBirth: e.target.value })} />
            </Field>
            <Field label="Dirección">
              <input type="text" value={contact.address1} onChange={(e) => setContact({ ...contact, address1: e.target.value })} />
            </Field>
            <Field label="Ciudad">
              <input type="text" value={contact.city} onChange={(e) => setContact({ ...contact, city: e.target.value })} />
            </Field>
            <Field label="Estado">
              <input type="text" value={contact.state} onChange={(e) => setContact({ ...contact, state: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="card">
          <h3>Motivo de consulta</h3>
          <Field label="¿Qué te trae a la consulta?">
            <textarea value={q.motivoConsulta} onChange={(e) => setQ({ ...q, motivoConsulta: e.target.value })} rows={2} />
          </Field>
          <Field label="¿Quién te refirió?">
            <input type="text" value={q.referidoPor} onChange={(e) => setQ({ ...q, referidoPor: e.target.value })} />
          </Field>
        </section>

        <section className="card">
          <h3>Antecedentes familiares</h3>
          <p className="hint">¿Algún familiar directo ha padecido lo siguiente?</p>
          <div className="checkrow">
            {(['diabetes', 'hta', 'cancer', 'obesidad'] as const).map((k) => (
              <label key={k} className="checkbox">
                <input type="checkbox" checked={q.familiar[k]} onChange={(e) => setFamiliar(k, e.target.checked)} />
                {k === 'hta' ? 'HTA' : k[0].toUpperCase() + k.slice(1)}
              </label>
            ))}
          </div>
          <Field label="Otros">
            <input type="text" value={q.familiar.otros} onChange={(e) => setFamiliar('otros', e.target.value)} />
          </Field>
        </section>

        <section className="card">
          <h3>Antecedentes personales</h3>
          <div className="grid2">
            <div>
              <div className="qrow"><span>¿Estás bajo medicamento actualmente?</span><YesNo value={q.personal.bajoMedicamento} onChange={(v) => setPersonal('bajoMedicamento', v)} /></div>
              {q.personal.bajoMedicamento && (
                <Field label="Indica la causa">
                  <input type="text" value={q.personal.bajoMedicamentoCausa} onChange={(e) => setPersonal('bajoMedicamentoCausa', e.target.value)} />
                </Field>
              )}
              <div className="qrow"><span>¿Tomas algún medicamento?</span><YesNo value={q.personal.tomaMedicamento} onChange={(v) => setPersonal('tomaMedicamento', v)} /></div>
              {q.personal.tomaMedicamento && (
                <Field label="¿Cuál(es)?">
                  <input type="text" value={q.personal.tomaMedicamentoCual} onChange={(e) => setPersonal('tomaMedicamentoCual', e.target.value)} />
                </Field>
              )}
            </div>
            <div>
              <div className="qrow"><span>¿Has estado hospitalizado?</span><YesNo value={q.personal.hospitalizado} onChange={(v) => setPersonal('hospitalizado', v)} /></div>
              {q.personal.hospitalizado && (
                <Field label="Indica la causa">
                  <input type="text" value={q.personal.hospitalizadoCausa} onChange={(e) => setPersonal('hospitalizadoCausa', e.target.value)} />
                </Field>
              )}
              <div className="qrow"><span>¿Eres alérgico a algún medicamento o alimento?</span><YesNo value={q.personal.alergico} onChange={(v) => setPersonal('alergico', v)} /></div>
              {q.personal.alergico && (
                <Field label="Indica cuál(es)">
                  <input type="text" value={q.personal.alergicoCual} onChange={(e) => setPersonal('alergicoCual', e.target.value)} />
                </Field>
              )}
            </div>
          </div>
          <div className="qrow"><span>¿Estás embarazada?</span><YesNo value={q.personal.embarazada} onChange={(v) => setPersonal('embarazada', v)} /></div>
          {q.personal.embarazada && (
            <Field label="¿En qué mes?">
              <input type="text" value={q.personal.embarazadaMes} onChange={(e) => setPersonal('embarazadaMes', e.target.value)} />
            </Field>
          )}
        </section>

        <section className="card">
          <h3>¿Padeces o has padecido alguna de las siguientes enfermedades?</h3>
          <div className="checkrow wrap">
            {(Object.keys(q.enfermedades) as (keyof IntakeForm['enfermedades'])[]).map((k) => (
              <label key={k} className="checkbox">
                <input type="checkbox" checked={q.enfermedades[k]} onChange={(e) => setEnfermedad(k, e.target.checked)} />
                {enfermedadLabel(k)}
              </label>
            ))}
          </div>
          <Field label="Indica si existe alguna condición no descrita">
            <input type="text" value={q.condicionNoDescrita} onChange={(e) => setQ({ ...q, condicionNoDescrita: e.target.value })} />
          </Field>
        </section>

        <section className="card">
          <h3>Hábitos</h3>
          <div className="grid2">
            <Field label="¿Fumas?"><input type="text" value={q.habitos.fuma} onChange={(e) => setHabito('fuma', e.target.value)} /></Field>
            <Field label="¿Aprietas o rechinas los dientes?"><input type="text" value={q.habitos.aprietaORechinaDientes} onChange={(e) => setHabito('aprietaORechinaDientes', e.target.value)} /></Field>
            <Field label="¿Muerdes objetos con los dientes?"><input type="text" value={q.habitos.muerdeObjetos} onChange={(e) => setHabito('muerdeObjetos', e.target.value)} /></Field>
            <Field label="¿Cuántas veces al día te cepillas?"><input type="text" value={q.habitos.cepilladoVecesDia} onChange={(e) => setHabito('cepilladoVecesDia', e.target.value)} /></Field>
            <Field label="¿Usas hilo dental?"><input type="text" value={q.habitos.usaHiloDental} onChange={(e) => setHabito('usaHiloDental', e.target.value)} /></Field>
            <Field label="Última visita al dentista y por qué"><input type="text" value={q.habitos.ultimaVisitaDentista} onChange={(e) => setHabito('ultimaVisitaDentista', e.target.value)} /></Field>
          </div>
        </section>

        <section
          className={`card signature-section${error && (!q.declaracionAceptada || !q.firmaAutorizacion.trim() || !signatureDataUrl) ? ' invalid' : ''}`}
          ref={signatureRef}
        >
          <h3>Declaración y autorización del paciente</h3>
          <p>
            Declaro que la información proporcionada en esta historia clínica es verdadera y completa, según mi
            conocimiento. Me comprometo a informar al odontólogo cualquier cambio en mi estado de salud,
            diagnóstico, medicación, alergia, embarazo o tratamiento médico que pueda influir en mi atención
            médica y odontológica. Esta declaración acredita y autoriza al odontólogo y personal dentro de la
            consulta a revisar, tomar estudios, explorar físicamente, toma de fotografías, toma de videos con
            fines que el profesional convenga.
          </p>

          <Field label="Nombre completo *">
            <input
              type="text"
              required
              placeholder="Nombre y apellidos"
              value={q.firmaAutorizacion}
              onChange={(e) => setQ({ ...q, firmaAutorizacion: e.target.value })}
            />
          </Field>

          <label className="field"><span>Firma *</span></label>
          <SignaturePad onChange={setSignatureDataUrl} />

          <label className="checkbox declaracion-text">
            <input type="checkbox" required checked={q.declaracionAceptada} onChange={(e) => setQ({ ...q, declaracionAceptada: e.target.checked })} />
            <span>He leído y acepto la declaración anterior, y firmo digitalmente esta autorización. *</span>
          </label>
        </section>

        {error && <p className="status-line error public-form-error">{error}</p>}

        <button
          className="primary public-form-submit"
          type="submit"
          disabled={submitting || !q.declaracionAceptada || !q.firmaAutorizacion.trim() || !signatureDataUrl}
        >
          {submitting ? 'Enviando…' : 'Enviar historia clínica'}
        </button>
      </form>
    </div>
  );
}
