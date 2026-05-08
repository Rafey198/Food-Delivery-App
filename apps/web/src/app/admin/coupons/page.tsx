'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: string;
  minOrderAmount: string;
  maxDiscount?: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  usedCount: number;
}

export default function AdminCoupons() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [form, setForm] = useState({ code: '', type: 'PERCENT', value: 10, minOrderAmount: 0, startsAt: '', endsAt: '' });
  async function load() {
    const d = await api<{ items: Coupon[] }>('/admin/coupons');
    setItems(d.items);
  }
  useEffect(() => {
    load();
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api('/admin/coupons', { method: 'POST', body: JSON.stringify(form) });
    load();
  }
  async function toggle(c: Coupon) {
    await api(`/admin/coupons/${c.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !c.isActive }) });
    load();
  }
  return (
    <div className="grid gap-6 p-6 md:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500">
              <tr><th>Code</th><th>Type</th><th>Value</th><th>Active</th><th>Used</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-2 font-medium">{c.code}</td>
                  <td>{c.type}</td>
                  <td>{Number(c.value).toFixed(0)}{c.type === 'PERCENT' ? '%' : ''}</td>
                  <td><span className={`badge ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}`}>{c.isActive ? 'Active' : 'Off'}</span></td>
                  <td>{c.usedCount}</td>
                  <td><button onClick={() => toggle(c)} className="text-xs text-brand-600 hover:underline">Toggle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={create} className="card sticky top-6 h-fit space-y-2">
        <h2 className="font-semibold">Create coupon</h2>
        <input className="input" placeholder="Code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
        <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
          <option value="PERCENT">Percent</option>
          <option value="FIXED">Fixed</option>
          <option value="FREE_DELIVERY">Free delivery</option>
        </select>
        <input className="input" type="number" placeholder="Value" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} />
        <input className="input" type="number" placeholder="Min order" value={form.minOrderAmount} onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: Number(e.target.value) }))} />
        <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} required />
        <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} required />
        <button className="btn btn-primary w-full" type="submit">Create</button>
      </form>
    </div>
  );
}
