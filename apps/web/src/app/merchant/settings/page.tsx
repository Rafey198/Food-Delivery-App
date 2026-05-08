'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';

interface Dashboard {
  restaurant: { id: string; name: string; isOpen: boolean };
}

export default function MerchantSettings() {
  const [name, setName] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const addToast = useApp((s) => s.addToast);

  useEffect(() => {
    api<Dashboard>('/merchant/dashboard').then((d) => {
      setName(d.restaurant.name);
      setIsOpen(d.restaurant.isOpen);
    });
  }, []);

  async function save() {
    await api('/merchant/restaurant', {
      method: 'PATCH',
      body: JSON.stringify({ name, isOpen }),
    });
    addToast('Saved', 'success');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="card mt-4 max-w-md space-y-3">
        <label className="block text-sm">
          <span className="text-gray-700">Restaurant name</span>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
          Currently open
        </label>
        <button onClick={save} className="btn btn-primary">Save</button>
      </div>
    </div>
  );
}
