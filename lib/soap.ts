export type Soap = { s: string; o: string; a: string; p: string };

// Nota de evolución (SOAP): Subjetivo, Objetivo, Análisis y Plan. Solo se guarda si trae algo.
export function cleanSoap(v: any): Soap | null {
  if (!v || typeof v !== 'object') return null;
  const c = (x: unknown) => String(x ?? '').trim().slice(0, 4000);
  const soap = { s: c(v.s), o: c(v.o), a: c(v.a), p: c(v.p) };
  return soap.s || soap.o || soap.a || soap.p ? soap : null;
}
