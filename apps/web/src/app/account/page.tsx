'use client';

import { Header } from '@/components/Header';
import { useApp } from '@/lib/store';
import Link from 'next/link';

export default function AccountPage() {
  const user = useApp((s) => s.user);
  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <Link href="/login" className="btn btn-primary">Login</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-semibold">My account</h1>
        <div className="card mt-4">
          <div className="text-sm text-gray-500">Signed in as</div>
          <div className="mt-1 text-lg font-medium">{user.name}</div>
          <div className="text-sm text-gray-600">{user.email}</div>
          <div className="mt-2"><span className="badge">{user.role}</span></div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Link href="/orders" className="card hover:shadow-md">
            <div className="font-semibold">Orders</div>
            <p className="text-sm text-gray-500">View and track your orders.</p>
          </Link>
          <Link href="/assistant" className="card hover:shadow-md">
            <div className="font-semibold">AI Meal Pilot</div>
            <p className="text-sm text-gray-500">Plan your next meal in seconds.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
