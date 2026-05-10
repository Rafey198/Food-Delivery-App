'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  items: Array<{ id: string; nameSnapshot: string; quantity: number }>;
  customer: { name: string; phone?: string };
  address: { line1: string; city: string };
}

const COLUMNS: Array<{ id: string; label: string; statuses: string[] }> = [
  { id: 'incoming', label: 'New', statuses: ['PLACED'] },
  { id: 'preparing', label: 'Preparing', statuses: ['ACCEPTED', 'PREPARING'] },
  { id: 'ready', label: 'Ready / Out', statuses: ['READY_FOR_PICKUP', 'COURIER_ASSIGNED', 'PICKED_UP'] },
  { id: 'done', label: 'Delivered', statuses: ['DELIVERED'] },
];

export default function MerchantOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const addToast = useApp((s) => s.addToast);

  async function load() {
    const d = await api<{ items: Order[] }>('/merchant/orders');
    setOrders(d.items);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function transition(id: string, status: string) {
    try {
      await api(`/merchant/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      addToast('Order updated', 'success');
      load();
    } catch (err: any) {
      addToast(err?.message ?? 'Failed', 'error');
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="rounded-2xl bg-white p-3 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">{col.label}</div>
              <span className="badge">{orders.filter((o) => col.statuses.includes(o.status)).length}</span>
            </div>
            <div className="space-y-2">
              {orders.filter((o) => col.statuses.includes(o.status)).map((o) => (
                <div key={o.id} className="rounded-xl border border-gray-100 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{o.orderNumber}</div>
                    <div className="font-medium">${Number(o.total).toFixed(2)}</div>
                  </div>
                  <div className="text-xs text-gray-500">{o.customer.name} · {o.address.line1}</div>
                  <div className="mt-1 text-xs text-gray-700">
                    {o.items.map((i) => `${i.quantity}× ${i.nameSnapshot}`).join(', ')}
                  </div>
                  <div className="mt-2 flex gap-1">
                    {o.status === 'PLACED' && (
                      <>
                        <button onClick={() => transition(o.id, 'ACCEPTED')} className="btn btn-primary px-2 py-1 text-xs">Accept</button>
                        <button onClick={() => transition(o.id, 'REJECTED')} className="btn btn-outline px-2 py-1 text-xs">Reject</button>
                      </>
                    )}
                    {o.status === 'ACCEPTED' && (
                      <button onClick={() => transition(o.id, 'PREPARING')} className="btn btn-primary px-2 py-1 text-xs">Start prep</button>
                    )}
                    {o.status === 'PREPARING' && (
                      <button onClick={() => transition(o.id, 'READY_FOR_PICKUP')} className="btn btn-primary px-2 py-1 text-xs">Mark ready</button>
                    )}
                  </div>
                </div>
              ))}
              {orders.filter((o) => col.statuses.includes(o.status)).length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
                  No orders
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
