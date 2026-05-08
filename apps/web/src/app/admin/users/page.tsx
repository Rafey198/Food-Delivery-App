'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function AdminUsers() {
  const [items, setItems] = useState<User[]>([]);
  const [role, setRole] = useState('');
  async function load() {
    const d = await api<{ items: User[] }>(`/admin/users${role ? `?role=${role}` : ''}`);
    setItems(d.items);
  }
  useEffect(() => {
    load();
  }, [role]);

  async function toggle(u: User) {
    await api(`/admin/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }),
    });
    load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <select className="input max-w-[200px]" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="MERCHANT">Merchants</option>
          <option value="COURIER">Couriers</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="py-2 font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td><span className="badge">{u.role}</span></td>
                <td>
                  <span className={`badge ${u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{u.status}</span>
                </td>
                <td className="text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td><button onClick={() => toggle(u)} className="text-xs text-brand-600 hover:underline">{u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
