'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { LayoutDashboard, Utensils, ClipboardList, Star, Wallet, Settings } from 'lucide-react';

const NAV = [
  { href: '/merchant', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/merchant/orders', label: 'Orders', icon: ClipboardList },
  { href: '/merchant/menu', label: 'Menu', icon: Utensils },
  { href: '/merchant/reviews', label: 'Reviews', icon: Star },
  { href: '/merchant/payouts', label: 'Payouts', icon: Wallet },
  { href: '/merchant/settings', label: 'Settings', icon: Settings },
];

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthGuard role="MERCHANT">
      <div className="flex min-h-screen bg-gray-50">
        <aside className="hidden w-60 shrink-0 border-r border-gray-100 bg-white p-4 md:block">
          <div className="mb-6 px-2">
            <div className="font-semibold">FoodPilot Merchant</div>
            <div className="text-xs text-gray-500">Restaurant portal</div>
          </div>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${pathname === n.href ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </AuthGuard>
  );
}
