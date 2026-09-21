// Historia clínica del módulo Medicina: copia del formato "Historia clínica" del Dr. José Daza
// (Boston Medical & Aesthetics, cirugía plástica, estética y reconstructiva).
//
// Página 1: datos personales, antecedentes médicos personales (Sí/No + detalle), motivo de consulta y
// exploración física. Página 2: esquemas (rostro, cuerpo, nariz y plano del implante mamario) para marcar,
// diagnóstico, plan y firma del médico. Nombre, teléfono, correo, domicilio y fecha de nacimiento viven en el
// contacto de GHL; "recomendado por" usa `referidoPor` y el motivo principal usa `motivoConsulta`.

export const ANTECEDENTES: readonly (readonly [string, string, string])[] = [
  // clave, pregunta, etiqueta del detalle
  ['familia', '¿Enfermedades en su familia?', '¿Cuáles?'],
  ['enfermedad', '¿Padece usted de alguna enfermedad?', '¿Cuáles?'],
  ['alergia', '¿Tienes algún tipo de alergia?', '¿Cuáles?'],
  ['fuma', '¿Fuma o bebe?', '¿Cuántos al día?'],
  ['transfusion', '¿Le transfundieron sangre alguna vez?', '¿Cuándo?'],
  ['medicamento', '¿Toma algún medicamento?', '¿Cuál?'],
  ['deporte', '¿Practica algún deporte?', '¿Cuál?'],
  ['operado', '¿Ha sido operado(a) alguna vez?', '¿De qué?'],
  ['accidentes', '¿Ha tenido accidentes?', '¿Cuáles?'],
];

export const EXPLORACION_CAMPOS: readonly (readonly [string, string])[] = [
  ['peso', 'Peso'],
  ['estatura', 'Estatura'],
  ['tallaBra', 'Talla bra'],
  ['tallaPantalon', 'Talla pantalón'],
  ['ta', 'TA'],
  ['fc', 'FC'],
  ['fr', 'FR'],
  ['temp', 'Temp'],
];

export const SEXOS: readonly (readonly [string, string])[] = [
  ['M', 'M'],
  ['F', 'F'],
];

export type Antecedente = { si: '' | 'si' | 'no'; detalle: string };

// Marcas dibujadas por el médico sobre los esquemas: coordenadas en el espacio de la imagen (ESQUEMA_W x ESQUEMA_H).
export const ESQUEMA_W = 1300;
export const ESQUEMA_H = 888;
export const ESQUEMA_COLORES = ['#d7362f', '#0a84ff', '#1d1d1f'] as const;
export type Trazo = { c: string; w: number; p: number[] }; // p = [x1, y1, x2, y2, ...]

export type MedicalFicha = {
  // Datos personales (los llena el paciente)
  sexo: string;
  pais: string;
  estadoCivil: string;
  ocupacion: string;
  acompanante: string;
  // Antecedentes médicos personales (los llena el paciente)
  antecedentes: Record<string, Antecedente>;
  embarazos: { e: string; p: string; a: string; c: string };
  // Motivo de consulta (los llena el paciente; el motivo principal es `motivoConsulta`)
  procedimientoDeseado: string;
  procedimientosPrevios: string;
  // Del médico
  fechaHistoria: string;
  exploracion: Record<string, string>;
  esquema: Trazo[]; // marcas del médico sobre los esquemas
  diagnostico: string;
  plan: string;
};

export type MedicalPaciente = Pick<
  MedicalFicha,
  'sexo' | 'pais' | 'estadoCivil' | 'ocupacion' | 'acompanante' | 'antecedentes' | 'embarazos' | 'procedimientoDeseado' | 'procedimientosPrevios'
>;

const antecedentesVacios = (): Record<string, Antecedente> =>
  Object.fromEntries(ANTECEDENTES.map(([k]) => [k, { si: '' as const, detalle: '' }]));
const exploracionVacia = (): Record<string, string> => Object.fromEntries(EXPLORACION_CAMPOS.map(([k]) => [k, '']));

export function defaultMedical(): MedicalFicha {
  return {
    sexo: '', pais: '', estadoCivil: '', ocupacion: '', acompanante: '',
    antecedentes: antecedentesVacios(),
    embarazos: { e: '', p: '', a: '', c: '' },
    procedimientoDeseado: '', procedimientosPrevios: '',
    fechaHistoria: '',
    exploracion: exploracionVacia(),
    esquema: [], diagnostico: '', plan: '',
  };
}

const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.slice(0, max) : '');

