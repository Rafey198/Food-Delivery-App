'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { Send, Sparkles, Plus } from 'lucide-react';

interface AssistantOption {
  id: string;
  name: string;
  restaurantName: string;
  restaurantId: string;
  price: number;
  estimatedDeliveryMinutes: number;
  rating: number;
  reasons: string[];
}

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  options?: AssistantOption[];
}

const SUGGESTIONS = [
  'Find me something spicy under $15',
  'I want a healthy lunch under $20',
  'Suggest halal Pakistani food',
  'Reorder my favourite burger',
  'High protein meal under 600 calories',
];

export default function AssistantPage() {
  const [history, setHistory] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm FoodPilot, your AI meal pilot. Tell me your budget, dietary needs, or just what you feel like eating, and I'll suggest from real menus near you.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const addToCart = useApp((s) => s.addToCart);
  const user = useApp((s) => s.user);
  const addToast = useApp((s) => s.addToast);

  async function send(message: string) {
    if (!message.trim()) return;
    setHistory((h) => [...h, { role: 'user', content: message }]);
    setInput('');
    setLoading(true);
    try {
      const res = await api<{ reply: string; options: AssistantOption[] }>(
        '/ai/meal-assistant',
        {
          method: 'POST',
          body: JSON.stringify({
            message,
            conversation: history.slice(-10).map((h) => ({ role: h.role, content: h.content })),
          }),
        },
      );
      setHistory((h) => [...h, { role: 'assistant', content: res.reply, options: res.options }]);
    } catch (err: any) {
      setHistory((h) => [...h, { role: 'assistant', content: err?.message ?? 'Something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(opt: AssistantOption) {
    if (!user || user.role !== 'CUSTOMER') {
      addToast('Login as a customer to order', 'info');
      return;
    }
    try {
      await addToCart(opt.id, 1);
      addToast(`Added ${opt.name} to cart`, 'success');
    } catch (err: any) {
      addToast(err?.message ?? 'Could not add', 'error');
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-500" />
          <h1 className="text-xl font-semibold">AI Meal Pilot</h1>
        </div>
        <div className="chat-scroll flex-1 space-y-3 overflow-y-auto pb-32">
          {history.map((t, idx) => (
            <div key={idx} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${t.role === 'user' ? 'bg-brand-500 text-white' : 'bg-white shadow-soft'}`}>
                <div>{t.content}</div>
                {t.options && t.options.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {t.options.map((o) => (
                      <div key={o.id} className="rounded-xl border border-gray-100 bg-white p-3 text-gray-900">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold">{o.name}</div>
                            <div className="text-xs text-gray-500">{o.restaurantName} · ~{o.estimatedDeliveryMinutes} min</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${o.price.toFixed(2)}</div>
                            <button
                              onClick={() => handleAdd(o)}
                              className="btn btn-primary mt-1 px-3 py-1 text-xs"
                            >
                              <Plus className="mr-1 h-3 w-3" /> Add
                            </button>
                          </div>
                        </div>
                        {o.reasons.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {o.reasons.slice(0, 3).map((r) => (
                              <span key={r} className="badge bg-emerald-50 text-emerald-700">{r}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-soft">
                <span className="inline-block animate-pulse">FoodPilot is thinking…</span>
              </div>
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="badge cursor-pointer bg-gray-100 hover:bg-gray-200">
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 shadow-soft"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask FoodPilot anything…"
                className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
              />
              <button type="submit" disabled={loading} className="btn btn-primary">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
