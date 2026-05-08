'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Restaurant {
  id: string;
  name: string;
  city: string;
  status: string;
  rating: number;
  isCloudKitchen: boolean;
  owner: { name: string; email: string };
}

export default function AdminRestaurants() {
  const [items, setItems] = useState<Restaurant[]>([]);
  const [status, setStatus] = useState('');
  async function load() {
    const d = await api<{ items: Restaurant[] }>(`/admin/restaurants${status ? `?status=${status}` : ''}`);
    setItems(d.items);
  }
  useEffect(() => {
    load();
  }, [status]);

  async function update(id: string, status: string) {
    await api(`/admin/restaurants/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Restaurants</h1>
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          {['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr><th>Name</th><th>City</th><th>Owner</th><th>Status</th><th>Rating</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2 font-medium">{r.name} {r.isCloudKitchen && <span className="badge ml-1 bg-gray-100">cloud</span>}</td>
                <td>{r.city}</td>
                <td>{r.owner?.name}</td>
                <td><span className="badge">{r.status}</span></td>
                <td>{r.rating.toFixed(1)} ★</td>
                <td>
                  {r.status !== 'APPROVED' && <button onClick={() => update(r.id, 'APPROVED')} className="mr-2 text-xs text-emerald-600 hover:underline">Approve</button>}
                  {r.status !== 'SUSPENDED' && <button onClick={() => update(r.id, 'SUSPENDED')} className="text-xs text-rose-600 hover:underline">Suspend</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
