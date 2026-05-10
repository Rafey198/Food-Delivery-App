'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

interface Zone {
  id: string;
  name: string;
  city: string;
  centroidLat: number;
  centroidLon: number;
}
interface Forecast {
  zoneId: string;
  forecastHour: string;
  predictedOrders: number;
  confidence: number;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<{ zones: Zone[]; forecast: Forecast[] } | null>(null);
  useEffect(() => {
    api<typeof data>('/admin/analytics/demand').then((d) => setData(d as any));
  }, []);

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { zone: Zone; total: number; peak: number }>();
    for (const z of data.zones) map.set(z.id, { zone: z, total: 0, peak: 0 });
    for (const f of data.forecast) {
      const e = map.get(f.zoneId);
      if (!e) continue;
      e.total += f.predictedOrders;
      e.peak = Math.max(e.peak, f.predictedOrders);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [data]);

  if (!data) return <div className="p-6">Loading…</div>;
  const max = Math.max(1, ...grouped.map((g) => g.total));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Demand analytics</h1>
      <p className="mt-1 text-sm text-gray-600">Predicted next 24 hour demand per delivery zone.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {grouped.map(({ zone, total, peak }) => (
          <div key={zone.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{zone.name}</div>
                <div className="text-xs text-gray-500">{zone.city}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-xs text-gray-500">predicted orders</div>
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-brand-500" style={{ width: `${(total / max) * 100}%` }} />
            </div>
            <div className="mt-2 text-xs text-gray-500">Peak hour: {peak} orders</div>
          </div>
        ))}
      </div>
    </div>
  );
}
