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
