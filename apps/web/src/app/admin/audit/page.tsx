'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Log {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  createdAt: string;
}

export default function AuditPage() {
  const [items, setItems] = useState<Log[]>([]);
  useEffect(() => {
    api<{ items: Log[] }>('/admin/audit-logs').then((d) => setItems(d.items));
  }, []);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Audit logs</h1>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr><th>Action</th><th>Entity</th><th>Metadata</th><th>When</th></tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="py-2 font-medium">{l.action}</td>
                <td>{l.entityType} · <span className="text-gray-500">{l.entityId}</span></td>
                <td className="max-w-[400px] truncate text-xs text-gray-500">{JSON.stringify(l.metadata ?? {})}</td>
                <td className="text-gray-500">{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-500">No audit log entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
