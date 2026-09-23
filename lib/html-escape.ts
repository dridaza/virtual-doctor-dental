// Escapa texto que viene de un dato editable (nombre del paciente, del formulario público, etc.)
// antes de meterlo en un HTML que se manda por correo. Sin esto, alguien podía escribir su nombre
// en el formulario público como "<img src=x onerror=...>" y ese HTML se insertaba tal cual en el
// correo del recibo o la receta que el consultorio manda después.
export function escapeHtml(value: string): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
