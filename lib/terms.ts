import { moduleConfig } from './modules';

// En el módulo spa a las personas atendidas se les llama "clientes", no "pacientes".
export function swapPaciente(text: string): string {
  return text.replace(/pacient(?:es|e)/gi, (m) => {
    const plural = m.toLowerCase().endsWith('es');
    const base = plural ? 'clientes' : 'cliente';
    if (m === m.toUpperCase()) return base.toUpperCase();
    if (m[0] === m[0].toUpperCase()) return base[0].toUpperCase() + base.slice(1);
    return base;
  });
}

// Para textos que salen del servidor (notas en GHL, mensajes).
export function tr(text: string): string {
  return moduleConfig.clientes ? swapPaciente(text) : text;
}
