'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Ticket {
  id: string;
  category: string;
  status: string;
  priority: string;
  subject: string;
  message: string;
  aiSuggestedReply?: string;
  createdAt: string;
  user: { name: string; email: string };
  order?: { orderNumber: string } | null;
}

export default function AdminSupport() {
  const [items, setItems] = useState<Ticket[]>([]);
  async function load() {
    const d = await api<{ items: Ticket[] }>('/admin/support-tickets');
    setItems(d.items);
  }
  useEffect(() => {
    load();
  }, []);
  async function update(id: string, data: any) {
    await api(`/admin/support-tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    load();
  }
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Support tickets</h1>
      <div className="mt-4 grid gap-3">
        {items.length === 0 && <div className="card text-sm text-gray-500">No tickets right now.</div>}
        {items.map((t) => (
          <div key={t.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{t.subject}</div>
                <div className="text-xs text-gray-500">{t.user.name} ({t.user.email}) · {new Date(t.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <span className="badge">{t.priority}</span>
                <span className="badge">{t.status}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-700">{t.message}</p>
            {t.aiSuggestedReply && (
              <div className="mt-2 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700">
                <div className="font-semibold">AI suggested reply</div>
                <p className="mt-1">{t.aiSuggestedReply}</p>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {t.status !== 'IN_PROGRESS' && <button onClick={() => update(t.id, { status: 'IN_PROGRESS' })} className="btn btn-outline text-xs">Take</button>}
              {t.status !== 'RESOLVED' && <button onClick={() => update(t.id, { status: 'RESOLVED' })} className="btn btn-primary text-xs">Resolve</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
