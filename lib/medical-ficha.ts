// Historia clínica del módulo Medicina, siguiendo la estructura del expediente clínico de la
// NOM-004-SSA3-2012: ficha de identificación, padecimiento actual, antecedentes (heredofamiliares,
// personales no patológicos y patológicos, gineco-obstétricos), interrogatorio por aparatos y sistemas,
// exploración física, estudios, diagnósticos, plan de tratamiento y pronóstico.
//
// Los datos básicos (nombre, teléfono, correo, fecha de nacimiento) viven en el contacto de GHL; el motivo
// de consulta usa `motivoConsulta` de la ficha general.

type Rows = readonly (readonly [string, string])[];

export const HEREDOFAMILIARES: Rows = [
  ['diabetes', 'Diabetes'],
  ['hipertension', 'Hipertensión arterial'],
  ['cardiopatia', 'Cardiopatía'],
  ['cancer', 'Cáncer'],
  ['obesidad', 'Obesidad'],
  ['renal', 'Enfermedad renal'],
  ['tiroides', 'Enfermedad de tiroides'],
  ['mental', 'Enfermedad mental'],
  ['epilepsia', 'Epilepsia'],
  ['alergias', 'Alergias'],
];

export const PATOLOGICOS: Rows = [
  ['diabetes', 'Diabetes'],
  ['hipertension', 'Hipertensión arterial'],
  ['cardiopatia', 'Cardiopatía'],
  ['asma', 'Asma / EPOC'],
  ['tiroides', 'Enfermedad de tiroides'],
  ['renal', 'Enfermedad renal'],
  ['hepatica', 'Enfermedad hepática'],
  ['gastritis', 'Gastritis / reflujo'],
  ['epilepsia', 'Epilepsia'],
  ['cancer', 'Cáncer'],
  ['vih', 'VIH / inmunosupresión'],
  ['tuberculosis', 'Tuberculosis'],
  ['covid', 'COVID-19'],
  ['depresion', 'Depresión / ansiedad'],
];

export const APARATOS: Rows = [
  ['general', 'Síntomas generales'],
  ['cardiovascular', 'Cardiovascular'],
  ['respiratorio', 'Respiratorio'],
  ['digestivo', 'Digestivo'],
  ['genitourinario', 'Genitourinario'],
  ['musculoesqueletico', 'Musculoesquelético'],
  ['neurologico', 'Neurológico'],
  ['endocrino', 'Endocrino'],
  ['piel', 'Piel y anexos'],
  ['hematologico', 'Hematológico y linfático'],
  ['psiquiatrico', 'Psiquiátrico'],
  ['sentidos', 'Órganos de los sentidos'],
];

export const EXPLORACION: Rows = [
  ['habitus', 'Habitus exterior'],
  ['cabezaCuello', 'Cabeza y cuello'],
  ['torax', 'Tórax (cardiopulmonar)'],
  ['abdomen', 'Abdomen'],
  ['extremidades', 'Extremidades'],
  ['neurologico', 'Neurológico'],
  ['piel', 'Piel y tegumentos'],
  ['genitales', 'Genitales'],
];

export const NO_PATOLOGICOS: Rows = [
  ['tabaquismo', 'Tabaquismo'],
  ['alcohol', 'Alcoholismo'],
  ['drogas', 'Otras sustancias'],
  ['ejercicio', 'Actividad física'],
  ['alimentacion', 'Alimentación'],
  ['sueno', 'Sueño'],
  ['vacunas', 'Vacunación'],
];

export const GINECO: Rows = [
  ['menarca', 'Menarca (edad)'],
  ['fur', 'Fecha de última menstruación'],
  ['gestas', 'Gestas'],
  ['partos', 'Partos'],
  ['cesareas', 'Cesáreas'],
  ['abortos', 'Abortos'],
  ['anticonceptivos', 'Método anticonceptivo'],
];

export const SIGNOS: Rows = [
  ['ta', 'T/A (mmHg)'],
  ['fc', 'FC (lpm)'],
  ['fr', 'FR (rpm)'],
  ['temp', 'Temp. (°C)'],
  ['spo2', 'SpO₂ (%)'],
  ['peso', 'Peso (kg)'],
  ['talla', 'Talla (cm)'],
  ['glucosa', 'Glucosa (mg/dL)'],
];

export const SEXOS: Rows = [
  ['F', 'Femenino'],
  ['M', 'Masculino'],
  ['otro', 'Otro'],
];

