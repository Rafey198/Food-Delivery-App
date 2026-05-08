import { prisma } from '@food/database';
import { calculateOrderPricing, haversineKm } from '@food/shared';
import { realtime } from '../realtime/gateway';

interface CreateOrderArgs {
  userId: string;
  addressId: string;
  paymentMethod: 'CARD' | 'WALLET' | 'CASH' | 'APPLE_PAY' | 'GOOGLE_PAY';
  scheduledFor?: string;
  couponCode?: string;
  tip?: number;
  notes?: string;
  ecoFriendly?: boolean;
  noCutlery?: boolean;
}

function pad(n: number, len = 6) {
  return String(n).padStart(len, '0');
}

export async function createOrder(args: CreateOrderArgs) {
  const cart = await prisma.cart.findUnique({
    where: { userId: args.userId },
    include: { items: { include: { menuItem: true } } },
  });
  if (!cart || !cart.items.length || !cart.restaurantId) {
    throw Object.assign(new Error('Cart is empty'), { status: 400 });
  }
  const restaurant = await prisma.restaurant.findUnique({ where: { id: cart.restaurantId } });
  if (!restaurant) throw Object.assign(new Error('Restaurant unavailable'), { status: 400 });

  const address = await prisma.address.findFirst({
    where: { id: args.addressId, userId: args.userId },
  });
  if (!address) throw Object.assign(new Error('Invalid address'), { status: 400 });

  const distanceKm = haversineKm(
    { lat: restaurant.latitude, lon: restaurant.longitude },
    { lat: address.latitude, lon: address.longitude },
  );
  if (distanceKm > restaurant.deliveryRadiusKm + 0.5) {
    throw Object.assign(new Error('Address is outside delivery zone'), { status: 400 });
  }

  let coupon: any = null;
  if (args.couponCode) {
    coupon = await prisma.coupon.findUnique({ where: { code: args.couponCode.toUpperCase() } });
    if (
      coupon &&
      coupon.isActive &&
      coupon.startsAt <= new Date() &&
      coupon.endsAt >= new Date() &&
      (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
    ) {
      // ok
    } else {
      coupon = null;
    }
  }

  const pricingItems = cart.items.map((it) => {
    const variants = (it.selectedVariants as any[]) ?? [];
    const addOns = (it.selectedAddOns as any[]) ?? [];
    const unit =
      Number(it.menuItem.price) +
      variants.reduce((s, v) => s + (v.priceDelta ?? 0), 0) +
      addOns.reduce((s, a) => s + (a.price ?? 0), 0);
    return { price: unit, quantity: it.quantity };
  });

  const sub = await prisma.subscription.findFirst({
    where: { userId: args.userId, status: 'ACTIVE', plan: { in: ['PLUS', 'PRO'] } },
  });
  const isPlusMember = !!sub;

  const pricing = calculateOrderPricing({
    items: pricingItems,
    distanceKm,
    tip: args.tip,
    isPlusMember,
    coupon: coupon
      ? { type: coupon.type, value: Number(coupon.value), max: coupon.maxDiscount ? Number(coupon.maxDiscount) : undefined }
      : undefined,
  });

  if (pricing.subtotal < Number(restaurant.minOrderAmount)) {
    throw Object.assign(new Error(`Minimum order is $${restaurant.minOrderAmount}`), { status: 400 });
  }

  const count = await prisma.order.count();
  const orderNumber = `FD-${pad(count + 1, 6)}`;

  const eta = new Date(Date.now() + (restaurant.averagePrepTime + Math.round(distanceKm * 3) + 10) * 60_000);

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: args.userId,
      restaurantId: restaurant.id,
      addressId: address.id,
      status: 'PLACED',
      subtotal: pricing.subtotal,
      deliveryFee: pricing.deliveryFee,
      serviceFee: pricing.serviceFee,
      tax: pricing.tax,
      tip: pricing.tip,
      discount: pricing.discount,
      total: pricing.total,
      paymentStatus: args.paymentMethod === 'CASH' ? 'PENDING' : 'AUTHORIZED',
      paymentMethod: args.paymentMethod,
      scheduledFor: args.scheduledFor ? new Date(args.scheduledFor) : null,
      estimatedDeliveryAt: eta,
      ecoFriendly: !!args.ecoFriendly,
      noCutlery: !!args.noCutlery,
      couponCode: coupon?.code,
      notes: args.notes,
      items: {
        create: cart.items.map((it) => ({
          menuItemId: it.menuItemId,
          nameSnapshot: it.menuItem.name,
          priceSnapshot: it.menuItem.price,
          quantity: it.quantity,
          notes: it.notes,
          selectedVariants: it.selectedVariants ?? [],
          selectedAddOns: it.selectedAddOns ?? [],
        })),
      },
      events: {
        create: [{ status: 'PLACED', message: 'Order placed' }],
      },
    },
    include: { items: true, restaurant: true, address: true },
  });

  if (coupon) {
    await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
  }

  // payment record (mock)
  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: args.paymentMethod === 'CASH' ? 'cash' : 'mock',
      amount: pricing.total,
      status: args.paymentMethod === 'CASH' ? 'PENDING' : 'AUTHORIZED',
      method: args.paymentMethod,
    },
  });

  // clear cart
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: { restaurantId: null } });

  // loyalty points
  await prisma.loyaltyTransaction.create({
    data: {
      userId: args.userId,
      points: Math.floor(pricing.total),
      reason: `Order ${orderNumber}`,
      orderId: order.id,
    },
  });
  await prisma.user.update({
    where: { id: args.userId },
    data: { loyaltyPoints: { increment: Math.floor(pricing.total) } },
  });

  // notify restaurant
  realtime.emitToRestaurant(restaurant.id, {
    type: 'restaurant-order-received',
    restaurantId: restaurant.id,
    orderId: order.id,
  });

  return { ...order, pricingReasoning: pricing.reasoning };
}

export async function transitionOrder(
  orderId: string,
  status: 'ACCEPTED' | 'REJECTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'CANCELLED',
  message?: string,
  actorId?: string,
) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(status === 'ACCEPTED' ? { acceptedAt: new Date() } : {}),
      ...(status === 'PREPARING' ? { preparingAt: new Date() } : {}),
      ...(status === 'READY_FOR_PICKUP' ? { readyAt: new Date() } : {}),
      ...(status === 'CANCELLED' ? { cancelledAt: new Date(), cancellationReason: message ?? 'Cancelled' } : {}),
      events: { create: { status, message, actorId } },
    },
  });
  realtime.emitToOrder(orderId, { type: 'order-status-updated', orderId, status });
  realtime.emitToUser(order.customerId, { type: 'order-status-updated', orderId, status });
  return order;
}
