'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { LayoutDashboard, Users, Store, Bike, Receipt, Tag, BarChart3, ShieldQuestion, FileWarning, Cpu } from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: Receipt },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/restaurants', label: 'Restaurants', icon: Store },
  { href: '/admin/couriers', label: 'Couriers', icon: Bike },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/ai-agents', label: 'AI Agents', icon: Cpu },
  { href: '/admin/support', label: 'Support', icon: ShieldQuestion },
  { href: '/admin/audit', label: 'Audit logs', icon: FileWarning },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthGuard role="ADMIN">
      <div className="flex min-h-screen bg-gray-50">
        <aside className="hidden w-64 shrink-0 border-r border-gray-100 bg-white p-4 md:block">
          <div className="mb-6 px-2">
            <div className="font-semibold">FoodPilot Admin</div>
            <div className="text-xs text-gray-500">Platform operator</div>
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
