// Fichas de seguimiento por tratamiento, específicas de Spa (Galatea): consentimiento informado +
// bitácora de sesiones, digitalizadas a partir de los formatos internos COFEPRIS del negocio
// (Depilación láser/IPL, Faciales de control mensual y Masajes corporales). Cada protocolo define
// sus propios campos de ficha inicial y las columnas de su tabla de sesiones; la ficha real de un
// paciente ("TratamientoFicha") se guarda como una nota en GHL y su forma la valida este archivo.

export type CampoTipo = 'text' | 'textarea' | 'yesno' | 'select' | 'multi';
export type CampoDef = { key: string; label: string; tipo: CampoTipo; opciones?: string[]; ancho?: 1 | 2 };
export type ColumnaDef = { key: string; label: string; tipo?: 'text' | 'yesno'; ancho?: string };

export type ProtocoloConfig = {
  id: 'depilacion' | 'faciales' | 'masajes';
  nombre: string;
  nombreCorto: string;
  planSesiones: number;
  campos: CampoDef[];
  consentTexto: string;
  consentChecks: { key: string; label: string }[];
  columnasSesion: ColumnaDef[];
};

export const PROTOCOLOS: ProtocoloConfig[] = [
  {
    id: 'depilacion',
    nombre: 'Depilación láser / IPL — plan de 8 sesiones',
    nombreCorto: 'Depilación',
    planSesiones: 8,
    campos: [
      { key: 'area', label: 'Área', tipo: 'text' },
      { key: 'fototipo', label: 'Fototipo', tipo: 'text' },
      { key: 'velloColorGrosor', label: 'Vello: color / grosor', tipo: 'text' },
      { key: 'pielSensibleMelasmaTatuaje', label: 'Piel sensible / melasma / tatuaje', tipo: 'textarea' },
      { key: 'alergiasMedicamentos', label: 'Alergias / medicamentos', tipo: 'textarea' },
    ],
    consentTexto:
      'Declaro que recibí explicación clara sobre objetivo, técnica, alternativas, cuidados, posibles molestias y riesgos. Entiendo que el procedimiento busca reducción progresiva del vello y no garantiza eliminación total ni resultados idénticos. Autorizo el uso de parámetros según valoración y me comprometo a informar embarazo, lactancia, bronceado reciente, lesiones, infección, tatuajes en zona, melasma activo, uso de isotretinoína/retinoides, antibióticos u otros fotosensibilizantes, antecedentes de queloide, herpes o cambios de salud.\n\nRiesgos posibles: enrojecimiento, ardor, edema, dolor, irritación, foliculitis, hipo/hiperpigmentación, quemadura, ampolla, costra, cicatriz rara, reactivación de herpes o falta de respuesta.',
    consentChecks: [
      { key: 'aceptoProcedimiento', label: 'Acepto el procedimiento y los cuidados.' },
      { key: 'fotosSeguimiento', label: 'Autorizo fotos clínicas de seguimiento.' },
      { key: 'autorizaContacto', label: 'Autorizo que me contacten por reacción o adherencia.' },
    ],
    columnasSesion: [
      { key: 'zona', label: 'Zona' },
      { key: 'foto', label: 'Foto', tipo: 'yesno', ancho: '70px' },
      { key: 'parametros', label: 'Parámetros (J/cm²-ms-Hz-spot)' },
      { key: 'enfriamiento', label: 'Enfriamiento' },
      { key: 'reaccionFinal', label: 'Reacción final' },
      { key: 'indicacionPost', label: 'Indicación post / evento' },
      { key: 'operador', label: 'Operador' },
    ],
  },
  {
    id: 'faciales',
    nombre: 'Faciales (manchas / microneedling / diodo / picosegundo / radiofrecuencia) — control mensual',
    nombreCorto: 'Faciales',
    planSesiones: 6,
    campos: [
      { key: 'areaFacial', label: 'Área facial', tipo: 'text' },
      { key: 'fototipo', label: 'Fototipo', tipo: 'text' },
      { key: 'melasma', label: 'Melasma', tipo: 'yesno' },
      { key: 'tipoPiel', label: 'Tipo de piel', tipo: 'select', opciones: ['Grasa', 'Mixta', 'Seca'] },
      { key: 'acneRosacea', label: 'Acné / rosácea', tipo: 'yesno' },
      { key: 'fotosBase', label: 'Fotos base tomadas', tipo: 'yesno' },
      { key: 'alergiasMedicamentos', label: 'Alergias / medicamentos', tipo: 'textarea' },
      { key: 'objetivo', label: 'Objetivo', tipo: 'multi', opciones: ['Manchas/melasma', 'Textura/poros', 'Flacidez', 'Cicatriz/acné', 'Luminosidad'] },
      { key: 'activosDomiciliarios', label: 'Activos domiciliarios', tipo: 'multi', opciones: ['SPF', 'Despigmentante', 'Retinoide', 'Ácidos', 'Otro'] },
      { key: 'procedimientoPosible', label: 'Procedimiento posible', tipo: 'multi', opciones: ['Microneedling', 'Picosegundo', 'Diodo', 'Radiofrecuencia'] },
    ],
    consentTexto:
      'Declaro que recibí explicación clara sobre objetivo, técnica, alternativas, cuidados, posibles molestias y riesgos. Autorizo tratamiento facial estético y, según valoración, microneedling, láser diodo, picosegundo y/o radiofrecuencia. Entiendo que se busca mejorar manchas, textura, poros, cicatrices, tono y flacidez de forma progresiva; los resultados son variables, no garantizados y requieren fotoprotección y cuidados en casa. Informaré embarazo/lactancia, bronceado reciente, herpes, infección, heridas, acné inflamatorio severo, rosácea activa, melasma inestable, queloides, epilepsia/fotosensibilidad, marcapasos/implante electrónico, metal en zona, cáncer activo, isotretinoína reciente, retinoides/ácidos/peelings, antibióticos/fotosensibilizantes, anticoagulantes o cualquier cambio de salud.\n\nRiesgos posibles: enrojecimiento, ardor, edema, dolor, resequedad, costras, brote de acné/herpes, infección, hipo/hiperpigmentación, quemadura, ampolla, cicatriz rara, irritación o falta de respuesta.\n\nCuidados 72 horas: usar SPF 50+ diario y reaplicar; evitar sol directo; sin sauna/vapor/jacuzzi/ejercicio intenso; no tallar, rascar ni exfoliar; suspender ácidos/retinoides/despigmentantes irritantes según indicación; limpieza suave e hidratación reparadora; evitar maquillaje si hay sensibilidad; avisar ardor intenso, ampolla, quemadura, inflamación, secreción, dolor persistente o manchas nuevas.',
    consentChecks: [
      { key: 'aceptoProcedimiento', label: 'Autorizo el procedimiento y los cuidados.' },
      { key: 'autorizaEquipo', label: 'Autorizo el uso de equipo según valoración.' },
      { key: 'fotosSeguimiento', label: 'Autorizo fotos clínicas de seguimiento.' },
      { key: 'autorizaContacto', label: 'Autorizo que me contacten por reacción o adherencia.' },
    ],
    columnasSesion: [
      { key: 'tratamiento', label: 'Tratamiento' },
      { key: 'parametros', label: 'Parámetros MN/Láser/RF' },
      { key: 'activosAnestesia', label: 'Activos / anestesia' },
      { key: 'reaccionInmediata', label: 'Reacción inmediata' },
      { key: 'observacion', label: 'Observación / indicación' },
      { key: 'proximaCita', label: 'Próx. cita' },
      { key: 'cuidados72h', label: 'Cuidados 72 h', tipo: 'yesno', ancho: '80px' },
      { key: 'operador', label: 'Operador' },
    ],
  },
  {
    id: 'masajes',
    nombre: 'Masajes reductivos / tonificantes / anticelulíticos — plan de 6 sesiones',
    nombreCorto: 'Masajes',
    planSesiones: 6,
    campos: [
      { key: 'areas', label: 'Área(s)', tipo: 'text' },
      { key: 'peso', label: 'Peso', tipo: 'text' },
      { key: 'cintura', label: 'Cintura', tipo: 'text' },
      { key: 'cadera', label: 'Cadera', tipo: 'text' },
      { key: 'muslo', label: 'Muslo', tipo: 'text' },
      { key: 'fotosMedidasBase', label: 'Fotos / medidas base', tipo: 'yesno' },
      { key: 'objetivo', label: 'Objetivo', tipo: 'multi', opciones: ['Reductivo', 'Tonificante', 'Anticelulítico', 'Mixto'] },
      { key: 'antecedentes', label: 'Antecedentes / medicamentos / contraindicaciones', tipo: 'textarea', ancho: 2 },
      { key: 'equipoPosible', label: 'Equipo posible', tipo: 'multi', opciones: ['RF', 'EMS Sculpt', 'Reverse'] },
    ],
    consentTexto:
      'Declaro que recibí explicación clara sobre objetivo, técnica manual, equipos complementarios y cuidados. Autorizo masaje corporal y, según valoración y tolerancia, radiofrecuencia, EMS Sculpt o Reverse. Entiendo que es un apoyo estético no invasivo para mejorar medidas, tono y apariencia de celulitis; los resultados son variables y no garantizados, y no sustituyen dieta, ejercicio ni atención médica. Informaré embarazo/lactancia, marcapasos/desfibrilador/implante electrónico, metal o prótesis en zona, epilepsia, cáncer activo, trombosis/flebitis, varices dolorosas, hipertensión/diabetes no controlada, enfermedad cardiaca/renal/hepática, fiebre/infección, heridas/dermatitis, cirugía reciente, hernia, alteración de sensibilidad, anticoagulantes o cualquier cambio de salud.\n\nRiesgos posibles: calor, enrojecimiento, sensibilidad, dolor, moretón, inflamación, mareo, irritación, contractura, quemadura rara por calor, exacerbación de condición no declarada o falta de respuesta.',
    consentChecks: [
      { key: 'aceptoProcedimiento', label: 'Autorizo el procedimiento y los cuidados.' },
      { key: 'autorizaEquipo', label: 'Autorizo el uso de equipo según valoración.' },
      { key: 'fotosSeguimiento', label: 'Autorizo fotos / medidas de seguimiento.' },
      { key: 'autorizaContacto', label: 'Autorizo que me contacten por reacción o adherencia.' },
    ],
    columnasSesion: [
      { key: 'zona', label: 'Zona' },
      { key: 'tecnicaManual', label: 'Técnica manual' },
      { key: 'equipo', label: 'Equipo (RF/EMS/Reverse)' },
      { key: 'parametros', label: 'Parámetros (intensidad/tiempo)' },
      { key: 'medidasFoto', label: 'Medidas / foto' },
      { key: 'reaccionFinal', label: 'Reacción final' },
      { key: 'indicacionPost', label: 'Indicación post / evento' },
      { key: 'operador', label: 'Operador' },
    ],
  },
];

