'use client';

import { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { getStoredUser } from '@/lib/api';

export function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useApp((s) => s.setUser);
  const loadCart = useApp((s) => s.loadCart);

  useEffect(() => {
    const user = getStoredUser();
    setUser(user);
    if (user?.role === 'CUSTOMER') loadCart();
    const handler = () => {
      const u = getStoredUser();
      setUser(u);
      if (u?.role === 'CUSTOMER') loadCart();
    };
    window.addEventListener('auth-changed', handler);
    return () => window.removeEventListener('auth-changed', handler);
  }, [setUser, loadCart]);

  return <>{children}</>;
}
