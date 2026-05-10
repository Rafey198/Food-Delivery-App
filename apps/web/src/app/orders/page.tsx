'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { Clock } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string | number;
  createdAt: string;
  restaurant: { id: string; name: string; logoUrl?: string };
  items: { id: string; nameSnapshot: string; quantity: number }[];
}

const STATUS_BADGE: Record<string, string> = {
  PLACED: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  READY_FOR_PICKUP: 'bg-indigo-100 text-indigo-800',
  COURIER_ASSIGNED: 'bg-indigo-100 text-indigo-800',
  PICKED_UP: 'bg-purple-100 text-purple-800',
  NEAR_CUSTOMER: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
};

export default function OrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Order[] }>('/orders')
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Your orders</h1>
        {loading ? (
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-12 text-center shadow-soft">
            <div className="text-5xl">📦</div>
            <div className="mt-3 font-semibold">No orders yet</div>
            <Link href="/restaurants" className="btn btn-primary mt-4 inline-flex">Find food</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="card flex items-center gap-3 hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.restaurant.logoUrl ?? `https://api.dicebear.com/9.x/icons/svg?seed=${encodeURIComponent(o.restaurant.name)}`}
                  alt={o.restaurant.name}
                  className="h-12 w-12 rounded-xl bg-gray-100"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{o.restaurant.name}</div>
                    <div className="text-sm font-semibold">${Number(o.total).toFixed(2)}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {o.orderNumber} · {o.items.length} item(s) · {new Date(o.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-2">
                    <span className={`badge ${STATUS_BADGE[o.status] ?? 'bg-gray-100'}`}>
                      <Clock className="mr-1 h-3 w-3" /> {o.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
