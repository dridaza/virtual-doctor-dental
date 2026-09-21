// Ficha de primera vez del módulo Spa, basada en la "Ficha personal de primera vez" de Galatea Med Spa
// (valoración estética no quirúrgica). Los datos de identificación básicos (nombre, teléfono, correo,
// fecha de nacimiento) viven en el contacto de GHL; "cómo nos conoció" usa `referidoPor` y el motivo
// principal usa `motivoConsulta` de la ficha general.

export const ALERTAS_SPA: readonly (readonly [string, string])[] = [
  ['embarazo', 'Embarazo, lactancia o duda'],
  ['diabetes', 'Diabetes'],
  ['hipertension', 'Hipertensión'],
  ['cardiopatia', 'Cardiopatía o marcapasos'],
  ['protesis', 'Prótesis/implante electrónico'],
  ['epilepsia', 'Epilepsia o fotosensibilidad'],
  ['anticoagulantes', 'Anticoagulantes o sangrado fácil'],
  ['coagulacion', 'Alteración de coagulación'],
  ['cancer', 'Cáncer activo'],
  ['autoinmune', 'Autoinmune o inmunosupresión'],
  ['herpes', 'Herpes recurrente'],
  ['infeccion', 'Infección, fiebre, herida o lesión'],
  ['queloides', 'Queloides o mala cicatrización'],
  ['varices', 'Varices, flebitis o trombosis'],
  ['rellenos', 'Rellenos, botox, hilos o cirugía reciente'],
  ['peeling', 'Peeling/procedimiento reciente'],
  ['isotretinoina', 'Isotretinoína, retinoides o ácidos'],
  ['fotosensibilizantes', 'Antibióticos/fotosensibilizantes'],
  ['bronceado', 'Bronceado o sol intenso reciente'],
];

export const CONDICIONES_PIEL: readonly (readonly [string, string])[] = [
  ['manchas', 'Manchas o melasma'],
  ['acne', 'Acné o brotes'],
  ['rosacea', 'Rosácea/sensibilidad'],
  ['poros', 'Poros/textura/cicatrices'],
  ['flacidez', 'Flacidez'],
];

export const CHECKLIST_PROCEDIMIENTO: readonly (readonly [string, string])[] = [
  ['fichaCompleta', 'Ficha personal completa'],
  ['alergiasRevisadas', 'Alergias y medicamentos revisados'],
  ['fototipoRegistrado', 'Fototipo y condición de piel registrados'],
  ['sinContraindicacion', 'No hay contraindicación activa'],
  ['seExplicoTratamiento', 'Se explicó tratamiento sugerido y alternativas'],
  ['consentimientoEspecifico', 'Consentimiento específico pendiente/firmado'],
  ['fotosAutorizadas', 'Fotos clínicas autorizadas'],
  ['cuidadosPrevios', 'Cuidados previos indicados'],
];

export const CHECKLIST_COFEPRIS: readonly (readonly [string, string])[] = [
  ['fichaIdentificacion', 'Ficha de identificación'],
  ['antecedentes', 'Antecedentes documentados'],
  ['avisoPrivacidad', 'Aviso de privacidad/confidencialidad'],
  ['consentimientoTratamiento', 'Consentimiento específico por tratamiento'],
  ['registroDiario', 'Registro diario de pacientes'],
  ['personalCapacitado', 'Personal capacitado/documentado'],
  ['manualBitacora', 'Manual y bitácora de equipo si aplica'],
  ['higiene', 'Higiene, desinfección y EPP'],
  ['insumos', 'Insumos vigentes'],
  ['rpbi', 'RPBI si se genera'],
  ['resguardo', 'Resguardo de expediente'],
  ['seguimientoReaccion', 'Seguimiento de reacción/evento si ocurre'],
];

export const FOTOTIPOS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
export const TIPOS_PIEL: readonly (readonly [string, string])[] = [
  ['grasa', 'Grasa'],
  ['mixta', 'Mixta'],
  ['seca', 'Seca'],
  ['sensible', 'Sensible'],
];
export const USO_FPS: readonly (readonly [string, string])[] = [
  ['diario', 'Diario'],
  ['aveces', 'A veces'],
  ['no', 'No'],
];

