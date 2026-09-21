import { SpaFicha, SpaPaciente, defaultSpa, defaultSpaPaciente, mergeSpa, applySpaPaciente, fillSpaGaps } from './spa-ficha';

export type IntakeForm = {
  fotoUrl: string;
  motivoConsulta: string;
  referidoPor: string;
  antecedentesFamiliares: string;
  familiar: { diabetes: boolean; hta: boolean; cancer: boolean; obesidad: boolean; otros: string };
  personal: {
    bajoMedicamento: boolean;
    bajoMedicamentoCausa: string;
    tomaMedicamento: boolean;
    tomaMedicamentoCual: string;
    hospitalizado: boolean;
    hospitalizadoCausa: string;
    alergico: boolean;
    alergicoCual: string;
    embarazada: boolean;
    embarazadaMes: string;
  };
  enfermedades: {
    anemia: boolean;
    asma: boolean;
    gastritis: boolean;
    cancer: boolean;
    sida: boolean;
    sinusitis: boolean;
    diabetes: boolean;
    problemasHigado: boolean;
    hipoxia: boolean;
    neurologicos: boolean;
    problemasRenales: boolean;
    fiebreReumatica: boolean;
    hipertension: boolean;
    alcoholismo: boolean;
    covid19: boolean;
  };
  condicionNoDescrita: string;
  habitos: {
    fuma: string;
    aprietaORechinaDientes: string;
    muerdeObjetos: string;
    cepilladoVecesDia: string;
    usaHiloDental: string;
    ultimaVisitaDentista: string;
  };
  exploracion: {
    tejidosBlandos: string[];
    tejidosObservaciones: string;
    cabezaCuello: string[];
    signosVitales: { pa: string; fc: string; o2: string; temp: string; peso: string };
  };
  diagnostico: string;
  planTratamiento: string;
  pronostico: string;
  declaracionAceptada: boolean;
  firmaAutorizacion: string;
  firmaDibujoUrl: string;
  fechaFicha: string;
  odontograma: Record<string, string>;
  periodontograma: Record<string, string>;
  imagenes: { url: string; name: string; uploadedAt: string }[];
  consentimientos: { url: string; name: string; uploadedAt: string }[];
  archivosMigrados: boolean;
  // Ficha de primera vez del módulo Spa (vacía en los demás módulos).
  spa: SpaFicha;
};

// Subconjunto de la ficha que el propio paciente puede llenar desde el
// formulario público: su historia clínica subjetiva. Todo lo demás
// (exploración, diagnóstico, plan, pronóstico, odontograma, periodontograma,
// imágenes) es exclusivo del profesional y nunca se toca desde este formulario.
export type PatientQuestionnaire = {
  motivoConsulta: string;
  referidoPor: string;
  antecedentesFamiliares: string;
  familiar: IntakeForm['familiar'];
  personal: IntakeForm['personal'];
  enfermedades: IntakeForm['enfermedades'];
  condicionNoDescrita: string;
  habitos: IntakeForm['habitos'];
  declaracionAceptada: boolean;
  firmaAutorizacion: string;
  spa: SpaPaciente;
};

export function defaultQuestionnaire(): PatientQuestionnaire {
  const base = defaultIntake();
  return {
    motivoConsulta: base.motivoConsulta,
    referidoPor: base.referidoPor,
    antecedentesFamiliares: base.antecedentesFamiliares,
    familiar: base.familiar,
    personal: base.personal,
    enfermedades: base.enfermedades,
    condicionNoDescrita: base.condicionNoDescrita,
    habitos: base.habitos,
    declaracionAceptada: base.declaracionAceptada,
    firmaAutorizacion: base.firmaAutorizacion,
    spa: defaultSpaPaciente(),
  };
}

// Aplica las respuestas del paciente sobre la ficha ya existente, sin tocar
// jamás los campos que llena el profesional (exploración, diagnóstico, plan,
// pronóstico, odontograma, periodontograma, imágenes).
export function applyPatientQuestionnaire(current: IntakeForm, q: PatientQuestionnaire): IntakeForm {
  return {
    ...current,
    motivoConsulta: q.motivoConsulta,
    referidoPor: q.referidoPor,
    antecedentesFamiliares: q.antecedentesFamiliares,
    familiar: q.familiar,
    personal: q.personal,
    enfermedades: q.enfermedades,
    condicionNoDescrita: q.condicionNoDescrita,
    habitos: q.habitos,
    declaracionAceptada: q.declaracionAceptada,
    firmaAutorizacion: q.firmaAutorizacion,
    fechaFicha: current.fechaFicha || new Date().toISOString().slice(0, 10),
    spa: applySpaPaciente(current.spa, q.spa),
  };
}

