'use client';

import { useApp } from '@/lib/store';
import { cn } from '@/lib/cn';

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const remove = useApp((s) => s.removeToast);
  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => remove(t.id)}
          className={cn(
            'pointer-events-auto rounded-xl px-4 py-3 text-left text-sm shadow-soft',
            t.type === 'success' && 'bg-emerald-600 text-white',
            t.type === 'error' && 'bg-rose-600 text-white',
            t.type === 'info' && 'bg-gray-900 text-white',
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
