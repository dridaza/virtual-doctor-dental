// Logo de la clínica: ruta dentro de /public (NEXT_PUBLIC_CLINIC_LOGO). "none" = sin logo.
const raw = process.env.NEXT_PUBLIC_CLINIC_LOGO ?? '/clinic-logo.png';
export const CLINIC_LOGO = raw === 'none' ? '' : raw;
