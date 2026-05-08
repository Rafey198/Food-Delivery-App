'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { Plus } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  description?: string;
  price: string;
  isAvailable: boolean;
  category?: { id: string; name: string } | null;
  dietaryTags: string[];
}

interface Category {
  id: string;
  name: string;
}

export default function MerchantMenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const addToast = useApp((s) => s.addToast);
  const [form, setForm] = useState({ name: '', description: '', price: 5, categoryId: '', isAvailable: true, prepTime: 15 });
  const [aiTags, setAiTags] = useState<any>(null);

  async function load() {
    const [m, c] = await Promise.all([
      api<{ items: Item[] }>('/merchant/menu-items'),
      api<{ items: Category[] }>('/merchant/categories'),
    ]);
    setItems(m.items);
    setCats(c.items);
  }
  useEffect(() => {
    load();
  }, []);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api<{ item: Item; aiSuggestions: any }>('/merchant/menu-items', {
        method: 'POST',
        body: JSON.stringify({ ...form, categoryId: form.categoryId || undefined }),
      });
      addToast('Item added', 'success');
      setAiTags(res.aiSuggestions);
      setForm({ name: '', description: '', price: 5, categoryId: '', isAvailable: true, prepTime: 15 });
      load();
    } catch (err: any) {
      addToast(err?.message ?? 'Failed', 'error');
    }
  }

  async function toggleAvailable(it: Item) {
    await api(`/merchant/menu-items/${it.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable: !it.isAvailable }),
    });
    load();
  }

  async function remove(id: string) {
    await api(`/merchant/menu-items/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="grid gap-6 p-6 md:grid-cols-[1fr_360px]">
      <div>
        <h1 className="text-2xl font-semibold">Menu</h1>
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Tags</th>
                <th className="p-3">Available</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-gray-100">
                  <td className="p-3 font-medium">{it.name}</td>
                  <td className="p-3 text-gray-600">{it.category?.name ?? '—'}</td>
                  <td className="p-3">${Number(it.price).toFixed(2)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {it.dietaryTags.slice(0, 3).map((t) => <span key={t} className="badge bg-emerald-50 text-emerald-700">{t}</span>)}
                    </div>
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleAvailable(it)} className={`badge cursor-pointer ${it.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {it.isAvailable ? 'Available' : 'Hidden'}
                    </button>
                  </td>
                  <td className="p-3">
                    <button onClick={() => remove(it.id)} className="text-xs text-rose-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-gray-500">No items yet — add one on the right.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside>
        <form onSubmit={createItem} className="card sticky top-6 space-y-2">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-brand-500" />
            <h2 className="font-semibold">Add menu item</h2>
          </div>
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <textarea className="input" rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" type="number" min={0} step="0.5" placeholder="Price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} required />
            <input className="input" type="number" min={1} placeholder="Prep time (min)" value={form.prepTime} onChange={(e) => setForm((f) => ({ ...f, prepTime: Number(e.target.value) }))} />
          </div>
          <select className="input" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
            <option value="">No category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} />
            Available now
          </label>
          <button type="submit" className="btn btn-primary w-full">Add item</button>
          {aiTags && (
            <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700">
              <div className="font-semibold">AI auto-tagged:</div>
              <div>Cuisine: {aiTags.cuisine ?? 'unknown'} · Spice {aiTags.spiceLevel}</div>
              <div>Dietary: {aiTags.dietary?.join(', ') || 'none'}</div>
              <div>Allergens: {aiTags.allergens?.join(', ') || 'none'}</div>
              <div className="mt-1">Confirm sensitive tags before publishing.</div>
            </div>
          )}
        </form>
      </aside>
    </div>
  );
}
