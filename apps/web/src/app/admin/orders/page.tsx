'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  customer: { name: string };
  restaurant: { name: string };
}

export default function AdminOrders() {
  const [items, setItems] = useState<Order[]>([]);
  const [filter, setFilter] = useState('');

  async function load() {
    const d = await api<{ items: Order[] }>(`/admin/orders${filter ? `?status=${filter}` : ''}`);
    setItems(d.items);
  }
  useEffect(() => {
    load();
  }, [filter]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <select className="input max-w-[200px]" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['PLACED', 'ACCEPTED', 'PREPARING', 'COURIER_ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
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
            {items.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="py-2 font-medium">{o.orderNumber}</td>
                <td className="py-2">{o.customer?.name ?? '—'}</td>
                <td className="py-2">{o.restaurant?.name ?? '—'}</td>
                <td className="py-2"><span className="badge">{o.status}</span></td>
                <td className="py-2">${Number(o.total).toFixed(2)}</td>
                <td className="py-2 text-gray-500">{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-500">No orders</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
