// Prepara una cuenta de GoHighLevel para usarla con Virtual Doctor.
//
//   node --env-file=.env.local scripts/setup-ghl-account.mjs
//
// Necesita GHL_API_KEY y GHL_LOCATION_ID (de la cuenta NUEVA). Crea el campo personalizado donde se
// guarda la historia clínica (si no existe), revisa que la cuenta esté lista y muestra las variables
// de entorno que hay que configurar en Vercel. Se puede repetir sin problema: no duplica nada.

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const KEY = process.env.GHL_API_KEY;
const LOC = process.env.GHL_LOCATION_ID;
const FIELD_NAME = (() => {
  const i = process.argv.indexOf('--field-name');
  return i > 0 ? process.argv[i + 1] : 'HC - Ficha Clinica (JSON)';
})();

if (!KEY || !LOC) {
  console.error('Faltan GHL_API_KEY y GHL_LOCATION_ID en el entorno.');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const call = async (path, options = {}) => {
  const res = await fetch(BASE + path, { headers, ...options });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
};

const problems = [];
const ok = (msg) => console.log('  ✔ ' + msg);
const warn = (msg) => { problems.push(msg); console.log('  ✖ ' + msg); };

console.log('\n1. Conexión con la cuenta');
const loc = await call(`/locations/${LOC}`);
if (!loc.ok) {
  console.error(`  ✖ No se pudo leer la cuenta (HTTP ${loc.status}). Revisa la llave y el ID de ubicación.`);
  process.exit(1);
}
const l = loc.data.location;
ok(`Cuenta: ${l.name}`);
if (!l.phone) warn('La cuenta no tiene teléfono en su perfil (sale en recibos e impresiones).');
if (!l.address) warn('La cuenta no tiene dirección en su perfil (sale en el membrete y en las recetas).');
if (!l.email) warn('La cuenta no tiene correo en su perfil (se usa como remitente de los recibos por email).');

console.log('\n2. Campo de la historia clínica');
const fields = await call(`/locations/${LOC}/customFields?model=contact`);
if (!fields.ok) {
  console.error(`  ✖ No se pudieron leer los campos personalizados (HTTP ${fields.status}).`);
  process.exit(1);
}
let field = (fields.data.customFields || []).find((f) => f.name === FIELD_NAME);
if (field) {
  ok(`Ya existe: "${FIELD_NAME}"`);
} else {
  const created = await call(`/locations/${LOC}/customFields`, {
    method: 'POST',
    body: JSON.stringify({
      name: FIELD_NAME,
      dataType: 'LARGE_TEXT',
      model: 'contact',
      placeholder: 'No editar manualmente. Gestionado por Virtual Doctor.',
    }),
  });
  if (!created.ok) {
    console.error(`  ✖ No se pudo crear el campo (HTTP ${created.status}): ${JSON.stringify(created.data).slice(0, 200)}`);
    process.exit(1);
  }
  field = created.data.customField || created.data;
  ok(`Creado: "${FIELD_NAME}"`);
}

console.log('\n3. Usuarios (para el inicio de sesión y el código SMS)');
const users = await call(`/users/?locationId=${LOC}`);
const list = (users.data?.users || []).filter((u) => !u.deleted);
if (!list.length) warn('No hay usuarios en la cuenta: nadie podría iniciar sesión.');
for (const u of list) {
  const rol = u.roles?.type === 'agency' ? 'dueño de agencia' : u.roles?.role === 'admin' ? 'administrador' : 'usuario';
  ok(`${u.name || u.email} (${u.email}) — ${rol}${u.phone ? '' : ' — SIN TELÉFONO'}`);
  if (!u.phone) warn(`${u.email} no tiene teléfono: no podrá recibir códigos por SMS.`);
}

console.log('\n4. Calendarios y productos');
const cals = await call(`/calendars/?locationId=${LOC}`);
const nCals = (cals.data?.calendars || []).filter((c) => c.isActive !== false).length;
nCals ? ok(`${nCals} calendario(s) activo(s)`) : warn('No hay calendarios activos: no se podrán agendar citas desde la app.');
const prods = await call(`/products/?locationId=${LOC}&limit=100&offset=0`);
const nProds = (prods.data?.products || []).length;
nProds ? ok(`${nProds} producto(s) en el catálogo`) : warn('No hay productos: no habrá botones de productos en presupuestos y pagos (se pueden escribir conceptos libres).');

console.log('\n════════ Variables de entorno para Vercel ════════');
console.log(`GHL_API_KEY=<la misma llave que usaste>`);
console.log(`GHL_LOCATION_ID=${LOC}`);
console.log(`GHL_INTAKE_FIELD_ID=${field.id}`);
console.log('SESSION_SECRET=<genera una nueva: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))">');
console.log('NEXT_PUBLIC_MODULE=dental   (dental | spa | medical)');
console.log('NEXT_PUBLIC_CLINIC_NAME=  NEXT_PUBLIC_CLINIC_ADDRESS=  NEXT_PUBLIC_CLINIC_PHONE=  NEXT_PUBLIC_CLINIC_WEBSITE=');
console.log('\n' + (problems.length ? `Revisar antes de entregar (${problems.length}):\n - ${problems.join('\n - ')}` : 'La cuenta está lista.'));
