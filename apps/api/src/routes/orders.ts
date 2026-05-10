import { Router } from 'express';
import { prisma } from '@food/database';
import { CreateOrderSchema, ReviewSchema } from '@food/shared';
import { authRequired, requireRole } from '../auth/middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getValidated, validate } from '../utils/validate';
import { Forbidden, NotFound } from '../utils/errors';
import { createOrder, transitionOrder } from '../services/orderService';
import { dispatchOrder } from '../services/dispatchService';
import { realtime } from '../realtime/gateway';

const router = Router();
router.use(authRequired, requireRole('CUSTOMER'));

router.post(
  '/',
  validate(CreateOrderSchema),
  asyncHandler(async (req, res) => {
    const data = getValidated<typeof CreateOrderSchema._type>(req);
    const order = await createOrder({ ...data, userId: req.user!.sub });
    res.status(201).json({ id: order.id, orderNumber: order.orderNumber, total: Number(order.total), status: order.status, estimatedDeliveryAt: order.estimatedDeliveryAt, pricingReasoning: order.pricingReasoning });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user!.sub },
      include: { restaurant: { select: { id: true, name: true, logoUrl: true } }, items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ items: orders });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        restaurant: { select: { id: true, name: true, logoUrl: true, latitude: true, longitude: true, addressLine: true } },
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
        address: true,
        courier: { include: { user: { select: { name: true, avatarUrl: true, phone: true } } } },
      },
    });
    if (!order || order.customerId !== req.user!.sub) throw NotFound('Order not found');
    res.json(order);
  }),
);

router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.customerId !== req.user!.sub) throw NotFound('Order not found');
    if (!['PLACED', 'ACCEPTED'].includes(order.status)) {
      throw Forbidden('Order can no longer be cancelled');
    }
    await transitionOrder(order.id, 'CANCELLED', req.body?.reason ?? 'Customer cancelled', req.user!.sub);
    res.json({ ok: true });
  }),
);

router.post(
  '/:id/review',
  validate(ReviewSchema),
  asyncHandler(async (req, res) => {
    const data = getValidated<typeof ReviewSchema._type>(req);
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.customerId !== req.user!.sub) throw NotFound('Order not found');
    if (order.status !== 'DELIVERED') throw Forbidden('Cannot review undelivered order');

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        customerId: req.user!.sub,
        restaurantId: order.restaurantId,
        courierId: order.courierId,
        foodRating: data.foodRating,
        deliveryRating: data.deliveryRating,
        comment: data.comment,
        images: data.images ?? [],
      },
    });

    if (data.foodRating) {
      const stats = await prisma.review.aggregate({
        where: { restaurantId: order.restaurantId },
        _avg: { foodRating: true },
        _count: { _all: true },
      });
      await prisma.restaurant.update({
        where: { id: order.restaurantId },
        data: {
          rating: stats._avg.foodRating ?? 5,
          reviewCount: stats._count._all,
        },
      });
    }

    res.json({ ok: true, id: review.id });
  }),
);

// Manually trigger dispatch (used by merchant flow → here as helper too)
router.post(
  '/:id/dispatch',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order || order.customerId !== req.user!.sub) throw NotFound('Order not found');
    const offers = await dispatchOrder(order.id);
    realtime.emitToUser(order.customerId, { type: 'order-status-updated', orderId: order.id, status: order.status, data: { offers: offers.length } });
    res.json({ offers: offers.length });
  }),
);

export default router;