export type SpaFicha = {
  // 1-2. Identificación, motivo y autorizaciones (las llena el paciente)
  ocupacion: string;
  emergenciaNombre: string;
  emergenciaTel: string;
  tratamientoInteres: string;
  autorizaApertura: boolean;
  avisoPrivacidad: boolean;
  fotosClinicas: '' | 'si' | 'no';
  autorizaContacto: boolean;
  // 3. Antecedentes y alertas (las llena el paciente; el profesional las revisa)
  alergias: string;
  medicamentosActuales: string;
  alertas: Record<string, boolean>;
  otraAlerta: string;
  observaciones: string;
  // 4. Valoración profesional: piel y hábitos
  fototipo: '' | (typeof FOTOTIPOS)[number];
  tipoPiel: string;
  condiciones: Record<string, boolean>;
  usaFps: string;
  rutina: string;
  procedimientosPrevios: string;
  // 5. Plan inicial y seguimiento profesional
  hallazgos: string;
  riesgos: string;
  planSugerido: string;
  tratamientoRecomendado: string;
  cuidadosIniciales: string;
  proximaCita: string;
  // 6. Checklist antes de agendar o realizar procedimiento
  checklist: Record<string, boolean>;
  // 7. Firmas (la firma del paciente vive en la ficha general)
  nombreResponsable: string;
  fechaFirma: string;
  // 8. Checklist normativo COFEPRIS del expediente inicial
  cofepris: Record<string, boolean>;
};

// Lo que el propio paciente puede llenar desde el formulario público.
export type SpaPaciente = Pick<
  SpaFicha,
  | 'ocupacion'
  | 'emergenciaNombre'
  | 'emergenciaTel'
  | 'tratamientoInteres'
  | 'autorizaApertura'
  | 'avisoPrivacidad'
  | 'fotosClinicas'
  | 'autorizaContacto'
  | 'alergias'
  | 'medicamentosActuales'
  | 'alertas'
  | 'otraAlerta'
  | 'observaciones'
>;

const falseMap = (rows: readonly (readonly [string, string])[]): Record<string, boolean> =>
  Object.fromEntries(rows.map(([k]) => [k, false]));

export function defaultSpa(): SpaFicha {
  return {
    ocupacion: '',
    emergenciaNombre: '',
    emergenciaTel: '',
    tratamientoInteres: '',
    autorizaApertura: false,
    avisoPrivacidad: false,
    fotosClinicas: '',
    autorizaContacto: false,
    alergias: '',
    medicamentosActuales: '',
    alertas: falseMap(ALERTAS_SPA),
    otraAlerta: '',
    observaciones: '',
    fototipo: '',
    tipoPiel: '',
    condiciones: falseMap(CONDICIONES_PIEL),
    usaFps: '',
    rutina: '',
    procedimientosPrevios: '',
    hallazgos: '',
    riesgos: '',
    planSugerido: '',
    tratamientoRecomendado: '',
    cuidadosIniciales: '',
    proximaCita: '',
    checklist: falseMap(CHECKLIST_PROCEDIMIENTO),
    nombreResponsable: '',
    fechaFirma: '',
    cofepris: falseMap(CHECKLIST_COFEPRIS),
  };
}

const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.slice(0, max) : '');

// Mezcla sin fiarse de la forma de los datos: solo se conservan las claves y tipos conocidos.
function pickMap(rows: readonly (readonly [string, string])[], source: unknown): Record<string, boolean> {
  const src = (source && typeof source === 'object' ? source : {}) as Record<string, unknown>;
  return Object.fromEntries(rows.map(([k]) => [k, src[k] === true]));
}

export function mergeSpa(partial: unknown): SpaFicha {
  const base = defaultSpa();
  if (!partial || typeof partial !== 'object') return base;
  const p = partial as Record<string, unknown>;
  return {
    ocupacion: str(p.ocupacion),
    emergenciaNombre: str(p.emergenciaNombre),
    emergenciaTel: str(p.emergenciaTel, 40),
    tratamientoInteres: str(p.tratamientoInteres),
    autorizaApertura: p.autorizaApertura === true,
    avisoPrivacidad: p.avisoPrivacidad === true,
    fotosClinicas: p.fotosClinicas === 'si' || p.fotosClinicas === 'no' ? p.fotosClinicas : '',
    autorizaContacto: p.autorizaContacto === true,
    alergias: str(p.alergias),
    medicamentosActuales: str(p.medicamentosActuales),
    alertas: pickMap(ALERTAS_SPA, p.alertas),
    otraAlerta: str(p.otraAlerta),
    observaciones: str(p.observaciones, 2000),
    fototipo: (FOTOTIPOS as readonly string[]).includes(p.fototipo as string) ? (p.fototipo as SpaFicha['fototipo']) : '',
    tipoPiel: TIPOS_PIEL.some(([k]) => k === p.tipoPiel) ? (p.tipoPiel as string) : '',
    condiciones: pickMap(CONDICIONES_PIEL, p.condiciones),
    usaFps: USO_FPS.some(([k]) => k === p.usaFps) ? (p.usaFps as string) : '',
    rutina: str(p.rutina, 1000),
    procedimientosPrevios: str(p.procedimientosPrevios, 1000),
    hallazgos: str(p.hallazgos, 2000),
    riesgos: str(p.riesgos, 2000),
    planSugerido: str(p.planSugerido, 2000),
    tratamientoRecomendado: str(p.tratamientoRecomendado, 2000),
    cuidadosIniciales: str(p.cuidadosIniciales, 2000),
    proximaCita: str(p.proximaCita),
    checklist: pickMap(CHECKLIST_PROCEDIMIENTO, p.checklist),
    nombreResponsable: str(p.nombreResponsable),
    fechaFirma: str(p.fechaFirma, 40),
    cofepris: pickMap(CHECKLIST_COFEPRIS, p.cofepris),
  };
}

