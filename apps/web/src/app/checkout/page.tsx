'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { useApp } from '@/lib/store';
import { api } from '@/lib/api';
import { Plus, Leaf } from 'lucide-react';

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string | null;
  city: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useApp((s) => s.cart);
  const loadCart = useApp((s) => s.loadCart);
  const user = useApp((s) => s.user);
  const addToast = useApp((s) => s.addToast);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH' | 'WALLET'>('CARD');
  const [tip, setTip] = useState(0);
  const [coupon, setCoupon] = useState('');
  const [eco, setEco] = useState(false);
  const [noCutlery, setNoCutlery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: 'HOME', line1: '', city: 'Karachi', latitude: 24.86, longitude: 67.0 });

  useEffect(() => {
    loadCart();
    api<{ items: Address[] }>('/addresses').then((d) => {
      setAddresses(d.items);
      const def = d.items.find((a) => a.isDefault) ?? d.items[0];
      if (def) setSelectedAddress(def.id);
    }).catch(() => undefined);
  }, [loadCart]);

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-xl font-semibold">Login to checkout</h1>
          <Link href="/login" className="btn btn-primary mt-4 inline-flex">Sign in</Link>
        </div>
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-xl font-semibold">Your cart is empty</h1>
          <Link href="/restaurants" className="btn btn-primary mt-4 inline-flex">Browse</Link>
        </div>
      </div>
    );
  }

  async function addAddress(e: React.FormEvent) {
    e.preventDefault();
    const created = await api<Address>('/addresses', {
      method: 'POST',
      body: JSON.stringify({
        label: newAddr.label,
        line1: newAddr.line1,
        city: newAddr.city,
        latitude: Number(newAddr.latitude),
        longitude: Number(newAddr.longitude),
        isDefault: addresses.length === 0,
      }),
    });
    setAddresses((prev) => [created, ...prev]);
    setSelectedAddress(created.id);
    setShowAddrForm(false);
  }

  async function placeOrder() {
    if (!selectedAddress) {
      addToast('Please select an address', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const order = await api<{ id: string; orderNumber: string; total: number; status: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          addressId: selectedAddress,
          paymentMethod,
          tip,
          couponCode: coupon || undefined,
          ecoFriendly: eco,
          noCutlery,
        }),
      });
      addToast(`Order ${order.orderNumber} placed!`, 'success');
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      addToast(err?.message ?? 'Failed to place order', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Estimated breakdown (server is source of truth)
  const subtotal = cart.subtotal;
  const deliveryFee = 1.99;
  const serviceFee = +(subtotal * 0.05).toFixed(2);
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = +(subtotal + deliveryFee + serviceFee + tax + tip).toFixed(2);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Delivery address</h2>
              <button onClick={() => setShowAddrForm((v) => !v)} className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
                <Plus className="h-4 w-4" /> Add new
              </button>
            </div>
            {addresses.length === 0 && !showAddrForm && (
              <p className="mt-2 text-sm text-gray-500">No addresses saved yet. Add one to continue.</p>
            )}
            <div className="mt-3 grid gap-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${selectedAddress === a.id ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white'}`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={a.id}
                    checked={selectedAddress === a.id}
                    onChange={() => setSelectedAddress(a.id)}
                    className="accent-brand-500"
                  />
                  <div className="text-sm">
                    <div className="font-medium">
                      {a.label} {a.isDefault && <span className="badge ml-1 bg-emerald-50 text-emerald-700">Default</span>}
                    </div>
                    <div className="text-gray-600">{a.line1}, {a.city}</div>
                  </div>
                </label>
              ))}
            </div>
            {showAddrForm && (
              <form onSubmit={addAddress} className="mt-3 space-y-2">
                <input className="input" placeholder="Address line" value={newAddr.line1} onChange={(e) => setNewAddr((p) => ({ ...p, line1: e.target.value }))} required />
                <div className="flex gap-2">
                  <input className="input" placeholder="City" value={newAddr.city} onChange={(e) => setNewAddr((p) => ({ ...p, city: e.target.value }))} required />
                  <input className="input" type="number" step="0.0001" placeholder="Lat" value={newAddr.latitude} onChange={(e) => setNewAddr((p) => ({ ...p, latitude: Number(e.target.value) }))} required />
                  <input className="input" type="number" step="0.0001" placeholder="Lon" value={newAddr.longitude} onChange={(e) => setNewAddr((p) => ({ ...p, longitude: Number(e.target.value) }))} required />
                </div>
                <button className="btn btn-primary" type="submit">Save address</button>
              </form>
            )}
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold">Payment</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {(['CARD', 'WALLET', 'CASH'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  type="button"
                  className={`rounded-xl border px-3 py-3 text-sm ${paymentMethod === m ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white'}`}
                >
                  {m === 'CARD' ? 'Credit card' : m === 'WALLET' ? 'Wallet' : 'Cash on delivery'}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold">Tip your courier</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[0, 1, 2, 3, 5].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTip(amt)}
                  className={`rounded-full border px-4 py-2 text-sm ${tip === amt ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200'}`}
                >
                  {amt === 0 ? 'No tip' : `$${amt}`}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold">Promo & options</h2>
            <input
              className="input mt-3"
              placeholder="Promo code (try WELCOME10)"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
            <div className="mt-3 grid gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={eco} onChange={(e) => setEco(e.target.checked)} className="accent-brand-500" />
                <Leaf className="h-4 w-4 text-emerald-600" /> Use eco-friendly packaging
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={noCutlery} onChange={(e) => setNoCutlery(e.target.checked)} className="accent-brand-500" />
                Don't include cutlery
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <div className="card sticky top-20">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
              {cart.items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <div>{it.quantity}× {it.name}</div>
                  <div>${it.lineTotal.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm text-gray-700">
              <Row k="Subtotal" v={`$${subtotal.toFixed(2)}`} />
              <Row k="Delivery fee" v={`$${deliveryFee.toFixed(2)}`} />
              <Row k="Service fee" v={`$${serviceFee.toFixed(2)}`} />
              <Row k="Tax" v={`$${tax.toFixed(2)}`} />
              <Row k="Tip" v={`$${tip.toFixed(2)}`} />
            </div>
            <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button onClick={placeOrder} disabled={submitting} className="btn btn-primary mt-4 w-full">
              {submitting ? 'Placing order...' : 'Place order'}
            </button>
            <p className="mt-2 text-xs text-gray-500">By placing your order you agree to our terms.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{k}</span>
      <span>{v}</span>
    </div>
  );
}
