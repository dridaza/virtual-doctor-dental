'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UserBadge() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; nombre: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  if (!user) return null;

  return (
    <div className="user-badge">
      <button type="button" onClick={logout}>Cerrar sesión</button>
    </div>
  );
}