export function defaultSpaPaciente(): SpaPaciente {
  return pickPaciente(defaultSpa());
}

export function pickPaciente(s: SpaFicha): SpaPaciente {
  return {
    ocupacion: s.ocupacion,
    emergenciaNombre: s.emergenciaNombre,
    emergenciaTel: s.emergenciaTel,
    tratamientoInteres: s.tratamientoInteres,
    autorizaApertura: s.autorizaApertura,
    avisoPrivacidad: s.avisoPrivacidad,
    fotosClinicas: s.fotosClinicas,
    autorizaContacto: s.autorizaContacto,
    alergias: s.alergias,
    medicamentosActuales: s.medicamentosActuales,
    alertas: s.alertas,
    otraAlerta: s.otraAlerta,
    observaciones: s.observaciones,
  };
}

// Aplica lo que llenó el paciente sin tocar jamás lo que llena el profesional (secciones 4 a 8).
export function applySpaPaciente(current: SpaFicha, incoming: unknown): SpaFicha {
  const clean = mergeSpa(incoming);
  return { ...current, ...pickPaciente(clean) };
}

// Fusión de duplicados: lo ya presente en `primary` nunca se sobrescribe.
export function fillSpaGaps(primary: SpaFicha, secondary: SpaFicha): SpaFicha {
  const s = (a: string, b: string) => (a && a.trim() ? a : b || a);
  const or = (a: Record<string, boolean>, b: Record<string, boolean>) =>
    Object.fromEntries(Object.keys(a).map((k) => [k, !!(a[k] || b[k])]));
  return {
    ...primary,
    ocupacion: s(primary.ocupacion, secondary.ocupacion),
    emergenciaNombre: s(primary.emergenciaNombre, secondary.emergenciaNombre),
    emergenciaTel: s(primary.emergenciaTel, secondary.emergenciaTel),
    tratamientoInteres: s(primary.tratamientoInteres, secondary.tratamientoInteres),
    autorizaApertura: primary.autorizaApertura || secondary.autorizaApertura,
    avisoPrivacidad: primary.avisoPrivacidad || secondary.avisoPrivacidad,
    fotosClinicas: primary.fotosClinicas || secondary.fotosClinicas,
    autorizaContacto: primary.autorizaContacto || secondary.autorizaContacto,
    alergias: s(primary.alergias, secondary.alergias),
    medicamentosActuales: s(primary.medicamentosActuales, secondary.medicamentosActuales),
    alertas: or(primary.alertas, secondary.alertas),
    otraAlerta: s(primary.otraAlerta, secondary.otraAlerta),
    observaciones: s(primary.observaciones, secondary.observaciones),
    fototipo: primary.fototipo || secondary.fototipo,
    tipoPiel: s(primary.tipoPiel, secondary.tipoPiel),
    condiciones: or(primary.condiciones, secondary.condiciones),
    usaFps: s(primary.usaFps, secondary.usaFps),
    rutina: s(primary.rutina, secondary.rutina),
    procedimientosPrevios: s(primary.procedimientosPrevios, secondary.procedimientosPrevios),
    hallazgos: s(primary.hallazgos, secondary.hallazgos),
    riesgos: s(primary.riesgos, secondary.riesgos),
    planSugerido: s(primary.planSugerido, secondary.planSugerido),
    tratamientoRecomendado: s(primary.tratamientoRecomendado, secondary.tratamientoRecomendado),
    cuidadosIniciales: s(primary.cuidadosIniciales, secondary.cuidadosIniciales),
    proximaCita: s(primary.proximaCita, secondary.proximaCita),
    checklist: or(primary.checklist, secondary.checklist),
    nombreResponsable: s(primary.nombreResponsable, secondary.nombreResponsable),
    fechaFirma: s(primary.fechaFirma, secondary.fechaFirma),
    cofepris: or(primary.cofepris, secondary.cofepris),
  };
}
