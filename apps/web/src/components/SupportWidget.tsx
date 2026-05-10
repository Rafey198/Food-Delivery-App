'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { LifeBuoy, X, Send, Sparkles } from 'lucide-react';

interface Turn {
  role: 'user' | 'agent';
  content: string;
  meta?: { intent?: string; escalate?: boolean; actions?: Array<{ label: string; action: string }> };
}

const STORAGE_KEY = 'fd_support_history';

export function SupportWidget() {
  const user = useApp((s) => s.user);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {}
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [history]);

  if (!user || user.role !== 'CUSTOMER') return null;

  async function send(message: string) {
    if (!message.trim()) return;
    const next: Turn = { role: 'user', content: message };
    setHistory((h) => [...h, next]);
    setInput('');
    setBusy(true);
    try {
      const r = await api<any>('/ai/agents/support/run', {
        method: 'POST',
        body: JSON.stringify({ input: { message } }),
      });
      setHistory((h) => [
        ...h,
        {
          role: 'agent',
          content: r.output.reply,
          meta: {
            intent: r.output.intent,
            escalate: r.output.escalate,
            actions: r.output.suggestedActions,
          },
        },
      ]);
    } catch (e: any) {
      setHistory((h) => [...h, { role: 'agent', content: e?.message ?? 'Sorry, something went wrong.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand-gradient text-white shadow-glow hover:brightness-105"
        aria-label="Open support chat"
      >
        {open ? <X className="h-5 w-5" /> : <LifeBuoy className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 z-40 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center justify-between bg-brand-gradient px-4 py-3 text-white">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="h-4 w-4" /> Support Agent
              </div>
              <div className="text-[11px] opacity-90">AI-powered · always-on</div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={scrollRef} className="chat-scroll flex-1 space-y-2 overflow-y-auto bg-gray-50 px-3 py-3">
            {history.length === 0 && (
              <div className="rounded-xl bg-white p-3 text-sm shadow-soft">
                Hi! I’m the FoodPilot support agent. How can I help today?
                <div className="mt-2 flex flex-wrap gap-1">
                  {['My order is late', 'I want a refund', 'I need to cancel', 'How do I use a promo code?'].map((q) => (
                    <button key={q} onClick={() => send(q)} className="badge cursor-pointer bg-gray-100 text-[11px] hover:bg-gray-200">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {history.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${t.role === 'user' ? 'bg-brand-500 text-white' : 'bg-white shadow-soft'}`}>
                  <div>{t.content}</div>
                  {t.meta?.actions && t.meta.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.meta.actions.map((a) => (
                        <span key={a.action} className="badge bg-gray-100 text-[11px]">{a.label}</span>
                      ))}
                    </div>
                  )}
                  {t.meta?.intent && (
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">
                      intent · {t.meta.intent}{t.meta.escalate ? ' · escalated' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white px-3 py-2 text-sm shadow-soft">Thinking…</div>
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-gray-100 bg-white p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              className="flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button disabled={busy} type="submit" className="btn btn-primary">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