export type MedicalFicha = {
  // Identificación adicional (paciente)
  sexo: string;
  estadoCivil: string;
  escolaridad: string;
  ocupacion: string;
  tipoSangre: string;
  emergenciaNombre: string;
  emergenciaTel: string;
  // Padecimiento actual y antecedentes (paciente)
  padecimientoActual: string;
  heredofamiliares: Record<string, boolean>;
  heredofamiliaresOtros: string;
  noPatologicos: Record<string, string>;
  patologicos: Record<string, boolean>;
  cirugias: string;
  hospitalizaciones: string;
  transfusiones: string;
  traumatismos: string;
  alergiasMedicamentos: string;
  alergiasOtras: string;
  medicamentosActuales: string;
  gineco: Record<string, string>;
  embarazoActual: '' | 'si' | 'no';
  // Del profesional
  aparatos: Record<string, string>;
  signos: Record<string, string>;
  exploracion: Record<string, string>;
  estudios: string;
  diagnosticos: string;
  plan: string;
  pronostico: string;
  indicaciones: string;
};

export type MedicalPaciente = Pick<
  MedicalFicha,
  | 'sexo' | 'estadoCivil' | 'escolaridad' | 'ocupacion' | 'tipoSangre' | 'emergenciaNombre' | 'emergenciaTel'
  | 'padecimientoActual' | 'heredofamiliares' | 'heredofamiliaresOtros' | 'noPatologicos' | 'patologicos'
  | 'cirugias' | 'hospitalizaciones' | 'transfusiones' | 'traumatismos' | 'alergiasMedicamentos' | 'alergiasOtras'
  | 'medicamentosActuales' | 'gineco' | 'embarazoActual'
>;

const boolMap = (rows: Rows) => Object.fromEntries(rows.map(([k]) => [k, false])) as Record<string, boolean>;
const strMap = (rows: Rows) => Object.fromEntries(rows.map(([k]) => [k, ''])) as Record<string, string>;

export function defaultMedical(): MedicalFicha {
  return {
    sexo: '', estadoCivil: '', escolaridad: '', ocupacion: '', tipoSangre: '', emergenciaNombre: '', emergenciaTel: '',
    padecimientoActual: '',
    heredofamiliares: boolMap(HEREDOFAMILIARES), heredofamiliaresOtros: '',
    noPatologicos: strMap(NO_PATOLOGICOS),
    patologicos: boolMap(PATOLOGICOS),
    cirugias: '', hospitalizaciones: '', transfusiones: '', traumatismos: '',
    alergiasMedicamentos: '', alergiasOtras: '', medicamentosActuales: '',
    gineco: strMap(GINECO), embarazoActual: '',
    aparatos: strMap(APARATOS), signos: strMap(SIGNOS), exploracion: strMap(EXPLORACION),
    estudios: '', diagnosticos: '', plan: '', pronostico: '', indicaciones: '',
  };
}

const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.slice(0, max) : '');

function pickBool(rows: Rows, source: unknown): Record<string, boolean> {
  const src = (source && typeof source === 'object' ? source : {}) as Record<string, unknown>;
  return Object.fromEntries(rows.map(([k]) => [k, src[k] === true]));
}
function pickStr(rows: Rows, source: unknown, max = 500): Record<string, string> {
  const src = (source && typeof source === 'object' ? source : {}) as Record<string, unknown>;
  return Object.fromEntries(rows.map(([k]) => [k, str(src[k], max)]));
}

// Mezcla sin fiarse de la forma de los datos: solo se conservan las claves y tipos conocidos.
export function mergeMedical(partial: unknown): MedicalFicha {
  if (!partial || typeof partial !== 'object') return defaultMedical();
  const p = partial as Record<string, unknown>;
  return {
    sexo: SEXOS.some(([k]) => k === p.sexo) ? (p.sexo as string) : '',
    estadoCivil: str(p.estadoCivil, 60),
    escolaridad: str(p.escolaridad, 80),
    ocupacion: str(p.ocupacion),
    tipoSangre: str(p.tipoSangre, 10),
    emergenciaNombre: str(p.emergenciaNombre),
    emergenciaTel: str(p.emergenciaTel, 40),
    padecimientoActual: str(p.padecimientoActual, 3000),
    heredofamiliares: pickBool(HEREDOFAMILIARES, p.heredofamiliares),
    heredofamiliaresOtros: str(p.heredofamiliaresOtros),
    noPatologicos: pickStr(NO_PATOLOGICOS, p.noPatologicos),
    patologicos: pickBool(PATOLOGICOS, p.patologicos),
    cirugias: str(p.cirugias, 1000),
    hospitalizaciones: str(p.hospitalizaciones, 1000),
    transfusiones: str(p.transfusiones, 500),
    traumatismos: str(p.traumatismos, 1000),
    alergiasMedicamentos: str(p.alergiasMedicamentos, 1000),
    alergiasOtras: str(p.alergiasOtras, 1000),
    medicamentosActuales: str(p.medicamentosActuales, 1000),
    gineco: pickStr(GINECO, p.gineco, 100),
    embarazoActual: p.embarazoActual === 'si' || p.embarazoActual === 'no' ? p.embarazoActual : '',
    aparatos: pickStr(APARATOS, p.aparatos, 1500),
    signos: pickStr(SIGNOS, p.signos, 30),
    exploracion: pickStr(EXPLORACION, p.exploracion, 1500),
    estudios: str(p.estudios, 4000),
    diagnosticos: str(p.diagnosticos, 3000),
    plan: str(p.plan, 4000),
    pronostico: str(p.pronostico, 1500),
    indicaciones: str(p.indicaciones, 3000),
  };
}

