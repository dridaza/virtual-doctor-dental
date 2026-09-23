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

// El dashboard entero (todo menos el formulario que llena el paciente y los archivos
// estáticos que ese formulario necesita) queda oculto detrás de una contraseña compartida,
// aparte del inicio de sesión normal de cada persona: así no es un sitio público en internet,
// aunque alguien adivine la URL de Vercel, no llega ni a la pantalla de login.
const BASIC_AUTH_EXEMPT = ['/formulario', '/api/formulario'];
const ASSET_EXEMPT = new Set([
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
]);

function needsBasicAuth(pathname: string): boolean {
  if (ASSET_EXEMPT.has(pathname)) return false;
  return !BASIC_AUTH_EXEMPT.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function checkBasicAuth(request: NextRequest): NextResponse | null {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) return null; // sin configurar: no se exige (para no bloquear en local)
  if (!needsBasicAuth(request.nextUrl.pathname)) return null;

  const header = request.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    try {
      const [u, p] = atob(header.slice(6)).split(':');
      if (u === user && p === pass) return null;
    } catch {
      /* encabezado corrupto: se trata como no autenticado */
    }
  }
  return new NextResponse('Acceso restringido', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Virtual Doctor", charset="UTF-8"' },
  });
}

// Cada instalación puede tener, además de su dominio propio, la URL automática de Vercel (y a
// veces una más vieja de un renombre anterior) apuntando a lo mismo. Con CANONICAL_DOMAIN puesto,
// cualquier otro nombre de host se redirige ahí (mismo camino y parámetros), para que en la
// práctica solo exista un enlace, aunque las otras URLs de Vercel nunca dejen de existir.
function canonicalRedirect(request: NextRequest): NextResponse | null {
  const canonical = process.env.CANONICAL_DOMAIN;
  if (!canonical) return null;
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(':')[0];
  if (!host || host === canonical) return null;
  return NextResponse.redirect(`https://${canonical}${request.nextUrl.pathname}${request.nextUrl.search}`, 308);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const redirect = canonicalRedirect(request);
  if (redirect) return redirect;

  const basicAuthChallenge = checkBasicAuth(request);
  if (basicAuthChallenge) return basicAuthChallenge;

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
