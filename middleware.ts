import { NextRequest, NextResponse } from 'next/server';
import { verifySession, verifyFormToken, SESSION_COOKIE } from '@/lib/session';

export const config = {
  matcher: ['/((?!_next/).*)'],
};

// Rutas y archivos que el paciente (sin cuenta) o el navegador necesitan
// alcanzar sin haber iniciado sesión: el formulario público, la pantalla de
// login misma, y los archivos estáticos de la PWA.
const PUBLIC_PATHS = [
  '/login',
  '/formulario',
  '/manifest.json',
  '/sw.js',
  '/clinic-logo.png',
  '/galatea-logo.png',
  '/medical-logo.jpg',
  '/odontograma.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon-16.png',
  '/favicon-32.png',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isPublicApi(pathname: string, method: string): boolean {
  if (pathname.startsWith('/api/formulario')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (isPublicApi(pathname, request.method)) return NextResponse.next();

    // El formulario personal precarga los datos del paciente: solo con el token firmado de ESE paciente.
    const m = request.method === 'GET' ? pathname.match(/^\/api\/patients\/([^/]+)(?:\/intake)?$/) : null;
    const formToken = request.nextUrl.searchParams.get('t');
    if (m && formToken && process.env.SESSION_SECRET && (await verifyFormToken(formToken, m[1], process.env.SESSION_SECRET))) {
      return NextResponse.next();
    }
  } else if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  const payload = token && secret ? await verifySession(token, secret) : null;

  if (payload) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'No autorizado, inicia sesión' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}
