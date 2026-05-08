'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Dashboard {
  kpis: {
    orders: number;
    gmv: number;
    activeCustomers: number;
    activeRestaurants: number;
    activeCouriers: number;
    cancellationRate: number;
    refundRate: number;
    avgDeliveryMinutes: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: string;
    status: string;
    createdAt: string;
    customer: { name: string };
    restaurant: { name: string };
  }>;
}

export default function AdminOverview() {
  const [data, setData] = useState<Dashboard | null>(null);
  useEffect(() => {
    api<Dashboard>('/admin/dashboard').then(setData);
  }, []);
  if (!data) return <div className="p-6">Loading…</div>;
  const k = data.kpis;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Platform overview</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Kpi label="Orders" value={k.orders.toString()} />
        <Kpi label="GMV" value={`$${k.gmv.toFixed(0)}`} />
        <Kpi label="Active customers" value={k.activeCustomers.toString()} />
        <Kpi label="Active restaurants" value={k.activeRestaurants.toString()} />
        <Kpi label="Active couriers" value={k.activeCouriers.toString()} />
        <Kpi label="Avg delivery" value={`${k.avgDeliveryMinutes} min`} />
        <Kpi label="Cancellation" value={`${(k.cancellationRate * 100).toFixed(1)}%`} />
        <Kpi label="Refund" value={`${(k.refundRate * 100).toFixed(1)}%`} />
      </div>

      <div className="card mt-6">
        <h2 className="text-base font-semibold">Recent orders</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Order</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Restaurant</th>
              <th className="py-2">Status</th>
              <th className="py-2">Total</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.recentOrders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="py-2 font-medium">{o.orderNumber}</td>
                <td className="py-2">{o.customer.name}</td>
                <td className="py-2">{o.restaurant.name}</td>
                <td className="py-2"><span className="badge">{o.status}</span></td>
                <td className="py-2">${Number(o.total).toFixed(2)}</td>
                <td className="py-2 text-gray-500">{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
