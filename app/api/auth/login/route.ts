import { logEvent } from '@/lib/audit-log';
import { NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getStoredUsers, saveStoredUsers, findGhlUserByEmail } from '@/lib/users-store';
import { cookies } from 'next/headers';
import { signSession, SESSION_COOKIE, FACTURACION_COOKIE, FACTURACION_OTP_COOKIE, ENROLL_COOKIE, signFacturacionOtp, verifyFacturacionOtp, codeDigest } from '@/lib/session';
import { newCode, sendSmsToUser } from '@/lib/sms-code';
import { rateLimited, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Solo pueden entrar los emails que ya son usuarios reales de esta cuenta de
// GoHighLevel. La primera vez que un usuario válido escribe su contraseña,
// se registra aquí mismo (no hay forma de leer su contraseña real de GHL);
// las siguientes veces esa misma contraseña debe coincidir.
export async function POST(request: Request) {
  try {
    const { email, password, code: enrollCode } = await request.json();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (rateLimited('login:' + clientIp(request) + ':' + cleanEmail, 10, 15 * 60 * 1000) || rateLimited('login-ip:' + clientIp(request), 40, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }, { status: 429 });
    }
    const pass = String(password || '');

    if (!cleanEmail || !pass) {
      return NextResponse.json({ error: 'Escribe tu email y contraseña' }, { status: 400 });
    }

    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Falta configurar SESSION_SECRET en el servidor' }, { status: 500 });
    }

    const ghlUser = await findGhlUserByEmail(cleanEmail);
    if (!ghlUser.ok) {
      return NextResponse.json({ error: 'Ese email no pertenece a un usuario de esta cuenta de GoHighLevel' }, { status: 403 });
    }

    const users = await getStoredUsers();
    const existing = users.find((u) => u.email === cleanEmail);
    let enrolled = false;

    if (!existing) {
      if (pass.length < 6) {
        return NextResponse.json({ error: 'Es tu primera vez: elige una contraseña de al menos 6 caracteres' }, { status: 400 });
      }
      // Primer registro: hay que demostrar que el teléfono registrado en GHL es tuyo.
      if (!enrollCode) {
        const code = newCode();
        const sms = await sendSmsToUser(cleanEmail, `Virtual Doctor: tu código para registrar tu contraseña es ${code}. Vence en 5 minutos.`);
        if (!sms.ok) return NextResponse.json({ error: sms.error }, { status: sms.status });
        const token = await signFacturacionOtp({ email: cleanEmail, digest: await codeDigest(cleanEmail, code, secret), exp: Date.now() + 5 * 60 * 1000 }, secret);
        await logEvent('registro_codigo_enviado', '', cleanEmail);
        const res = NextResponse.json({ ok: true, step: 'code', phoneHint: sms.phoneHint });
        res.cookies.set(ENROLL_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 6 });
        return res;
      }
      const enrollToken = (await cookies()).get(ENROLL_COOKIE)?.value;
      const otp = enrollToken ? await verifyFacturacionOtp(enrollToken, secret) : null;
      if (!otp || otp.email !== cleanEmail || Date.now() > otp.exp) {
        return NextResponse.json({ error: 'El código expiró o no es válido, pide uno nuevo' }, { status: 401 });
      }
      if (otp.digest !== (await codeDigest(cleanEmail, String(enrollCode).trim(), secret))) {
        await logEvent('registro_codigo_incorrecto', '', cleanEmail);
        return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 });
      }
      const passwordHash = await hashPassword(pass);
      users.push({ email: cleanEmail, nombre: ghlUser.nombre, passwordHash });
      await saveStoredUsers(users);
      enrolled = true;
    } else {
      const ok = await verifyPassword(pass, existing.passwordHash);
      if (!ok) {
        await logEvent('login_fallido', '', cleanEmail);
        return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
      }
    }

    await logEvent(enrolled ? 'login_primera_vez' : 'login', '', cleanEmail);
    const token = await signSession({ email: cleanEmail, nombre: ghlUser.nombre, iat: Date.now() }, secret);
    const res = NextResponse.json({ ok: true, enrolled, nombre: ghlUser.nombre });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    res.cookies.set(ENROLL_COOKIE, '', { path: '/', maxAge: 0 });
    res.cookies.set(FACTURACION_COOKIE, '', { path: '/', maxAge: 0 });
    res.cookies.set(FACTURACION_OTP_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'No se pudo iniciar sesión' }, { status: 502 });
  }
}
