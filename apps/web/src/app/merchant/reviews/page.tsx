'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Review {
  id: string;
  comment?: string;
  foodRating?: number;
  deliveryRating?: number;
  reply?: string;
  customer: { name: string };
}

interface Summary {
  highlights: string[];
  complaints: string[];
  sentiment: string;
  suggestedActions: string[];
  summary: string;
}

export default function MerchantReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function load() {
    const d = await api<{ reviews: Review[]; summary: Summary }>('/merchant/reviews');
    setReviews(d.reviews);
    setSummary(d.summary);
  }
  useEffect(() => {
    load();
  }, []);

  async function autoReply(id: string) {
    await api(`/merchant/reviews/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ draft: true }),
    });
    load();
  }

  return (
    <div className="grid gap-6 p-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Reviews</h1>
        {reviews.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.customer.name}</div>
              <div className="text-yellow-500">{'★'.repeat(r.foodRating ?? 5)}</div>
            </div>
            {r.comment && <p className="mt-2 text-sm text-gray-700">{r.comment}</p>}
            {r.reply ? (
              <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm">
                <div className="text-xs uppercase tracking-wider text-gray-500">Your reply</div>
                <p className="mt-1">{r.reply}</p>
              </div>
            ) : (
              <button onClick={() => autoReply(r.id)} className="btn btn-outline mt-3 text-xs">
                Draft AI reply
              </button>
            )}
          </div>
        ))}
        {reviews.length === 0 && <div className="text-sm text-gray-500">No reviews yet.</div>}
      </div>
      {summary && (
        <aside className="card sticky top-6 h-fit">
          <h2 className="font-semibold">AI insights</h2>
          <p className="mt-2 text-sm text-gray-700">{summary.summary}</p>
          <div className="mt-3 text-xs uppercase tracking-wider text-gray-500">Sentiment</div>
          <div className={`badge mt-1 ${summary.sentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' : summary.sentiment === 'NEGATIVE' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100'}`}>
            {summary.sentiment}
          </div>
          <div className="mt-3 text-xs uppercase tracking-wider text-gray-500">Highlights</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {summary.highlights.map((h) => <span key={h} className="badge bg-emerald-50 text-emerald-700">{h}</span>)}
          </div>
          <div className="mt-3 text-xs uppercase tracking-wider text-gray-500">Complaints</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {summary.complaints.map((h) => <span key={h} className="badge bg-rose-50 text-rose-700">{h}</span>)}
          </div>
          <div className="mt-3 text-xs uppercase tracking-wider text-gray-500">Suggested actions</div>
          <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
            {summary.suggestedActions.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </aside>
      )}
    </div>
  );
}
