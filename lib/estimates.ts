import { ghlFetch, getLocationId } from './ghl';
import { currentUserEmail } from './audit-log';
import { listGhlUsers } from './users-store';

export type Channel = 'email' | 'sms';
export type SendResult = Partial<Record<Channel, { ok: boolean; error?: string }>>;

function errorText(err: any): string {
  const m = err?.data?.message ?? err?.message ?? 'error desconocido';
  return Array.isArray(m) ? m.join(', ') : String(m);
}

// Envía el presupuesto por cada canal por separado, para que si uno falla el otro
// igual salga, y se sepa exactamente cuál falló y por qué.
export async function sendEstimate(estimateId: string, channels: Channel[]): Promise<SendResult> {
  const email = await currentUserEmail();
  const users = await listGhlUsers();
  const me = users.find((u) => u.email === email) || users[0];
  const result: SendResult = {};
  for (const action of channels) {
    try {
      await ghlFetch(`/invoices/estimate/${estimateId}/send`, {
        method: 'POST',
        body: JSON.stringify({ altId: getLocationId(), altType: 'location', action, liveMode: true, userId: me?.id }),
      });
      result[action] = { ok: true };
    } catch (err: any) {
      result[action] = { ok: false, error: errorText(err) };
    }
  }
  return result;
}

export function channelsFrom(send: string): Channel[] {
  return send === 'sms_and_email' ? ['email', 'sms'] : send === 'email' ? ['email'] : send === 'sms' ? ['sms'] : [];
}

export function describeSend(result: SendResult): { sent: boolean; message: string } {
  const parts: string[] = [];
  let sent = false;
  for (const [ch, r] of Object.entries(result) as [Channel, { ok: boolean; error?: string }][]) {
    const label = ch === 'email' ? 'email' : 'SMS';
    if (r.ok) {
      sent = true;
      parts.push(`enviado por ${label}`);
    } else {
      parts.push(`no se pudo enviar por ${label} (${r.error})`);
    }
  }
  return { sent, message: parts.join('; ') };
}
