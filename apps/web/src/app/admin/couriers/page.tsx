'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Courier {
  id: string;
  status: string;
  vehicleType: string;
  isApproved: boolean;
  rating: number;
  totalDeliveries: number;
  user: { name: string; email: string; phone?: string };
}

export default function AdminCouriers() {
  const [items, setItems] = useState<Courier[]>([]);
  async function load() {
    const d = await api<{ items: Courier[] }>('/admin/couriers');
    setItems(d.items);
  }
  useEffect(() => {
    load();
  }, []);
  async function approve(id: string, isApproved: boolean) {
    await api(`/admin/couriers/${id}`, { method: 'PATCH', body: JSON.stringify({ isApproved }) });
    load();
  }
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Couriers</h1>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr><th>Name</th><th>Email</th><th>Vehicle</th><th>Status</th><th>Rating</th><th>Approved</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="py-2 font-medium">{c.user.name}</td>
                <td>{c.user.email}</td>
                <td>{c.vehicleType}</td>
                <td><span className="badge">{c.status}</span></td>
                <td>{c.rating.toFixed(1)} ★ ({c.totalDeliveries})</td>
                <td><span className={`badge ${c.isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.isApproved ? 'Yes' : 'No'}</span></td>
                <td>
                  <button onClick={() => approve(c.id, !c.isApproved)} className="text-xs text-brand-600 hover:underline">
                    {c.isApproved ? 'Revoke' : 'Approve'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