export function getProtocolo(id: string): ProtocoloConfig | undefined {
  return PROTOCOLOS.find((p) => p.id === id);
}

export type TratamientoFicha = {
  id: string;
  protocolo: string;
  fecha: string;
  campos: Record<string, string>;
  consent: Record<string, string>;
  firmaUrl: string;
  firmante: string;
  sesiones: Record<string, string>[];
};

const clean = (v: unknown, max = 400) => String(v ?? '').trim().slice(0, max);

// Solo se guardan las claves que el protocolo realmente define (los campos y checks vienen de un
// formulario en el navegador; se saneen igual que cualquier entrada externa).
export function sanitizeCampos(protocolo: ProtocoloConfig, raw: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of protocolo.campos) out[c.key] = clean(raw?.[c.key], c.tipo === 'textarea' ? 2000 : 300);
  return out;
}

export function sanitizeConsent(protocolo: ProtocoloConfig, raw: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of protocolo.consentChecks) out[c.key] = clean(raw?.[c.key], 10);
  return out;
}

export function sanitizeSesion(protocolo: ProtocoloConfig, raw: any): Record<string, string> {
  const out: Record<string, string> = { fecha: clean(raw?.fecha, 40) || new Date().toISOString() };
  for (const col of protocolo.columnasSesion) out[col.key] = clean(raw?.[col.key], col.key === 'observacion' || col.key.startsWith('parametros') ? 500 : 200);
  return out;
}

export function sanitizeSesiones(protocolo: ProtocoloConfig, raw: any): Record<string, string>[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 60).map((s) => sanitizeSesion(protocolo, s));
}
