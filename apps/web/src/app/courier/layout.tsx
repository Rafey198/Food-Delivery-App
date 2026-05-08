'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Bike, Wallet, ShieldQuestion, Inbox } from 'lucide-react';

const NAV = [
  { href: '/courier', label: 'Home', icon: Bike },
  { href: '/courier/offers', label: 'Offers', icon: Inbox },
  { href: '/courier/earnings', label: 'Earnings', icon: Wallet },
  { href: '/courier/transparency', label: 'How pay works', icon: ShieldQuestion },
];

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthGuard role="COURIER">
      <div className="flex min-h-screen flex-col bg-gray-50">
        <main className="flex-1 pb-20">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-gray-100 bg-white">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-col items-center justify-center py-3 text-xs ${pathname === n.href ? 'text-brand-600' : 'text-gray-500'}`}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </AuthGuard>
  );
}