export const TEJIDOS_BLANDOS_OPCIONES = ['Labios', 'Lengua', 'Carrillos', 'Piso de boca', 'Frenillos', 'Paladar duro', 'Paladar blando', 'Ganglios'];
export const CABEZA_CUELLO_OPCIONES = ['Sin alteraciones aparentes', 'Con alteraciones', 'ATM', 'Ganglios'];

export function defaultIntake(): IntakeForm {
  return {
    fotoUrl: '',
    motivoConsulta: '',
    referidoPor: '',
    antecedentesFamiliares: '',
    familiar: { diabetes: false, hta: false, cancer: false, obesidad: false, otros: '' },
    personal: {
      bajoMedicamento: false,
      bajoMedicamentoCausa: '',
      tomaMedicamento: false,
      tomaMedicamentoCual: '',
      hospitalizado: false,
      hospitalizadoCausa: '',
      alergico: false,
      alergicoCual: '',
      embarazada: false,
      embarazadaMes: '',
    },
    enfermedades: {
      anemia: false,
      asma: false,
      gastritis: false,
      cancer: false,
      sida: false,
      sinusitis: false,
      diabetes: false,
      problemasHigado: false,
      hipoxia: false,
      neurologicos: false,
      problemasRenales: false,
      fiebreReumatica: false,
      hipertension: false,
      alcoholismo: false,
      covid19: false,
    },
    condicionNoDescrita: '',
    habitos: {
      fuma: '',
      aprietaORechinaDientes: '',
      muerdeObjetos: '',
      cepilladoVecesDia: '',
      usaHiloDental: '',
      ultimaVisitaDentista: '',
    },
    exploracion: {
      tejidosBlandos: [],
      tejidosObservaciones: '',
      cabezaCuello: [],
      signosVitales: { pa: '', fc: '', o2: '', temp: '', peso: '' },
    },
    diagnostico: '',
    planTratamiento: '',
    pronostico: '',
    declaracionAceptada: false,
    firmaAutorizacion: '',
    firmaDibujoUrl: '',
    fechaFicha: '',
    odontograma: {},
    periodontograma: {},
    imagenes: [],
    consentimientos: [],
    archivosMigrados: false,
    spa: defaultSpa(),
  };
}

