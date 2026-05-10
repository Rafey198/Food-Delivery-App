'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Payout {
  id: string;
  periodStart: string;
  periodEnd: string;
  gross: string;
  net: string;
  status: string;
}

interface Lifetime {
  gross: number;
  commission: number;
}

export default function PayoutsPage() {
  const [data, setData] = useState<{ payouts: Payout[]; lifetime: Lifetime } | null>(null);
  useEffect(() => {
    api<typeof data>('/merchant/payouts').then((d) => setData(d as any));
  }, []);
  if (!data) return <div className="p-6">Loading…</div>;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Payouts</h1>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="text-xs uppercase text-gray-500">Lifetime gross</div>
          <div className="mt-2 text-2xl font-semibold">${data.lifetime.gross.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-gray-500">Platform commission</div>
          <div className="mt-2 text-2xl font-semibold">${data.lifetime.commission.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-gray-500">Net to date</div>
          <div className="mt-2 text-2xl font-semibold">
            ${(data.lifetime.gross - data.lifetime.commission).toFixed(2)}
          </div>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="p-3">Period</th>
              <th className="p-3">Gross</th>
              <th className="p-3">Net</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.payouts.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-500">No payouts yet</td></tr>
            )}
            {data.payouts.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()}</td>
                <td className="p-3">${Number(p.gross).toFixed(2)}</td>
                <td className="p-3">${Number(p.net).toFixed(2)}</td>
                <td className="p-3">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
