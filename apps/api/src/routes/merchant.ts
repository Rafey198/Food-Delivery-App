import { Router } from 'express';
import { prisma } from '@food/database';
import { authRequired, requireRole } from '../auth/middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getValidated, validate } from '../utils/validate';
import { Forbidden, NotFound } from '../utils/errors';
import { MenuItemSchema } from '@food/shared';
import { MenuTaggingService, ReviewIntelligenceService } from '@food/ai';
import { transitionOrder } from '../services/orderService';
import { dispatchOrder } from '../services/dispatchService';

const router = Router();
router.use(authRequired, requireRole('MERCHANT'));

const tagger = new MenuTaggingService();
const reviewIntel = new ReviewIntelligenceService();

async function getOwnedRestaurant(userId: string) {
  const r = await prisma.restaurant.findFirst({ where: { ownerId: userId } });
  if (!r) throw NotFound('You do not own a restaurant yet');
  return r;
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await prisma.order.findMany({
      where: { restaurantId: r.id, createdAt: { gte: today } },
    });
    const allCount = await prisma.order.count({ where: { restaurantId: r.id } });
    const cancelled = await prisma.order.count({ where: { restaurantId: r.id, status: 'CANCELLED' } });
    const revenueAgg = await prisma.order.aggregate({
      where: { restaurantId: r.id, paymentStatus: 'PAID' },
      _sum: { total: true },
    });
    const lowStock = await prisma.menuItem.findMany({
      where: { restaurantId: r.id, isAvailable: false },
      take: 5,
    });
    const topItems = await prisma.orderItem.groupBy({
      by: ['menuItemId', 'nameSnapshot'],
      where: { order: { restaurantId: r.id, status: 'DELIVERED' } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });
    res.json({
      restaurant: { id: r.id, name: r.name, isOpen: r.isOpen },
      today: {
        orders: todayOrders.length,
        revenue: todayOrders
          .filter((o) => o.paymentStatus === 'PAID')
          .reduce((s, o) => s + Number(o.total), 0),
      },
      lifetime: {
        orders: allCount,
        revenue: Number(revenueAgg._sum.total ?? 0),
        cancellationRate: allCount ? cancelled / allCount : 0,
        averageRating: r.rating,
      },
      bestSellers: topItems,
      lowStock,
    });
  }),
);

router.patch(
  '/restaurant',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const allowed = ['name', 'description', 'cuisineTypes', 'logoUrl', 'bannerUrl', 'addressLine', 'city', 'isOpen', 'deliveryRadiusKm', 'averagePrepTime', 'minOrderAmount', 'phone', 'email', 'openingHours'];
    const data: Record<string, unknown> = {};
    for (const k of allowed) if (k in req.body) data[k] = req.body[k];
    const updated = await prisma.restaurant.update({ where: { id: r.id }, data });
    res.json(updated);
  }),
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const status = req.query.status as string | undefined;
    const orders = await prisma.order.findMany({
      where: { restaurantId: r.id, ...(status ? { status: status as any } : {}) },
      include: { items: true, customer: { select: { name: true, phone: true } }, address: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ items: orders });
  }),
);

router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, restaurantId: r.id } });
    if (!order) throw NotFound('Order not found');
    const status: 'ACCEPTED' | 'REJECTED' | 'PREPARING' | 'READY_FOR_PICKUP' = req.body?.status;
    if (!['ACCEPTED', 'REJECTED', 'PREPARING', 'READY_FOR_PICKUP'].includes(status)) {
      throw Forbidden('Invalid status');
    }
    await transitionOrder(order.id, status, req.body?.message, req.user!.sub);
    if (status === 'ACCEPTED') {
      // dispatch couriers automatically when order is accepted
      await dispatchOrder(order.id).catch(() => undefined);
    }
    res.json({ ok: true });
  }),
);

