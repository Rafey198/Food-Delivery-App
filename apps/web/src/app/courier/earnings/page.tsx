'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Assignment {
  id: string;
  deliveredAt: string;
  basePay: string;
  distancePay: string;
  waitingPay: string;
  bonusPay: string;
  tip: string;
}
interface Resp {
  totalEarnings: number;
  breakdown: Assignment[];
  transparencyNote: string;
}

export default function CourierEarnings() {
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    api<Resp>('/courier/earnings').then(setData);
  }, []);
  if (!data) return <div className="p-6">Loading…</div>;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Earnings (last 30 days)</h1>
      <div className="card mt-4">
        <div className="text-xs uppercase text-gray-500">Total</div>
        <div className="text-3xl font-bold">${data.totalEarnings.toFixed(2)}</div>
        <p className="mt-2 text-xs text-gray-500">{data.transparencyNote}</p>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Base</th>
              <th className="p-3">Distance</th>
              <th className="p-3">Tip</th>
              <th className="p-3">Bonus</th>
              <th className="p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.breakdown.map((a) => {
              const total = Number(a.basePay) + Number(a.distancePay) + Number(a.waitingPay) + Number(a.bonusPay) + Number(a.tip);
              return (
                <tr key={a.id} className="border-t">
                  <td className="p-3">{a.deliveredAt ? new Date(a.deliveredAt).toLocaleString() : '—'}</td>
                  <td className="p-3">${Number(a.basePay).toFixed(2)}</td>
                  <td className="p-3">${Number(a.distancePay).toFixed(2)}</td>
                  <td className="p-3">${Number(a.tip).toFixed(2)}</td>
                  <td className="p-3">${Number(a.bonusPay).toFixed(2)}</td>
                  <td className="p-3 font-semibold">${total.toFixed(2)}</td>
                </tr>
              );
            })}
            {data.breakdown.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">No completed deliveries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
