const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DIECIS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const VEINTIS = ['VEINTE', 'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function segmentoATexto(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  let texto = '';
  const c = Math.floor(n / 100);
  const resto = n % 100;

  if (c > 0) texto += CENTENAS[c] + ' ';

  if (resto >= 10 && resto < 20) {
    texto += DIECIS[resto - 10];
  } else if (resto >= 20 && resto < 30) {
    texto += VEINTIS[resto - 20];
  } else {
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    if (d > 0) {
      texto += DECENAS[d];
      if (u > 0) texto += ' Y ' + UNIDADES[u];
    } else if (u > 0) {
      texto += UNIDADES[u];
    }
  }
  return texto.trim();
}

function enteroATexto(n: number): string {
  if (n === 0) return 'CERO';
  if (n === 1) return 'UN';

  let resto = n;
  const partes: string[] = [];

  const millones = Math.floor(resto / 1_000_000);
  resto %= 1_000_000;
  const miles = Math.floor(resto / 1000);
  resto %= 1000;
  const cientos = resto;

  if (millones > 0) {
    partes.push(millones === 1 ? 'UN MILLON' : `${enteroATexto(millones)} MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${segmentoATexto(miles)} MIL`);
  }
  if (cientos > 0) {
    partes.push(segmentoATexto(cientos));
  }

  return partes.join(' ').trim();
}

// Convierte un monto en pesos mexicanos al texto que se usa en los recibos:
// "SON: TRESCIENTOS PESOS 50/100 M.N."
export function montoEnLetras(monto: number): string {
  const centavos = Math.round(monto * 100) % 100;
  const pesos = Math.floor(monto);
  // Apócope: "VEINTIUNO" -> "VEINTIUN" cuando antecede a "PESOS" (regla del español formal).
  const pesosTexto = enteroATexto(pesos).replace(/UNO$/, 'UN');
  const unidad = pesos === 1 ? 'PESO' : 'PESOS';
  return `${pesosTexto} ${unidad} ${String(centavos).padStart(2, '0')}/100 M.N.`;
}