export function pickPacienteMedical(m: MedicalFicha): MedicalPaciente {
  return {
    sexo: m.sexo, estadoCivil: m.estadoCivil, escolaridad: m.escolaridad, ocupacion: m.ocupacion, tipoSangre: m.tipoSangre,
    emergenciaNombre: m.emergenciaNombre, emergenciaTel: m.emergenciaTel,
    padecimientoActual: m.padecimientoActual, heredofamiliares: m.heredofamiliares, heredofamiliaresOtros: m.heredofamiliaresOtros,
    noPatologicos: m.noPatologicos, patologicos: m.patologicos, cirugias: m.cirugias, hospitalizaciones: m.hospitalizaciones,
    transfusiones: m.transfusiones, traumatismos: m.traumatismos, alergiasMedicamentos: m.alergiasMedicamentos,
    alergiasOtras: m.alergiasOtras, medicamentosActuales: m.medicamentosActuales, gineco: m.gineco, embarazoActual: m.embarazoActual,
  };
}

export function defaultMedicalPaciente(): MedicalPaciente {
  return pickPacienteMedical(defaultMedical());
}

// Aplica lo que llenó el paciente sin tocar jamás lo del profesional (aparatos, exploración, estudios, diagnósticos, plan).
export function applyMedicalPaciente(current: MedicalFicha, incoming: unknown): MedicalFicha {
  return { ...current, ...pickPacienteMedical(mergeMedical(incoming)) };
}

// Fusión de duplicados: lo ya presente en `primary` nunca se sobrescribe.
export function fillMedicalGaps(primary: MedicalFicha, secondary: MedicalFicha): MedicalFicha {
  const s = (a: string, b: string) => (a && a.trim() ? a : b || a);
  const or = (a: Record<string, boolean>, b: Record<string, boolean>) => Object.fromEntries(Object.keys(a).map((k) => [k, !!(a[k] || b[k])]));
  const sm = (a: Record<string, string>, b: Record<string, string>) => Object.fromEntries(Object.keys(a).map((k) => [k, s(a[k], b[k] || '')]));
  return {
    ...primary,
    sexo: s(primary.sexo, secondary.sexo), estadoCivil: s(primary.estadoCivil, secondary.estadoCivil),
    escolaridad: s(primary.escolaridad, secondary.escolaridad), ocupacion: s(primary.ocupacion, secondary.ocupacion),
    tipoSangre: s(primary.tipoSangre, secondary.tipoSangre), emergenciaNombre: s(primary.emergenciaNombre, secondary.emergenciaNombre),
    emergenciaTel: s(primary.emergenciaTel, secondary.emergenciaTel), padecimientoActual: s(primary.padecimientoActual, secondary.padecimientoActual),
    heredofamiliares: or(primary.heredofamiliares, secondary.heredofamiliares),
    heredofamiliaresOtros: s(primary.heredofamiliaresOtros, secondary.heredofamiliaresOtros),
    noPatologicos: sm(primary.noPatologicos, secondary.noPatologicos),
    patologicos: or(primary.patologicos, secondary.patologicos),
    cirugias: s(primary.cirugias, secondary.cirugias), hospitalizaciones: s(primary.hospitalizaciones, secondary.hospitalizaciones),
    transfusiones: s(primary.transfusiones, secondary.transfusiones), traumatismos: s(primary.traumatismos, secondary.traumatismos),
    alergiasMedicamentos: s(primary.alergiasMedicamentos, secondary.alergiasMedicamentos),
    alergiasOtras: s(primary.alergiasOtras, secondary.alergiasOtras),
    medicamentosActuales: s(primary.medicamentosActuales, secondary.medicamentosActuales),
    gineco: sm(primary.gineco, secondary.gineco), embarazoActual: primary.embarazoActual || secondary.embarazoActual,
    aparatos: sm(primary.aparatos, secondary.aparatos), signos: sm(primary.signos, secondary.signos),
    exploracion: sm(primary.exploracion, secondary.exploracion),
    estudios: s(primary.estudios, secondary.estudios), diagnosticos: s(primary.diagnosticos, secondary.diagnosticos),
    plan: s(primary.plan, secondary.plan), pronostico: s(primary.pronostico, secondary.pronostico),
    indicaciones: s(primary.indicaciones, secondary.indicaciones),
  };
}

export function imc(pesoKg: string, tallaCm: string): string {
  const p = parseFloat(pesoKg.replace(',', '.'));
  const t = parseFloat(tallaCm.replace(',', '.')) / 100;
  if (!(p > 0) || !(t > 0)) return '';
  return (p / (t * t)).toFixed(1);
}
