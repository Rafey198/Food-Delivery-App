'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { Star, Clock, MapPin, Leaf, Search } from 'lucide-react';

export default function RestaurantsPageWrapper() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-gray-500">Loading…</div>}>
      <RestaurantsPage />
    </Suspense>
  );
}

interface Restaurant {
  id: string;
  name: string;
  cuisineTypes: string[];
  logoUrl?: string | null;
  bannerUrl?: string | null;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  etaMinutes: number;
  isOpen: boolean;
  isCloudKitchen: boolean;
  isHalalCertified: boolean;
  sustainabilityScore: number;
  averagePrepTime: number;
  city: string;
}

const FILTERS = ['Pakistani', 'Pizza', 'Burgers', 'Healthy Bowls', 'Middle Eastern', 'Indian', 'Chinese', 'Coffee', 'Desserts'];

function RestaurantsPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(search.get('q') ?? '');
  const cuisine = search.get('cuisine') ?? '';

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set('lat', '24.8607');
    p.set('lon', '67.0011');
    p.set('radiusKm', '15');
    if (cuisine) p.set('cuisine', cuisine);
    if (query) p.set('query', query);
    return p.toString();
  }, [cuisine, query]);

  useEffect(() => {
    setLoading(true);
    api<{ items: Restaurant[] }>(`/restaurants/nearby?${params}`)
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, [params]);

  function setCuisine(c: string) {
    const next = new URLSearchParams(Array.from(search.entries()));
    if (c) next.set('cuisine', c);
    else next.delete('cuisine');
    router.push(`/restaurants?${next.toString()}`);
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Restaurants near you</h1>
            <p className="text-sm text-gray-500">Karachi · 15km radius</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const next = new URLSearchParams(Array.from(search.entries()));
              if (query) next.set('q', query);
              else next.delete('q');
              router.push(`/restaurants?${next.toString()}`);
            }}
            className="flex w-full max-w-md items-center gap-2 rounded-full border border-gray-200 bg-white p-1 shadow-soft"
          >
            <Search className="ml-3 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants or dishes"
              className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none"
            />
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setCuisine('')}
            className={`badge cursor-pointer ${!cuisine ? 'bg-brand-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            All
          </button>
          {FILTERS.map((c) => (
            <button
              key={c}
              onClick={() => setCuisine(c)}
              className={`badge cursor-pointer ${cuisine === c ? 'bg-brand-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-64" />)
            : items.map((r) => (
                <Link key={r.id} href={`/restaurants/${r.id}`} className="group overflow-hidden rounded-2xl bg-white shadow-soft transition hover:shadow-md">
                  <div className="relative h-40 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.bannerUrl ?? `https://loremflickr.com/600/400/${encodeURIComponent(r.cuisineTypes[0] ?? 'food')},food`}
                      alt={r.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    {r.isCloudKitchen && (
                      <span className="absolute left-3 top-3 badge bg-black/70 text-white">Cloud kitchen</span>
                    )}
                    {r.sustainabilityScore >= 70 && (
                      <span className="absolute right-3 top-3 badge bg-emerald-600 text-white">
                        <Leaf className="mr-1 h-3 w-3" /> Eco
                      </span>
                    )}
                    {!r.isOpen && (
                      <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-medium text-white">
                        Closed
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.cuisineTypes.slice(0, 2).join(' • ')}</div>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                        {r.rating.toFixed(1)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.etaMinutes} min</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.distanceKm.toFixed(1)} km</span>
                      {r.isHalalCertified && <span className="badge bg-emerald-50 text-emerald-700">Halal</span>}
                    </div>
                  </div>
                </Link>
              ))}
        </div>

        {!loading && items.length === 0 && (
          <div className="mt-12 rounded-2xl bg-white p-8 text-center shadow-soft">
            <div className="text-5xl">🍽️</div>
            <div className="mt-3 font-semibold">No restaurants match your filters</div>
            <div className="text-sm text-gray-500">Try removing filters or searching for something else.</div>
          </div>
        )}
      </main>
    </div>
  );
}
