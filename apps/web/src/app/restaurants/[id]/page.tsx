'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useApp } from '@/lib/store';
import { Star, Clock, Leaf, ShieldCheck, Plus } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  categoryId?: string | null;
  dietaryTags: string[];
  allergens: string[];
  spiceLevel: number;
  calories?: number | null;
}

interface Category {
  id: string;
  name: string;
}

interface Restaurant {
  id: string;
  name: string;
  bannerUrl?: string;
  description?: string;
  cuisineTypes: string[];
  rating: number;
  reviewCount: number;
  averagePrepTime: number;
  isHalalCertified: boolean;
  isCloudKitchen: boolean;
  isVegetarian: boolean;
  sustainabilityScore: number;
  city: string;
  address: string;
  categories: Category[];
  menu: MenuItem[];
  reviews: Array<{ id: string; comment: string; foodRating?: number; deliveryRating?: number; customer?: { name: string } }>;
}

export default function RestaurantPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<Restaurant | null>(null);
  const addToCart = useApp((s) => s.addToCart);
  const user = useApp((s) => s.user);
  const addToast = useApp((s) => s.addToast);

  useEffect(() => {
    api<Restaurant>(`/restaurants/${id}`).then(setData);
  }, [id]);

  if (!data) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="skeleton h-56 w-full" />
          <div className="mt-4 skeleton h-8 w-48" />
        </div>
      </div>
    );
  }

  async function handleAdd(itemId: string) {
    if (!user) {
      addToast('Please log in to add items', 'info');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      addToast('Switch to a customer account to order', 'info');
      return;
    }
    await addToCart(itemId, 1);
  }

  const grouped = data.categories.map((cat) => ({
    cat,
    items: data.menu.filter((m) => m.categoryId === cat.id),
  }));
  const uncategorized = data.menu.filter((m) => !m.categoryId);

  return (
    <div className="min-h-screen pb-32">
      <Header />
      <div className="relative h-56 w-full overflow-hidden md:h-72">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.bannerUrl ?? `https://loremflickr.com/1600/800/${encodeURIComponent(data.cuisineTypes[0] ?? 'food')},food`}
          alt={data.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 mx-auto max-w-5xl text-white">
          <div className="flex items-center gap-2">
            {data.isCloudKitchen && <span className="badge bg-white/20 text-white">Cloud kitchen</span>}
            {data.isHalalCertified && <span className="badge bg-emerald-600 text-white">Halal</span>}
            {data.sustainabilityScore >= 70 && (
              <span className="badge bg-emerald-700 text-white">
                <Leaf className="mr-1 h-3 w-3" /> Eco-friendly
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-bold">{data.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/80">{data.description}</p>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {data.rating.toFixed(1)} ({data.reviewCount})</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {data.averagePrepTime} min</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Verified</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          <aside className="hidden md:block">
            <div className="sticky top-20 space-y-1">
              {data.categories.map((c) => (
                <a key={c.id} href={`#cat-${c.id}`} className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  {c.name}
                </a>
              ))}
            </div>
          </aside>

          <div>
            {grouped.map(({ cat, items }) => (
              <section key={cat.id} id={`cat-${cat.id}`} className="mb-8">
                <h2 className="mb-3 text-lg font-semibold">{cat.name}</h2>
                <div className="grid gap-3">
                  {items.map((m) => (
                    <div key={m.id} className="card flex items-center gap-3 p-3">
                      <div className="flex-1">
                        <div className="font-semibold">{m.name}</div>
                        {m.description && <div className="mt-0.5 text-sm text-gray-500 line-clamp-2">{m.description}</div>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-gray-900">${m.price.toFixed(2)}</span>
                          {m.dietaryTags.slice(0, 3).map((t) => (
                            <span key={t} className="badge bg-emerald-50 text-emerald-700">{t}</span>
                          ))}
                          {m.spiceLevel > 0 && <span className="badge bg-rose-50 text-rose-700">Spicy {m.spiceLevel}</span>}
                          {m.calories && <span className="badge">{m.calories} kcal</span>}
                        </div>
                      </div>
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.imageUrl ?? `https://loremflickr.com/200/200/${encodeURIComponent(m.name)},food`}
                          alt={m.name}
                          className="h-24 w-24 rounded-xl object-cover"
                        />
                        <button
                          onClick={() => handleAdd(m.id)}
                          className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-white shadow-soft transition hover:scale-105"
                          aria-label="Add"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {uncategorized.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-lg font-semibold">More</h2>
                <div className="grid gap-3">
                  {uncategorized.map((m) => (
                    <div key={m.id} className="card flex items-center gap-3 p-3">
                      <div className="flex-1">
                        <div className="font-semibold">{m.name}</div>
                        <div className="mt-1 font-medium">${m.price.toFixed(2)}</div>
                      </div>
                      <button onClick={() => handleAdd(m.id)} className="btn btn-primary">Add</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.reviews.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">Reviews</h2>
                <div className="grid gap-3">
                  {data.reviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="card">
                      <div className="text-sm font-medium">{r.customer?.name ?? 'Customer'}</div>
                      <div className="mt-1 flex items-center gap-1 text-yellow-500">
                        {Array.from({ length: r.foodRating ?? 5 }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <CartFloater />
    </div>
  );
}

function CartFloater() {
  const cart = useApp((s) => s.cart);
  if (!cart.itemCount) return null;
  return (
    <Link
      href="/cart"
      className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-soft hover:bg-brand-600"
    >
      <span>{cart.itemCount} item(s)</span>
      <span className="opacity-60">·</span>
      <span>${cart.subtotal.toFixed(2)}</span>
      <span className="rounded-full bg-white/20 px-3 py-1">View cart →</span>
    </Link>
  );
}
