export const QUOTES: string[] = [
  'Una sonrisa es la mejor carta de presentación.',
  'Cada paciente es una oportunidad de cambiar un día entero.',
  'La excelencia no es un acto, sino un hábito.',
  'Cuida los detalles; de ellos depende la confianza del paciente.',
  'El mejor tratamiento empieza con una buena escucha.',
  'La constancia vence lo que la intensidad no logra.',
  'Un equipo unido cuida mejor a cada paciente.',
  'Hoy es una buena oportunidad para superar el día de ayer.',
  'La calidad se nota incluso en lo que no se ve.',
  'Pequeños cuidados diarios generan grandes sonrisas.',
  'La confianza se construye cita a cita.',
  'La preparación de hoy es el éxito de mañana.',
  'Nada reemplaza el trato humano y cercano.',
  'Ser puntual es la primera forma de respeto al paciente.',
  'Cada sonrisa que cuidamos, cuenta una historia distinta.',
  'La paciencia y la precisión van de la mano.',
  'Un buen día empieza con una buena actitud.',
  'Lo simple, bien hecho, también es excelencia.',
  'Cada consulta es una nueva oportunidad de hacer bien las cosas.',
  'La empatía cura tanto como el tratamiento mismo.',
  'Trabajar con propósito transforma la rutina en vocación.',
  'La mejor publicidad es un paciente satisfecho.',
  'Cuidar los detalles pequeños construye resultados grandes.',
  'Escuchar es el primer paso de un buen diagnóstico.',
  'La disciplina de hoy define la reputación de mañana.',
  'Un ambiente cálido también forma parte del tratamiento.',
  'La mejora continua no tiene línea de meta.',
  'Cada "gracias" de un paciente vale un gran esfuerzo.',
  'La profesionalidad se nota en la puntualidad y la claridad.',
  'Hacer las cosas bien, aunque nadie lo note.',
];

export function quoteOfTheDay(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
}