// Menu management
router.get(
  '/menu-items',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const items = await prisma.menuItem.findMany({
      where: { restaurantId: r.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  }),
);

router.post(
  '/menu-items',
  validate(MenuItemSchema),
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const data = getValidated<typeof MenuItemSchema._type>(req);

    const tags = await tagger.tag({ name: data.name, description: data.description ?? null });

    const created = await prisma.menuItem.create({
      data: {
        restaurantId: r.id,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        discountPrice: data.discountPrice,
        categoryId: data.categoryId,
        isAvailable: data.isAvailable,
        prepTime: data.prepTime,
        calories: data.calories,
        spiceLevel: data.spiceLevel ?? tags.spiceLevel,
        allergens: data.allergens ?? [],
        dietaryTags: data.dietaryTags ?? [],
        sustainabilityTags: data.sustainabilityTags ?? tags.sustainability,
        aiTags: tags.dietary,
      },
    });

    res.status(201).json({ item: created, aiSuggestions: tags });
  }),
);

router.patch(
  '/menu-items/:id',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const existing = await prisma.menuItem.findFirst({ where: { id: req.params.id, restaurantId: r.id } });
    if (!existing) throw NotFound('Menu item not found');
    const updated = await prisma.menuItem.update({ where: { id: existing.id }, data: req.body });
    res.json(updated);
  }),
);

router.delete(
  '/menu-items/:id',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const existing = await prisma.menuItem.findFirst({ where: { id: req.params.id, restaurantId: r.id } });
    if (!existing) throw NotFound('Menu item not found');
    await prisma.menuItem.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  }),
);

// Categories
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const items = await prisma.menuCategory.findMany({
      where: { restaurantId: r.id },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ items });
  }),
);

router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const created = await prisma.menuCategory.create({
      data: {
        restaurantId: r.id,
        name: req.body?.name,
        description: req.body?.description,
        sortOrder: req.body?.sortOrder ?? 0,
      },
    });
    res.status(201).json(created);
  }),
);

router.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const existing = await prisma.menuCategory.findFirst({ where: { id: req.params.id, restaurantId: r.id } });
    if (!existing) throw NotFound('Category not found');
    const updated = await prisma.menuCategory.update({ where: { id: existing.id }, data: req.body });
    res.json(updated);
  }),
);

router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const existing = await prisma.menuCategory.findFirst({ where: { id: req.params.id, restaurantId: r.id } });
    if (!existing) throw NotFound('Category not found');
    await prisma.menuCategory.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  }),
);

// Reviews
router.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const reviews = await prisma.review.findMany({
      where: { restaurantId: r.id },
      include: { customer: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const summary = await reviewIntel.summarise(
      reviews.map((rv) => ({ rating: rv.foodRating ?? rv.deliveryRating ?? 0, comment: rv.comment })),
    );
    res.json({ reviews, summary });
  }),
);

router.post(
  '/reviews/:id/reply',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const review = await prisma.review.findFirst({ where: { id: req.params.id, restaurantId: r.id } });
    if (!review) throw NotFound('Review not found');
    const draft = req.body?.draft
      ? await reviewIntel.draftReply(review.comment ?? '', review.foodRating ?? 5)
      : null;
    const reply = req.body?.reply ?? draft;
    const updated = await prisma.review.update({
      where: { id: review.id },
      data: { reply, repliedAt: new Date() },
    });
    res.json({ review: updated, draft });
  }),
);

// Payouts
router.get(
  '/payouts',
  asyncHandler(async (req, res) => {
    const r = await getOwnedRestaurant(req.user!.sub);
    const payouts = await prisma.restaurantPayout.findMany({
      where: { restaurantId: r.id },
      orderBy: { periodStart: 'desc' },
      take: 50,
    });
    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);
    const lifetime = await prisma.order.aggregate({
      where: { restaurantId: r.id, paymentStatus: 'PAID' },
      _sum: { total: true, deliveryFee: true, discount: true, serviceFee: true },
    });
    res.json({
      payouts,
      lifetime: {
        gross: Number(lifetime._sum.total ?? 0),
        commission: Number(lifetime._sum.total ?? 0) * Number(r.commissionRate ?? 0.18),
      },
    });
  }),
);

export default router;
