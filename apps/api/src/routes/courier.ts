import { Router } from 'express';
import { prisma } from '@food/database';
import { authRequired, requireRole } from '../auth/middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { Forbidden, NotFound } from '../utils/errors';
import { realtime } from '../realtime/gateway';

const router = Router();
router.use(authRequired, requireRole('COURIER'));

async function getCourier(userId: string) {
  const c = await prisma.courier.findUnique({ where: { userId } });
  if (!c) throw NotFound('Courier profile not found');
  return c;
}

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const c = await getCourier(req.user!.sub);
    res.json(c);
  }),
);

router.post(
  '/status',
  asyncHandler(async (req, res) => {
    const c = await getCourier(req.user!.sub);
    const status = req.body?.status as 'ONLINE' | 'OFFLINE' | 'ON_BREAK';
    if (!['ONLINE', 'OFFLINE', 'ON_BREAK'].includes(status)) throw Forbidden('Invalid status');
    const updated = await prisma.courier.update({
      where: { id: c.id },
      data: { status, lastPingAt: new Date() },
    });
    res.json(updated);
  }),
);

router.patch(
  '/location',
  asyncHandler(async (req, res) => {
    const c = await getCourier(req.user!.sub);
    const lat = Number(req.body?.lat);
    const lon = Number(req.body?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw Forbidden('Invalid coords');
    await prisma.courier.update({
      where: { id: c.id },
      data: { currentLat: lat, currentLon: lon, lastPingAt: new Date() },
    });
    // Throttle persistence: only sample one row every ~10s in production
    await prisma.courierLocation.create({ data: { courierId: c.id, lat, lon } });

    // Live broadcast to interested parties (active orders)
    const active = await prisma.order.findMany({
      where: { courierId: c.id, status: { in: ['COURIER_ASSIGNED', 'PICKED_UP', 'NEAR_CUSTOMER'] } },
      select: { id: true, customerId: true },
    });
    for (const o of active) {
      realtime.emitToOrder(o.id, { type: 'courier-location-updated', courierId: c.id, lat, lon });
      realtime.emitToUser(o.customerId, { type: 'courier-location-updated', courierId: c.id, lat, lon });
    }
    res.json({ ok: true });
  }),
);

router.get(
  '/offers',
  asyncHandler(async (req, res) => {
    const c = await getCourier(req.user!.sub);
    const offers = await prisma.deliveryAssignment.findMany({
      where: { courierId: c.id, status: 'OFFERED', expiresAt: { gt: new Date() } },
      include: { order: { include: { restaurant: true, address: true } } },
      orderBy: { offeredAt: 'desc' },
    });
    res.json({ items: offers });
  }),
);

router.post(
  '/offers/:id/accept',
  asyncHandler(async (req, res) => {
    const c = await getCourier(req.user!.sub);
    const offer = await prisma.deliveryAssignment.findFirst({
      where: { id: req.params.id, courierId: c.id, status: 'OFFERED' },
    });
    if (!offer) throw NotFound('Offer not found');

    await prisma.$transaction([
      prisma.deliveryAssignment.update({
        where: { id: offer.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
      prisma.deliveryAssignment.updateMany({
        where: { orderId: offer.orderId, id: { not: offer.id }, status: 'OFFERED' },
        data: { status: 'CANCELLED' },
      }),
      prisma.order.update({
        where: { id: offer.orderId },
        data: { courierId: c.id, status: 'COURIER_ASSIGNED' },
      }),
      prisma.courier.update({
        where: { id: c.id },
        data: { status: 'ON_DELIVERY' },
      }),
    ]);

    const order = await prisma.order.findUnique({ where: { id: offer.orderId } });
    if (order) {
      realtime.emitToOrder(order.id, { type: 'order-status-updated', orderId: order.id, status: 'COURIER_ASSIGNED' });
      realtime.emitToUser(order.customerId, { type: 'order-status-updated', orderId: order.id, status: 'COURIER_ASSIGNED' });
    }
    res.json({ ok: true });
  }),
);

router.post(
  '/offers/:id/reject',
  asyncHandler(async (req, res) => {
    const c = await getCourier(req.user!.sub);
    await prisma.deliveryAssignment.updateMany({
      where: { id: req.params.id, courierId: c.id, status: 'OFFERED' },
      data: { status: 'REJECTED', rejectedAt: new Date() },
    });
    await prisma.courier.update({
      where: { id: c.id },
      data: { acceptanceRate: { decrement: 0.01 } },
    });
    res.json({ ok: true });
  }),
);

router.patch(
  '/orders/:id/pickup',
  asyncHandler(async (req, res) => {
    const c = await getCourier(req.user!.sub);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, courierId: c.id } });
    if (!order) throw NotFound('Order not found');
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PICKED_UP', pickedUpAt: new Date(), events: { create: { status: 'PICKED_UP' } } },
    });
    realtime.emitToOrder(order.id, { type: 'order-status-updated', orderId: order.id, status: 'PICKED_UP' });
    realtime.emitToUser(order.customerId, { type: 'order-status-updated', orderId: order.id, status: 'PICKED_UP' });
    res.json({ ok: true });
  }),
);

router.patch(
  '/orders/:id/deliver',
  asyncHandler(async (req, res) => {
    const c = await getCourier(req.user!.sub);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, courierId: c.id } });
    if (!order) throw NotFound('Order not found');
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          paymentStatus: order.paymentMethod === 'CASH' ? 'PAID' : order.paymentStatus,
          events: { create: { status: 'DELIVERED' } },
        },
      }),
      prisma.deliveryAssignment.updateMany({
        where: { orderId: order.id, courierId: c.id },
        data: { status: 'DELIVERED', deliveredAt: new Date(), proofPhotoUrl: req.body?.proofPhotoUrl },
      }),
      prisma.courier.update({
        where: { id: c.id },
        data: {
          status: 'ONLINE',
          totalDeliveries: { increment: 1 },
          earningsToday: { increment: 4 },
        },
      }),
    ]);
    realtime.emitToOrder(order.id, { type: 'order-status-updated', orderId: order.id, status: 'DELIVERED' });
    realtime.emitToUser(order.customerId, { type: 'order-status-updated', orderId: order.id, status: 'DELIVERED' });
    res.json({ ok: true });
  }),
);

router.get(
  '/earnings',
  asyncHandler(async (req, res) => {
    const c = await getCourier(req.user!.sub);
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const assignments = await prisma.deliveryAssignment.findMany({
      where: { courierId: c.id, status: 'DELIVERED', deliveredAt: { gte: since } },
      select: {
        id: true,
        deliveredAt: true,
        basePay: true,
        distancePay: true,
        waitingPay: true,
        bonusPay: true,
        tip: true,
      },
    });
    const total = assignments.reduce(
      (s, a) =>
        s +
        Number(a.basePay) +
        Number(a.distancePay) +
        Number(a.waitingPay) +
        Number(a.bonusPay) +
        Number(a.tip),
      0,
    );
    res.json({
      period: '30d',
      totalEarnings: +total.toFixed(2),
      breakdown: assignments,
      transparencyNote:
        'Pay is calculated as base fee + distance pay + waiting pay + tips + any bonus. You can appeal any decision in the support tab.',
    });
  }),
);

export default router;
