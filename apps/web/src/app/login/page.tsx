'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';

const DEMO = [
  { label: 'Customer', email: 'customer@example.com', password: 'Customer@123' },
  { label: 'Merchant', email: 'merchant@example.com', password: 'Merchant@123' },
  { label: 'Courier', email: 'courier@example.com', password: 'Courier@123' },
  { label: 'Admin', email: 'admin@example.com', password: 'Admin@12345' },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useApp((s) => s.login);
  const addToast = useApp((s) => s.addToast);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      addToast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
      router.push(
        user.role === 'MERCHANT' ? '/merchant'
          : user.role === 'COURIER' ? '/courier'
            : user.role === 'ADMIN' ? '/admin'
              : '/restaurants',
      );
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(d: typeof DEMO[number]) {
    setEmail(d.email);
    setPassword(d.password);
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden bg-brand-gradient md:flex md:items-center md:justify-center md:p-10">
        <div className="max-w-sm text-white">
          <div className="badge mb-4 bg-white/20 text-white">FoodPilot</div>
          <h2 className="text-3xl font-semibold">Good food is one tap away.</h2>
          <p className="mt-3 text-white/80">Sign in to track orders, save favourites, and let our AI plan your meals.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="card w-full max-w-md">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">Login to your account</p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-gray-700">Email</span>
              <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Password</span>
              <input className="input mt-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          </div>
          {error && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <button className="btn btn-primary mt-4 w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <div className="mt-3 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand-600 hover:underline">Create one</Link>
          </div>
          <div className="mt-6 rounded-xl bg-gray-50 p-3">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Demo accounts</div>
            <div className="mt-2 grid gap-1.5">
              {DEMO.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => quickLogin(d)}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-gray-50"
                >
                  <span className="font-medium">{d.label}</span>
                  <span className="text-gray-500">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
