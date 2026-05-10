'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';

type Role = 'CUSTOMER' | 'MERCHANT' | 'COURIER';

export default function RegisterPage() {
  const router = useRouter();
  const register = useApp((s) => s.register);
  const addToast = useApp((s) => s.addToast);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await register(name, email, password, role);
      addToast(`Welcome, ${user.name.split(' ')[0]}!`, 'success');
      router.push(role === 'MERCHANT' ? '/merchant' : role === 'COURIER' ? '/courier' : '/restaurants');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="card w-full max-w-md">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Join FoodPilot in seconds</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(['CUSTOMER', 'MERCHANT', 'COURIER'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-xl border px-3 py-2 text-sm ${role === r ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-700'}`}
            >
              {r === 'CUSTOMER' ? 'Customer' : r === 'MERCHANT' ? 'Merchant' : 'Courier'}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-gray-700">Full name</span>
            <input className="input mt-1" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">Email</span>
            <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">Password</span>
            <input className="input mt-1" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="mt-1 block text-xs text-gray-500">At least 8 characters</span>
          </label>
        </div>

        {error && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <button className="btn btn-primary mt-4 w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <div className="mt-3 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