// Combina dos fichas cuando se fusionan dos contactos duplicados: los datos ya
// presentes en `primary` (el contacto que se conserva) nunca se sobrescriben,
// solo se completan los huecos con lo que traiga `secondary` (el duplicado).
export function fillIntakeGaps(primary: IntakeForm, secondary: IntakeForm): IntakeForm {
  const str = (a: string, b: string) => (a && a.trim() ? a : b || a);
  return {
    ...primary,
    fotoUrl: str(primary.fotoUrl, secondary.fotoUrl),
    motivoConsulta: str(primary.motivoConsulta, secondary.motivoConsulta),
    referidoPor: str(primary.referidoPor, secondary.referidoPor),
    antecedentesFamiliares: str(primary.antecedentesFamiliares, secondary.antecedentesFamiliares),
    familiar: {
      diabetes: primary.familiar.diabetes || secondary.familiar.diabetes,
      hta: primary.familiar.hta || secondary.familiar.hta,
      cancer: primary.familiar.cancer || secondary.familiar.cancer,
      obesidad: primary.familiar.obesidad || secondary.familiar.obesidad,
      otros: str(primary.familiar.otros, secondary.familiar.otros),
    },
    personal: {
      bajoMedicamento: primary.personal.bajoMedicamento || secondary.personal.bajoMedicamento,
      bajoMedicamentoCausa: str(primary.personal.bajoMedicamentoCausa, secondary.personal.bajoMedicamentoCausa),
      tomaMedicamento: primary.personal.tomaMedicamento || secondary.personal.tomaMedicamento,
      tomaMedicamentoCual: str(primary.personal.tomaMedicamentoCual, secondary.personal.tomaMedicamentoCual),
      hospitalizado: primary.personal.hospitalizado || secondary.personal.hospitalizado,
      hospitalizadoCausa: str(primary.personal.hospitalizadoCausa, secondary.personal.hospitalizadoCausa),
      alergico: primary.personal.alergico || secondary.personal.alergico,
      alergicoCual: str(primary.personal.alergicoCual, secondary.personal.alergicoCual),
      embarazada: primary.personal.embarazada || secondary.personal.embarazada,
      embarazadaMes: str(primary.personal.embarazadaMes, secondary.personal.embarazadaMes),
    },
    enfermedades: Object.fromEntries(
      Object.keys(primary.enfermedades).map((k) => [
        k,
        (primary.enfermedades as any)[k] || (secondary.enfermedades as any)[k],
      ])
    ) as IntakeForm['enfermedades'],
    condicionNoDescrita: str(primary.condicionNoDescrita, secondary.condicionNoDescrita),
    habitos: {
      fuma: str(primary.habitos.fuma, secondary.habitos.fuma),
      aprietaORechinaDientes: str(primary.habitos.aprietaORechinaDientes, secondary.habitos.aprietaORechinaDientes),
      muerdeObjetos: str(primary.habitos.muerdeObjetos, secondary.habitos.muerdeObjetos),
      cepilladoVecesDia: str(primary.habitos.cepilladoVecesDia, secondary.habitos.cepilladoVecesDia),
      usaHiloDental: str(primary.habitos.usaHiloDental, secondary.habitos.usaHiloDental),
      ultimaVisitaDentista: str(primary.habitos.ultimaVisitaDentista, secondary.habitos.ultimaVisitaDentista),
    },
    exploracion: {
      tejidosBlandos: Array.from(new Set([...primary.exploracion.tejidosBlandos, ...secondary.exploracion.tejidosBlandos])),
      tejidosObservaciones: str(primary.exploracion.tejidosObservaciones, secondary.exploracion.tejidosObservaciones),
      cabezaCuello: Array.from(new Set([...primary.exploracion.cabezaCuello, ...secondary.exploracion.cabezaCuello])),
      signosVitales: {
        pa: str(primary.exploracion.signosVitales.pa, secondary.exploracion.signosVitales.pa),
        fc: str(primary.exploracion.signosVitales.fc, secondary.exploracion.signosVitales.fc),
        o2: str(primary.exploracion.signosVitales.o2, secondary.exploracion.signosVitales.o2),
        temp: str(primary.exploracion.signosVitales.temp, secondary.exploracion.signosVitales.temp),
        peso: str(primary.exploracion.signosVitales.peso, secondary.exploracion.signosVitales.peso),
      },
    },
    diagnostico: str(primary.diagnostico, secondary.diagnostico),
    planTratamiento: str(primary.planTratamiento, secondary.planTratamiento),
    pronostico: str(primary.pronostico, secondary.pronostico),
    declaracionAceptada: primary.declaracionAceptada || secondary.declaracionAceptada,
    firmaAutorizacion: str(primary.firmaAutorizacion, secondary.firmaAutorizacion),
    firmaDibujoUrl: str(primary.firmaDibujoUrl, secondary.firmaDibujoUrl),
    fechaFicha: str(primary.fechaFicha, secondary.fechaFicha),
    odontograma: { ...secondary.odontograma, ...primary.odontograma },
    periodontograma: { ...secondary.periodontograma, ...primary.periodontograma },
    imagenes: [
      ...primary.imagenes,
      ...secondary.imagenes.filter((si) => !primary.imagenes.some((pi) => pi.url === si.url)),
    ],
    consentimientos: [
      ...primary.consentimientos,
      ...secondary.consentimientos.filter((si) => !primary.consentimientos.some((pi) => pi.url === si.url)),
    ],
    archivosMigrados: primary.archivosMigrados || secondary.archivosMigrados,
    spa: fillSpaGaps(primary.spa, secondary.spa),
  };
}

export function mergeIntake(partial: Partial<IntakeForm> | null | undefined): IntakeForm {
  const base = defaultIntake();
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    familiar: { ...base.familiar, ...(partial.familiar || {}) },
    personal: { ...base.personal, ...(partial.personal || {}) },
    enfermedades: { ...base.enfermedades, ...(partial.enfermedades || {}) },
    habitos: { ...base.habitos, ...(partial.habitos || {}) },
    exploracion: {
      ...base.exploracion,
      ...(partial.exploracion || {}),
      signosVitales: { ...base.exploracion.signosVitales, ...(partial.exploracion?.signosVitales || {}) },
    },
    odontograma: { ...base.odontograma, ...(partial.odontograma || {}) },
    periodontograma: { ...base.periodontograma, ...(partial.periodontograma || {}) },
    spa: mergeSpa(partial.spa),
  };
}