// Mezcla sin fiarse de la forma de los datos: solo se conservan las claves y tipos conocidos.
export function mergeMedical(partial: unknown): MedicalFicha {
  if (!partial || typeof partial !== 'object') return defaultMedical();
  const p = partial as Record<string, any>;
  const ant = (p.antecedentes && typeof p.antecedentes === 'object' ? p.antecedentes : {}) as Record<string, any>;
  const emb = (p.embarazos && typeof p.embarazos === 'object' ? p.embarazos : {}) as Record<string, unknown>;
  const exp = (p.exploracion && typeof p.exploracion === 'object' ? p.exploracion : {}) as Record<string, unknown>;
  const trazos: Trazo[] = [];
  let puntos = 0;
  for (const t of Array.isArray(p.esquema) ? p.esquema.slice(0, 400) : []) {
    if (!t || !Array.isArray(t.p)) continue;
    const pts = (t.p as unknown[]).filter((n) => typeof n === 'number' && Number.isFinite(n)).slice(0, 4000) as number[];
    if (pts.length < 2 || puntos + pts.length > 40000) continue;
    puntos += pts.length;
    trazos.push({
      c: (ESQUEMA_COLORES as readonly string[]).includes(t.c) ? t.c : ESQUEMA_COLORES[0],
      w: Math.min(12, Math.max(1, Number(t.w) || 3)),
      p: pts.map((n) => Math.round(n)),
    });
  }
  return {
    sexo: p.sexo === 'M' || p.sexo === 'F' ? p.sexo : '',
    pais: str(p.pais, 80),
    estadoCivil: str(p.estadoCivil, 60),
    ocupacion: str(p.ocupacion),
    acompanante: str(p.acompanante),
    antecedentes: Object.fromEntries(
      ANTECEDENTES.map(([k]) => [k, { si: ant[k]?.si === 'si' || ant[k]?.si === 'no' ? ant[k].si : '', detalle: str(ant[k]?.detalle, 1000) }])
    ) as Record<string, Antecedente>,
    embarazos: { e: str(emb.e, 5), p: str(emb.p, 5), a: str(emb.a, 5), c: str(emb.c, 5) },
    procedimientoDeseado: str(p.procedimientoDeseado, 1500),
    procedimientosPrevios: str(p.procedimientosPrevios, 1500),
    fechaHistoria: str(p.fechaHistoria, 40),
    exploracion: Object.fromEntries(EXPLORACION_CAMPOS.map(([k]) => [k, str(exp[k], 30)])),
    esquema: trazos,
    diagnostico: str(p.diagnostico, 4000),
    plan: str(p.plan, 4000),
  };
}

export function pickPacienteMedical(m: MedicalFicha): MedicalPaciente {
  return {
    sexo: m.sexo, pais: m.pais, estadoCivil: m.estadoCivil, ocupacion: m.ocupacion, acompanante: m.acompanante,
    antecedentes: m.antecedentes, embarazos: m.embarazos,
    procedimientoDeseado: m.procedimientoDeseado, procedimientosPrevios: m.procedimientosPrevios,
  };
}

export function defaultMedicalPaciente(): MedicalPaciente {
  return pickPacienteMedical(defaultMedical());
}

// Aplica lo que llenó el paciente sin tocar jamás lo del médico (exploración, esquemas, diagnóstico y plan).
export function applyMedicalPaciente(current: MedicalFicha, incoming: unknown): MedicalFicha {
  return { ...current, ...pickPacienteMedical(mergeMedical(incoming)) };
}

// Fusión de duplicados: lo ya presente en `primary` nunca se sobrescribe.
export function fillMedicalGaps(primary: MedicalFicha, secondary: MedicalFicha): MedicalFicha {
  const s = (a: string, b: string) => (a && a.trim() ? a : b || a);
  return {
    ...primary,
    sexo: primary.sexo || secondary.sexo,
    pais: s(primary.pais, secondary.pais),
    estadoCivil: s(primary.estadoCivil, secondary.estadoCivil),
    ocupacion: s(primary.ocupacion, secondary.ocupacion),
    acompanante: s(primary.acompanante, secondary.acompanante),
    antecedentes: Object.fromEntries(
      ANTECEDENTES.map(([k]) => [k, { si: primary.antecedentes[k].si || secondary.antecedentes[k].si, detalle: s(primary.antecedentes[k].detalle, secondary.antecedentes[k].detalle) }])
    ) as Record<string, Antecedente>,
    embarazos: { e: s(primary.embarazos.e, secondary.embarazos.e), p: s(primary.embarazos.p, secondary.embarazos.p), a: s(primary.embarazos.a, secondary.embarazos.a), c: s(primary.embarazos.c, secondary.embarazos.c) },
    procedimientoDeseado: s(primary.procedimientoDeseado, secondary.procedimientoDeseado),
    procedimientosPrevios: s(primary.procedimientosPrevios, secondary.procedimientosPrevios),
    fechaHistoria: s(primary.fechaHistoria, secondary.fechaHistoria),
    exploracion: Object.fromEntries(EXPLORACION_CAMPOS.map(([k]) => [k, s(primary.exploracion[k], secondary.exploracion[k])])),
    esquema: primary.esquema.length ? primary.esquema : secondary.esquema,
    diagnostico: s(primary.diagnostico, secondary.diagnostico),
    plan: s(primary.plan, secondary.plan),
  };
}
