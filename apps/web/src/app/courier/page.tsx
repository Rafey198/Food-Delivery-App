'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';

interface Courier {
  id: string;
  status: string;
  rating: number;
  totalDeliveries: number;
  earningsToday: string;
  acceptanceRate: number;
}

export default function CourierHome() {
  const [c, setC] = useState<Courier | null>(null);
  const addToast = useApp((s) => s.addToast);

  async function load() {
    const d = await api<Courier>('/courier/me');
    setC(d);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function setStatus(status: 'ONLINE' | 'OFFLINE' | 'ON_BREAK') {
    await api('/courier/status', { method: 'POST', body: JSON.stringify({ status }) });
    addToast(`Status set to ${status}`, 'success');
    load();
  }

  async function ping() {
    if (!navigator.geolocation) {
      addToast('Geolocation not supported', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await api('/courier/location', {
        method: 'PATCH',
        body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      });
      addToast('Location updated', 'success');
    });
  }

  if (!c) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">You are</div>
            <div className="text-2xl font-bold">
              {c.status === 'ONLINE' ? 'Online ⚡' : c.status === 'ON_DELIVERY' ? 'On delivery 🚀' : 'Offline'}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setStatus('ONLINE')} className="btn btn-primary">Go online</button>
            <button onClick={() => setStatus('OFFLINE')} className="btn btn-outline">Go offline</button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Earnings today" value={`$${Number(c.earningsToday).toFixed(2)}`} />
        <Stat label="Total deliveries" value={c.totalDeliveries.toString()} />
        <Stat label="Acceptance" value={`${(c.acceptanceRate * 100).toFixed(0)}%`} />
      </div>

      <div className="card mt-4">
        <h2 className="text-base font-semibold">Safety reminder</h2>
        <p className="mt-2 text-sm text-gray-600">
          Never use your phone while riding. Pull over to read offers. Wear a helmet and follow traffic rules.
        </p>
        <button onClick={ping} className="btn btn-outline mt-3 w-full">Send live location</button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
