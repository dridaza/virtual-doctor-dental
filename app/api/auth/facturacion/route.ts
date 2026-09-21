import { logEvent } from '@/lib/audit-log';
import { rateLimited } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ghlFetch } from '@/lib/ghl';
import { hasFacturacionPassword, setFacturacionPassword, verifyFacturacionPassword } from '@/lib/facturacion-auth';
import { findGhlUserByEmail } from '@/lib/users-store';
import { findContactIdByPhone } from '@/lib/contact-lookup';
import {
  signFacturacionUnlock,
  verifyFacturacionUnlock,
  signFacturacionOtp,
  verifyFacturacionOtp,
  codeDigest,
  verifySession,
  FACTURACION_COOKIE,
  FACTURACION_OTP_COOKIE,
  SESSION_COOKIE,
} from '@/lib/session';

export const dynamic = 'force-dynamic';

const OTP_TTL_MS = 5 * 60 * 1000;

// Segunda verificación de Facturación, en dos pasos (2FA real):
// 1) la contraseña de Facturación (distinta a la de inicio de sesión), y
// 2) un código de 6 dígitos que se manda por SMS al teléfono del usuario que
//    inició sesión (el mismo que tiene registrado como usuario de GHL).
// Queda desbloqueada unas horas por navegador, no hay que repetir los dos
// pasos en cada clic.
export async function GET() {
  const store = await cookies();
  const sessionSecret = process.env.SESSION_SECRET;
  const sessionToken = store.get(SESSION_COOKIE)?.value;
  const session = sessionToken && sessionSecret ? await verifySession(sessionToken, sessionSecret) : null;
  if (session) {
    const me = await findGhlUserByEmail(session.email);
    if (me.ok && me.rol !== 'Usuario') return NextResponse.json({ hasPassword: true, unlocked: true, admin: true });
  }
  const token = store.get(FACTURACION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  const unlocked = !!(token && secret && (await verifyFacturacionUnlock(token, secret)));
  const hasPassword = await hasFacturacionPassword();
  return NextResponse.json({ hasPassword, unlocked });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Falta configurar SESSION_SECRET en el servidor' }, { status: 500 });
    }

    const store = await cookies();
    const sessionToken = store.get(SESSION_COOKIE)?.value;
    const session = sessionToken ? await verifySession(sessionToken, secret) : null;
    if (!session) {
      return NextResponse.json({ error: 'Tu sesión expiró, inicia sesión de nuevo' }, { status: 401 });
    }

    if (body.action === 'set') {
      const pass = String(body.password || '');
      if (pass.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }
      await setFacturacionPassword(pass);
      await logEvent('cambio_password_seguridad', '', session.email);
      return NextResponse.json({ ok: true });
    }

    if (rateLimited('fact:' + session.email, 15, 10 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }

    if (body.action === 'verify-otp') {
      const code = String(body.code || '').trim();
      const otpToken = store.get(FACTURACION_OTP_COOKIE)?.value;
      const otp = otpToken ? await verifyFacturacionOtp(otpToken, secret) : null;
      if (!otp || otp.email !== session.email || Date.now() > otp.exp) {
        return NextResponse.json({ error: 'El código expiró o no es válido, pide uno nuevo' }, { status: 401 });
      }
      if (otp.digest !== (await codeDigest(session.email, code, secret))) {
        await logEvent('2fa_codigo_incorrecto', '', session.email);
        return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 });
      }

      await logEvent('2fa_desbloqueo', 'Facturación/Backup desbloqueado 1 hora', session.email);
      const unlockToken = await signFacturacionUnlock(secret);
      const res = NextResponse.json({ ok: true, unlocked: true });
      res.cookies.set(FACTURACION_COOKIE, unlockToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
      });
      res.cookies.set(FACTURACION_OTP_COOKIE, '', { path: '/', maxAge: 0 });
      return res;
    }

    // Paso 1 (o llamada directa sin "action"): verificar la contraseña de Facturación.
    const pass = String(body.password || '');
    const ok = await verifyFacturacionPassword(pass);
    if (!ok) {
      await logEvent('2fa_password_incorrecta', '', session.email);
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    const ghlUser = await findGhlUserByEmail(session.email);
    if (!ghlUser.phone) {
      return NextResponse.json({ error: 'Tu usuario de GoHighLevel no tiene un teléfono registrado para mandar el código' }, { status: 400 });
    }
    const contactId = await findContactIdByPhone(ghlUser.phone);
    if (!contactId) {
      return NextResponse.json(
        { error: 'No se encontró un contacto con tu teléfono en GoHighLevel para poder mandarte el código por SMS' },
        { status: 400 }
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    try {
      await ghlFetch('/conversations/messages', {
        method: 'POST',
        body: JSON.stringify({
          type: 'SMS',
          contactId,
          message: `Virtual Doctor: tu código para entrar a Facturación es ${code}. Vence en 5 minutos.`,
        }),
      });
    } catch (err: any) {
      return NextResponse.json({ error: `No se pudo enviar el código por SMS: ${err?.message || 'error desconocido'}` }, { status: 502 });
    }

    const otpToken = await signFacturacionOtp({ email: session.email, digest: await codeDigest(session.email, code, secret), exp: Date.now() + OTP_TTL_MS }, secret);
    const res = NextResponse.json({ ok: true, step: 'otp', phoneHint: ghlUser.phone.slice(-4) });
    res.cookies.set(FACTURACION_OTP_COOKIE, otpToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 6,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo verificar' }, { status: 502 });
  }
}
