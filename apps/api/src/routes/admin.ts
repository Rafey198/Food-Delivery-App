import { Router } from 'express';
import { prisma } from '@food/database';
import { authRequired, requireRole } from '../auth/middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFound } from '../utils/errors';
import { DemandForecastService } from '@food/ai';

const router = Router();
router.use(authRequired, requireRole('ADMIN'));

const forecaster = new DemandForecastService();

router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const [
      orderCount,
      gmvAgg,
      activeCustomers,
      activeRestaurants,
      activeCouriers,
      cancelled,
      refunded,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.user.count({ where: { role: 'CUSTOMER', status: 'ACTIVE' } }),
      prisma.restaurant.count({ where: { status: 'APPROVED' } }),
      prisma.courier.count({ where: { isApproved: true } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count({ where: { paymentStatus: { in: ['REFUNDED', 'PARTIAL_REFUND'] } } }),
    ]);

    const recent = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { restaurant: { select: { name: true } }, customer: { select: { name: true } } },
    });

    const avgDelivery = await prisma.order.findMany({
      where: { status: 'DELIVERED', deliveredAt: { not: null } },
      select: { createdAt: true, deliveredAt: true },
      take: 200,
    });
    const avgMinutes = avgDelivery.length
      ? avgDelivery.reduce((s, o) => s + ((o.deliveredAt!.getTime() - o.createdAt.getTime()) / 60_000), 0) / avgDelivery.length
      : 0;

    res.json({
      kpis: {
        orders: orderCount,
        gmv: Number(gmvAgg._sum.total ?? 0),
        activeCustomers,
        activeRestaurants,
        activeCouriers,
        cancellationRate: orderCount ? cancelled / orderCount : 0,
        refundRate: orderCount ? refunded / orderCount : 0,
        avgDeliveryMinutes: +avgMinutes.toFixed(1),
      },
      recentOrders: recent,
    });
  }),
);

// ----- Users -----
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const role = req.query.role as string | undefined;
    const users = await prisma.user.findMany({
      where: role ? { role: role as any } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true },
    });
    res.json({ items: users });
  }),
);

router.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: req.body?.status, role: req.body?.role },
    });
    await prisma.auditLog.create({
      data: { actorId: req.user!.sub, action: 'USER_UPDATE', entityType: 'User', entityId: updated.id, metadata: req.body },
    });
    res.json(updated);
  }),
);

// ----- Restaurants -----
router.get(
  '/restaurants',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const items = await prisma.restaurant.findMany({
      where: status ? { status: status as any } : undefined,
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ items });
  }),
);

router.patch(
  '/restaurants/:id',
  asyncHandler(async (req, res) => {
    const updated = await prisma.restaurant.update({
      where: { id: req.params.id },
      data: req.body,
    });
    await prisma.auditLog.create({
      data: { actorId: req.user!.sub, action: 'RESTAURANT_UPDATE', entityType: 'Restaurant', entityId: updated.id, metadata: req.body },
    });
    res.json(updated);
  }),
);

// ----- Couriers -----
router.get(
  '/couriers',
  asyncHandler(async (_req, res) => {
    const items = await prisma.courier.findMany({
      include: { user: { select: { name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ items });
  }),
);

router.patch(
  '/couriers/:id',
  asyncHandler(async (req, res) => {
    const updated = await prisma.courier.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  }),
);

// ----- Coupons -----
router.get(
  '/coupons',
  asyncHandler(async (_req, res) => {
    const items = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ items });
  }),
);

router.post(
  '/coupons',
  asyncHandler(async (req, res) => {
    const created = await prisma.coupon.create({
      data: {
        code: String(req.body.code).toUpperCase(),
        description: req.body.description,
        type: req.body.type,
        value: req.body.value,
        minOrderAmount: req.body.minOrderAmount ?? 0,
        maxDiscount: req.body.maxDiscount,
        startsAt: new Date(req.body.startsAt),
        endsAt: new Date(req.body.endsAt),
        usageLimit: req.body.usageLimit,
        isActive: req.body.isActive ?? true,
      },
    });
    res.status(201).json(created);
  }),
);

router.patch(
  '/coupons/:id',
  asyncHandler(async (req, res) => {
    const updated = await prisma.coupon.update({ where: { id: req.params.id }, data: req.body });
    res.json(updated);
  }),
);

// ----- Orders -----
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const items = await prisma.order.findMany({
      where: status ? { status: status as any } : undefined,
      include: { customer: { select: { name: true } }, restaurant: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ items });
  }),
);

router.patch(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw NotFound('Order not found');
    const updated = await prisma.order.update({ where: { id: order.id }, data: req.body });
    await prisma.auditLog.create({
      data: { actorId: req.user!.sub, action: 'ORDER_UPDATE', entityType: 'Order', entityId: order.id, metadata: req.body },
    });
    res.json(updated);
  }),
);

// ----- Demand Analytics -----
router.get(
  '/analytics/demand',
  asyncHandler(async (_req, res) => {
    const zones = await prisma.demandZone.findMany();
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86400 * 1000) } },
      select: { createdAt: true, restaurantId: true, restaurant: { select: { city: true } } },
      take: 5000,
    });
    const baseline = forecaster.forecastNext24h(
      orders.map((o) => ({
        zoneId: zones.find((z) => z.city === o.restaurant?.city)?.id ?? zones[0]?.id ?? '',
        createdAt: o.createdAt,
      })),
      zones.map((z) => z.id),
    );
    res.json({
      zones,
      forecast: baseline,
      generatedAt: new Date().toISOString(),
    });
  }),
);

// ----- Support tickets -----
router.get(
  '/support-tickets',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const items = await prisma.supportTicket.findMany({
      where: status ? { status: status as any } : undefined,
      include: { user: { select: { name: true, email: true } }, order: { select: { orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  }),
);

router.patch(
  '/support-tickets/:id',
  asyncHandler(async (req, res) => {
    const updated = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: { status: req.body?.status, priority: req.body?.priority, assigneeId: req.body?.assigneeId ?? req.user!.sub },
    });
    res.json(updated);
  }),
);

// ----- Audit -----
router.get(
  '/audit-logs',
  asyncHandler(async (_req, res) => {
    const items = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    res.json({ items });
  }),
);

export default router;
