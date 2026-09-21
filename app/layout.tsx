import type { Metadata, Viewport } from 'next';
import { moduleConfig } from '@/lib/modules';
import TermsReplacer from './components/TermsReplacer';
import './globals.css';
import ActivityTracker from './components/ActivityTracker';

export const metadata: Metadata = {
  title: moduleConfig.appName,
  description: 'Seguimiento de pacientes conectado a GoHighLevel',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: moduleConfig.appName,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0071e3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <ActivityTracker />
        <TermsReplacer />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); }); }`,
          }}
        />
      </body>
    </html>
  );
}
