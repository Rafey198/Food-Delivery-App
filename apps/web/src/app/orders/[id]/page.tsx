'use client';

import { use, useEffect, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { api, getAccessToken } from '@/lib/api';
import { CheckCircle, Clock, MapPin, Phone, ChefHat, Bike, PackageCheck } from 'lucide-react';

const STAGES = ['PLACED', 'ACCEPTED', 'PREPARING', 'COURIER_ASSIGNED', 'PICKED_UP', 'NEAR_CUSTOMER', 'DELIVERED'];

interface OrderEvent {
  id: string;
  status: string;
  createdAt: string;
  message?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  subtotal: string;
  deliveryFee: string;
  serviceFee: string;
  tax: string;
  tip: string;
  discount: string;
  estimatedDeliveryAt?: string;
  paymentMethod: string;
  paymentStatus: string;
  ecoFriendly: boolean;
  restaurant: { id: string; name: string; logoUrl?: string; addressLine?: string };
  address: { line1: string; city: string };
  items: Array<{ id: string; nameSnapshot: string; priceSnapshot: string; quantity: number }>;
  events: OrderEvent[];
  courier?: { user: { name: string; phone?: string } } | null;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [courierLoc, setCourierLoc] = useState<{ lat: number; lon: number } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    api<Order>(`/orders/${id}`).then(setOrder);
  }, [id]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000') + `/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', room: `order:${id}` }));
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'order-status-updated' && data.orderId === id) {
          api<Order>(`/orders/${id}`).then(setOrder);
        }
        if (data.type === 'courier-location-updated') {
          setCourierLoc({ lat: data.lat, lon: data.lon });
        }
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [id]);

  if (!order) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="skeleton h-32 w-full" />
        </div>
      </div>
    );
  }

  const stageIndex = STAGES.indexOf(order.status);
  const cancelled = order.status === 'CANCELLED';

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{order.restaurant.name}</h1>
              <div className="text-sm text-gray-500">Order {order.orderNumber}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-xl font-bold">${Number(order.total).toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <Clock className="h-4 w-4 text-brand-500" />
            ETA: {order.estimatedDeliveryAt ? new Date(order.estimatedDeliveryAt).toLocaleTimeString() : '—'}
            {order.ecoFriendly && <span className="badge ml-2 bg-emerald-50 text-emerald-700">Eco order</span>}
          </div>
        </div>

        <div className="card mt-4">
          <h2 className="text-base font-semibold">Live status</h2>
          <div className="mt-3 grid gap-3">
            {STAGES.map((s, i) => {
              const done = !cancelled && i <= stageIndex;
              const active = !cancelled && i === stageIndex;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-full ${done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'} ${active ? 'animate-pulse' : ''}`}
                  >
                    {s === 'PLACED' && <CheckCircle className="h-4 w-4" />}
                    {s === 'ACCEPTED' && <CheckCircle className="h-4 w-4" />}
                    {s === 'PREPARING' && <ChefHat className="h-4 w-4" />}
                    {s === 'COURIER_ASSIGNED' && <Bike className="h-4 w-4" />}
                    {s === 'PICKED_UP' && <Bike className="h-4 w-4" />}
                    {s === 'NEAR_CUSTOMER' && <MapPin className="h-4 w-4" />}
                    {s === 'DELIVERED' && <PackageCheck className="h-4 w-4" />}
                  </div>
                  <div className="text-sm font-medium">{s.replaceAll('_', ' ')}</div>
                </div>
              );
            })}
            {cancelled && (
              <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Order was cancelled</div>
            )}
          </div>
        </div>

        {order.courier && (
          <div className="card mt-4">
            <h2 className="text-base font-semibold">Your courier</h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700">
                {order.courier.user.name[0]}
              </div>
              <div className="flex-1">
                <div className="font-medium">{order.courier.user.name}</div>
                <div className="text-xs text-gray-500">Tap to call when nearby</div>
              </div>
              {order.courier.user.phone && (
                <a href={`tel:${order.courier.user.phone}`} className="btn btn-outline">
                  <Phone className="mr-1 h-4 w-4" /> Call
                </a>
              )}
            </div>
            {courierLoc && (
              <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                Live location received: {courierLoc.lat.toFixed(4)}, {courierLoc.lon.toFixed(4)}
              </div>
            )}
            <div className="mt-3 h-48 w-full rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 p-3 text-xs text-emerald-700">
              <div className="font-medium">Map preview</div>
              <p className="opacity-70">Connect Mapbox/Google Maps in the env to enable a real map.</p>
            </div>
          </div>
        )}

        <div className="card mt-4">
          <h2 className="text-base font-semibold">Items</h2>
          <div className="mt-2 space-y-1 text-sm">
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span>{it.quantity}× {it.nameSnapshot}</span>
                <span>${(Number(it.priceSnapshot) * it.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm text-gray-700">
            <Row k="Subtotal" v={`$${Number(order.subtotal).toFixed(2)}`} />
            <Row k="Delivery" v={`$${Number(order.deliveryFee).toFixed(2)}`} />
            <Row k="Service" v={`$${Number(order.serviceFee).toFixed(2)}`} />
            <Row k="Tax" v={`$${Number(order.tax).toFixed(2)}`} />
            <Row k="Tip" v={`$${Number(order.tip).toFixed(2)}`} />
            {Number(order.discount) > 0 && <Row k="Discount" v={`-$${Number(order.discount).toFixed(2)}`} />}
            <Row k="Total" v={`$${Number(order.total).toFixed(2)}`} bold />
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className={bold ? '' : 'text-gray-500'}>{k}</span>
      <span>{v}</span>
    </div>
  );
}
