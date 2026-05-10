'use client';

import Link from 'next/link';
import { useApp } from '@/lib/store';
import { ShoppingCart, User2, LogOut, Sparkles } from 'lucide-react';

export function Header() {
  const user = useApp((s) => s.user);
  const cart = useApp((s) => s.cart);
  const logout = useApp((s) => s.logout);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-white">F</span>
          FoodPilot
        </Link>
        <nav className="hidden gap-6 md:flex">
          <Link href="/restaurants" className="text-sm text-gray-700 hover:text-gray-900">Restaurants</Link>
          <Link href="/assistant" className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900">
            <Sparkles className="h-4 w-4 text-brand-500" /> AI Meal Pilot
          </Link>
          <Link href="/orders" className="text-sm text-gray-700 hover:text-gray-900">My orders</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/cart" className="relative inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-200">
            <ShoppingCart className="h-4 w-4" />
            <span>{cart.itemCount || 0}</span>
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Link href={
                user.role === 'MERCHANT' ? '/merchant'
                  : user.role === 'COURIER' ? '/courier'
                    : user.role === 'ADMIN' ? '/admin'
                      : '/account'
              } className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-200">
                <User2 className="h-4 w-4" />
                <span className="hidden md:inline">{user.name.split(' ')[0]}</span>
              </Link>
              <button onClick={logout} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Login</Link>
              <Link href="/register" className="btn btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
