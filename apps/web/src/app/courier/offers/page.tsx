'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { MapPin, Bike, Clock } from 'lucide-react';

interface Offer {
  id: string;
  basePay: string;
  distancePay: string;
  reason?: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    restaurant: { name: string; addressLine: string };
    address: { line1: string; city: string };
  };
}

export default function CourierOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const addToast = useApp((s) => s.addToast);

  async function load() {
    const d = await api<{ items: Offer[] }>('/courier/offers');
    setOffers(d.items);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  async function accept(id: string) {
    await api(`/courier/offers/${id}/accept`, { method: 'POST' });
    addToast('Offer accepted', 'success');
    load();
  }
  async function reject(id: string) {
    await api(`/courier/offers/${id}/reject`, { method: 'POST' });
    addToast('Rejected', 'info');
    load();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Available offers</h1>
      <div className="mt-4 space-y-3">
        {offers.length === 0 && (
          <div className="card text-center text-sm text-gray-500">
            No offers right now. Stay online and we'll send the closest jobs.
          </div>
        )}
        {offers.map((o) => {
          const total = +(Number(o.basePay) + Number(o.distancePay)).toFixed(2);
          return (
            <div key={o.id} className="card">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{o.order.orderNumber}</div>
                <div className="text-xl font-bold">${total.toFixed(2)}</div>
              </div>
              <div className="mt-2 grid gap-2 text-sm text-gray-700">
                <div className="flex items-center gap-2"><Bike className="h-4 w-4 text-brand-500" /> Pickup: {o.order.restaurant.name}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> Drop: {o.order.address.line1}, {o.order.address.city}</div>
              </div>
              {o.reason && (
                <div className="mt-2 rounded-xl bg-gray-50 p-2 text-xs text-gray-600">
                  <span className="font-medium">Why offered to you:</span> {o.reason}
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => reject(o.id)} className="btn btn-outline">Reject</button>
                <button onClick={() => accept(o.id)} className="btn btn-primary">Accept</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
