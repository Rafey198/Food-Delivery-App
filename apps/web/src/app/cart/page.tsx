'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { useApp } from '@/lib/store';
import { Trash2 } from 'lucide-react';

export default function CartPage() {
  const cart = useApp((s) => s.cart);
  const update = useApp((s) => s.updateCartItem);
  const remove = useApp((s) => s.removeCartItem);
  const clear = useApp((s) => s.clearCart);
  const loadCart = useApp((s) => s.loadCart);
  const user = useApp((s) => s.user);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-xl font-semibold">Login to view your cart</h1>
          <Link href="/login" className="btn btn-primary mt-4 inline-flex">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your cart</h1>
          {cart.items.length > 0 && (
            <button onClick={() => clear()} className="text-sm text-rose-600 hover:underline">
              Clear cart
            </button>
          )}
        </div>

        {cart.items.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-12 text-center shadow-soft">
            <div className="text-5xl">🛒</div>
            <div className="mt-3 font-semibold">Your cart is empty</div>
            <Link href="/restaurants" className="btn btn-primary mt-4 inline-flex">Browse restaurants</Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {cart.items.map((it) => (
              <div key={it.id} className="card flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.imageUrl ?? `https://loremflickr.com/100/100/${encodeURIComponent(it.name)},food`}
                  alt={it.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-gray-500">${it.unitPrice.toFixed(2)} each</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => update(it.id, Math.max(0, it.quantity - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200">−</button>
                  <span className="w-6 text-center text-sm font-medium">{it.quantity}</span>
                  <button onClick={() => update(it.id, it.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200">+</button>
                </div>
                <div className="w-20 text-right font-semibold">${it.lineTotal.toFixed(2)}</div>
                <button onClick={() => remove(it.id)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="card mt-4 flex items-center justify-between">
              <div className="text-sm">
                <div className="text-gray-500">Subtotal</div>
                <div className="text-2xl font-bold">${cart.subtotal.toFixed(2)}</div>
              </div>
              <Link href="/checkout" className="btn btn-primary">
                Continue to checkout
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
