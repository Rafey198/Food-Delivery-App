'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Dashboard {
  restaurant: { id: string; name: string; isOpen: boolean };
  today: { orders: number; revenue: number };
  lifetime: { orders: number; revenue: number; cancellationRate: number; averageRating: number };
  bestSellers: Array<{ menuItemId: string; nameSnapshot: string; _sum: { quantity: number } }>;
  lowStock: Array<{ id: string; name: string }>;
}

export default function MerchantDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  useEffect(() => {
    api<Dashboard>('/merchant/dashboard').then(setData);
  }, []);
  if (!data) return <div className="p-6">Loading…</div>;
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.restaurant.name}</h1>
          <div className="text-sm text-gray-500">Welcome back to your dashboard</div>
        </div>
        <span className={`badge ${data.restaurant.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {data.restaurant.isOpen ? 'Open' : 'Closed'}
        </span>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Kpi label="Orders today" value={data.today.orders} />
        <Kpi label="Revenue today" value={`$${data.today.revenue.toFixed(2)}`} />
        <Kpi label="Lifetime orders" value={data.lifetime.orders} />
        <Kpi label="Average rating" value={`${data.lifetime.averageRating.toFixed(1)} ★`} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-base font-semibold">Best sellers</h2>
          <div className="mt-3 space-y-2">
            {data.bestSellers.map((b) => (
              <div key={b.menuItemId} className="flex items-center justify-between text-sm">
                <span>{b.nameSnapshot}</span>
                <span className="font-medium">{b._sum.quantity ?? 0} sold</span>
              </div>
            ))}
            {!data.bestSellers.length && <div className="text-sm text-gray-500">No data yet.</div>}
          </div>
        </div>
        <div className="card">
          <h2 className="text-base font-semibold">Out of stock</h2>
          <div className="mt-3 space-y-2 text-sm">
            {data.lowStock.map((m) => (
              <div key={m.id}>{m.name}</div>
            ))}
            {!data.lowStock.length && <div className="text-gray-500">Everything in stock.</div>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Kpi label="Lifetime revenue" value={`$${data.lifetime.revenue.toFixed(2)}`} />
        <Kpi label="Cancellation rate" value={`${(data.lifetime.cancellationRate * 100).toFixed(1)}%`} />
        <Kpi label="Service" value={data.restaurant.isOpen ? 'Accepting orders' : 'Paused'} />
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
