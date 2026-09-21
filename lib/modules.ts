// Módulo de esta instalación. Cada cliente tiene su propia instalación y su propia cuenta
// de GHL; la variable NEXT_PUBLIC_MODULE (dental | spa | medical) decide qué partes del
// sistema aparecen. Sin la variable, es el módulo dental.
export type ModuleId = 'dental' | 'spa' | 'medical';

export type ModuleConfig = {
  id: ModuleId;
  label: string;
  odontograma: boolean;
  habitosDentales: boolean;
  tituloEjemplo: string;
  // Textos de Seguimiento y recibos
  piezaLabel: string;
  piezaEjemplo: string;
  materialLabel: string;
  materialLista: boolean; // true = lista fija (dental); false = texto libre
  tratamientoEjemplo: string;
  visitaHint: string;
  conceptoRecibo: string;
};

const MODULES: Record<ModuleId, ModuleConfig> = {
  dental: {
    id: 'dental', label: 'Dental', odontograma: true, habitosDentales: true, tituloEjemplo: 'Cirujano Dentista',
    piezaLabel: 'Pieza', piezaEjemplo: '14', materialLabel: 'Material', materialLista: true, tratamientoEjemplo: 'Ej. Obturación',
    visitaHint: 'Qué se hizo, en qué pieza y con qué material.', conceptoRecibo: 'Consulta / tratamiento dental',
  },
  spa: {
    id: 'spa', label: 'Spa', odontograma: false, habitosDentales: false, tituloEjemplo: 'Cosmiatra / Esteticista',
    piezaLabel: 'Zona', piezaEjemplo: 'Rostro', materialLabel: 'Producto / equipo', materialLista: false, tratamientoEjemplo: 'Ej. Peeling superficial',
    visitaHint: 'Qué se hizo, en qué zona y con qué producto o equipo.', conceptoRecibo: 'Consulta / tratamiento estético',
  },
  medical: {
    id: 'medical', label: 'Medicina', odontograma: false, habitosDentales: false, tituloEjemplo: 'Médico Cirujano',
    piezaLabel: 'Zona', piezaEjemplo: 'Abdomen', materialLabel: 'Material / medicamento', materialLista: false, tratamientoEjemplo: 'Ej. Consulta de control',
    visitaHint: 'Qué se hizo, en qué zona y con qué material o medicamento.', conceptoRecibo: 'Consulta médica',
  },
};

const requested = process.env.NEXT_PUBLIC_MODULE as ModuleId | undefined;

export const moduleConfig: ModuleConfig = (requested && MODULES[requested]) || MODULES.dental;
