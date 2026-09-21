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
};

const MODULES: Record<ModuleId, ModuleConfig> = {
  dental: { id: 'dental', label: 'Dental', odontograma: true, habitosDentales: true, tituloEjemplo: 'Cirujano Dentista' },
  spa: { id: 'spa', label: 'Spa', odontograma: false, habitosDentales: false, tituloEjemplo: 'Cosmiatra / Esteticista' },
  medical: { id: 'medical', label: 'Medicina', odontograma: false, habitosDentales: false, tituloEjemplo: 'Médico Cirujano' },
};

const requested = process.env.NEXT_PUBLIC_MODULE as ModuleId | undefined;

export const moduleConfig: ModuleConfig = (requested && MODULES[requested]) || MODULES.dental;
