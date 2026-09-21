// Días tras los cuales un registro de Seguimiento se cierra. Por defecto 45 (instalaciones nuevas);
// EDIT_LOCK_DAYS=0 desactiva el cierre.
export function editLockDays(): number {
  const raw = process.env.EDIT_LOCK_DAYS;
  if (raw === undefined || raw === '') return 45;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 45;
}
