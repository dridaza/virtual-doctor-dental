# Virtual Doctor — módulo dental

Panel de historia clínica y gestión de pacientes conectado a GoHighLevel (GHL). Next.js, desplegado en Vercel.

## Desarrollo local

```bash
npm install
npm run dev
```

Crea un archivo `.env.local` con las variables de entorno (nunca se sube a git):

| Variable | Para qué sirve |
| --- | --- |
| `GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_INTAKE_FIELD_ID` | Conexión con la cuenta de GHL |
| `GHL_BASE_URL`, `GHL_API_VERSION` | API de GHL (por defecto `https://services.leadconnectorhq.com`, `v3`) |
| `SESSION_SECRET` | Firma de sesiones y enlaces personales del formulario |
| `NEXT_PUBLIC_CLINIC_NAME`, `_ADDRESS`, `_PHONE`, `_WEBSITE` | Datos de la clínica en membretes e impresiones |
| `EDIT_LOCK_DAYS` | Días para cerrar registros de Seguimiento (45 por defecto, `0` = sin cierre) |

## Despliegue

Cada cambio en la rama `main` se publica automáticamente en Vercel. Las variables de entorno se configuran en el panel de Vercel.

## Módulos y clientes nuevos

Un solo código sirve para los tres módulos (dental, spa y medicina). **Cada negocio tiene su propia instalación** en Vercel y su propia cuenta de GHL; nada se comparte entre clientes. La variable `NEXT_PUBLIC_MODULE` (`dental`, `spa` o `medical`; por defecto `dental`) decide qué partes del sistema aparecen.

Para instalar un cliente nuevo:

1. Crea en GHL una integración privada con permisos sobre contactos, notas, calendarios, facturas, productos, conversaciones, usuarios, medios y valores personalizados, y copia su llave.
2. Ejecuta el script de preparación de la cuenta nueva:
   ```bash
   GHL_API_KEY=... GHL_LOCATION_ID=... node scripts/setup-ghl-account.mjs
   ```
   Crea el campo donde se guarda la historia clínica, revisa usuarios, calendarios y productos, y muestra las variables de entorno que hay que poner en Vercel. Se puede repetir sin duplicar nada.
3. Crea un proyecto nuevo en Vercel desde este mismo repositorio y configura las variables de entorno (incluye una `SESSION_SECRET` nueva y `NEXT_PUBLIC_MODULE`).
4. Pide a un administrador del cliente que entre a Setup y llene los datos profesionales.
