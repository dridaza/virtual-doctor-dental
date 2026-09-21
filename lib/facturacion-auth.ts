import { ghlFetch, getLocationId } from './ghl';
import { hashPassword, verifyPassword } from './auth';

const CUSTOM_VALUE_NAME = 'Virtual Doctor - Password Facturacion';

async function findCustomValue() {
  const data = await ghlFetch<{ customValues: any[] }>(`/locations/${getLocationId()}/customValues`);
  return (data.customValues || []).find((v: any) => v.name === CUSTOM_VALUE_NAME) || null;
}

export async function hasFacturacionPassword(): Promise<boolean> {
  const cv = await findCustomValue();
  return !!cv?.value;
}

export async function setFacturacionPassword(password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  const cv = await findCustomValue();
  const body = JSON.stringify({ name: CUSTOM_VALUE_NAME, value: passwordHash });
  if (cv) {
    await ghlFetch(`/locations/${getLocationId()}/customValues/${cv.id}`, { method: 'PUT', body });
  } else {
    await ghlFetch(`/locations/${getLocationId()}/customValues`, { method: 'POST', body });
  }
}

export async function verifyFacturacionPassword(password: string): Promise<boolean> {
  const cv = await findCustomValue();
  if (!cv?.value) return false;
  return verifyPassword(password, cv.value);
}
