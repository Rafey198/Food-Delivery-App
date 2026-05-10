'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';

export function AuthGuard({ role, children }: { role: 'CUSTOMER' | 'MERCHANT' | 'COURIER' | 'ADMIN'; children: React.ReactNode }) {
  const user = useApp((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace('/login');
    else if (user && user.role !== role) router.replace('/');
  }, [user, role, router]);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-gray-500">
        Checking authentication…
      </div>
    );
  }
  if (user.role !== role) return null;
  return <>{children}</>;
}
