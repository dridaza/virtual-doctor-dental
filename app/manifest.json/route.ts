import { moduleConfig } from '@/lib/modules';

export const dynamic = 'force-static';

// Manifiesto de la app instalable: el nombre depende del módulo de esta instalación.
export function GET() {
  return Response.json(
    {
      name: moduleConfig.appName,
      short_name: moduleConfig.appName,
      description: 'Panel de historia clinica, seguimiento, facturacion y citas conectado a GoHighLevel',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#f5f5f7',
      theme_color: '#0071e3',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  );
}
