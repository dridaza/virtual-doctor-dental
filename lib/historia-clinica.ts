// Número de historia clínica: derivado de forma determinista y estable del id
// del contacto en GHL (que ya es único), sin depender de un contador externo.
// Así todo paciente -existente o nuevo- tiene un número permanente al instante,
// sin necesidad de migraciones ni de una base de datos aparte.
export function getNumeroHistoriaClinica(contactId: string): string {
  const clean = String(contactId || '').replace(/[^a-zA-Z0-9]/g, '');
  const suffix = clean.slice(-8) || clean;
  return `HC-${suffix}`;
}
