import { Router } from 'express';
import { prisma } from '@food/database';
import { NearbySchema, SearchSchema, haversineKm, estimateDriveMinutes } from '@food/shared';
import { asyncHandler } from '../utils/asyncHandler';
import { getValidated, validate } from '../utils/validate';
import { authOptional } from '../auth/middleware';
import { NotFound } from '../utils/errors';
import { getRedis } from '../redis';

const router = Router();

router.get(
  '/nearby',
  validate(NearbySchema, 'query'),
  asyncHandler(async (req, res) => {
    const q = getValidated<typeof NearbySchema._type>(req, 'query');
    const cacheKey = `nearby:${q.lat.toFixed(3)}:${q.lon.toFixed(3)}:${q.radiusKm}:${q.cuisine ?? ''}:${q.query ?? ''}:${q.page}:${q.pageSize}`;
    const redis = getRedis();
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.setHeader('x-cache', 'hit');
      return res.json(JSON.parse(cached));
    }

    const where: any = { status: 'APPROVED' };
    if (q.cuisine) where.cuisineTypes = { has: q.cuisine };
    if (q.query) where.name = { contains: q.query, mode: 'insensitive' };
    if (q.open) where.isOpen = true;

    const all = await prisma.restaurant.findMany({
      where,
      take: 200,
      include: { _count: { select: { menuItems: true } } },
    });
    const filtered = all
      .map((r) => {
        const distanceKm = haversineKm({ lat: q.lat, lon: q.lon }, { lat: r.latitude, lon: r.longitude });
        return { ...r, distanceKm };
      })
      .filter((r) => r.distanceKm <= q.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const items = filtered.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      cuisineTypes: r.cuisineTypes,
      logoUrl: r.logoUrl,
      bannerUrl: r.bannerUrl,
      rating: r.rating,
      reviewCount: r.reviewCount,
      distanceKm: +r.distanceKm.toFixed(2),
      etaMinutes: r.averagePrepTime + estimateDriveMinutes(r.distanceKm),
      isOpen: r.isOpen,
      isCloudKitchen: r.isCloudKitchen,
      isHalalCertified: r.isHalalCertified,
      sustainabilityScore: r.sustainabilityScore,
      averagePrepTime: r.averagePrepTime,
      city: r.city,
    }));
    const result = { items, total: filtered.length, page: q.page, pageSize: q.pageSize };
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 30);
    res.setHeader('x-cache', 'miss');
    res.json(result);
  }),
);

// `/search` (mounted at top-level by the server)
export const searchRouter = Router();
searchRouter.get(
  '/',
  validate(SearchSchema, 'query'),
  asyncHandler(async (req, res) => {
    const q = getValidated<typeof SearchSchema._type>(req, 'query');
    const items = await prisma.menuItem.findMany({
      where: {
        OR: [
          { name: { contains: q.q, mode: 'insensitive' } },
          { description: { contains: q.q, mode: 'insensitive' } },
        ],
        ...(q.maxPrice ? { price: { lte: q.maxPrice } } : {}),
        ...(q.dietary ? { dietaryTags: { has: q.dietary.toUpperCase() } } : {}),
        isAvailable: true,
        restaurant: { status: 'APPROVED' },
      },
      take: 30,
      include: {
        restaurant: { select: { id: true, name: true, slug: true, rating: true, latitude: true, longitude: true, averagePrepTime: true, logoUrl: true } },
      },
    });

    const restaurants = await prisma.restaurant.findMany({
      where: {
        OR: [
          { name: { contains: q.q, mode: 'insensitive' } },
          { cuisineTypes: { has: q.q } },
        ],
        status: 'APPROVED',
        ...(q.minRating ? { rating: { gte: q.minRating } } : {}),
      },
      take: 15,
    });

    res.json({
      query: q.q,
      restaurants: restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        cuisineTypes: r.cuisineTypes,
        rating: r.rating,
        averagePrepTime: r.averagePrepTime,
        logoUrl: r.logoUrl,
      })),
      dishes: items.map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description,
        price: Number(it.price),
        imageUrl: it.imageUrl,
        dietaryTags: it.dietaryTags,
        restaurant: it.restaurant,
      })),
    });
  }),
);

router.get(
  '/:id',
  authOptional,
  asyncHandler(async (req, res) => {
    const r = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
      include: {
        categories: { orderBy: { sortOrder: 'asc' } },
        menuItems: {
          include: { addOnGroups: { include: { addOns: true } }, variants: true },
          where: { isAvailable: true },
        },
        reviews: { orderBy: { createdAt: 'desc' }, take: 10, include: { customer: { select: { name: true, avatarUrl: true } } } },
      },
    });
    if (!r) throw NotFound('Restaurant not found');
    res.json({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      cuisineTypes: r.cuisineTypes,
      logoUrl: r.logoUrl,
      bannerUrl: r.bannerUrl,
      rating: r.rating,
      reviewCount: r.reviewCount,
      averagePrepTime: r.averagePrepTime,
      isOpen: r.isOpen,
      isCloudKitchen: r.isCloudKitchen,
      isHalalCertified: r.isHalalCertified,
      isVegetarian: r.isVegetarian,
      sustainabilityScore: r.sustainabilityScore,
      virtualBrands: r.virtualBrands,
      address: r.addressLine,
      city: r.city,
      coords: { lat: r.latitude, lon: r.longitude },
      openingHours: r.openingHours,
      categories: r.categories,
      menu: r.menuItems.map((m) => ({
        id: m.id,
        categoryId: m.categoryId,
        name: m.name,
        description: m.description,
        imageUrl: m.imageUrl,
        price: Number(m.price),
        discountPrice: m.discountPrice ? Number(m.discountPrice) : null,
        isAvailable: m.isAvailable,
        prepTime: m.prepTime,
        calories: m.calories,
        spiceLevel: m.spiceLevel,
        allergens: m.allergens,
        dietaryTags: m.dietaryTags,
        sustainabilityTags: m.sustainabilityTags,
        variants: m.variants,
        addOnGroups: m.addOnGroups,
      })),
      reviews: r.reviews,
    });
  }),
);

router.get(
  '/:id/menu',
  asyncHandler(async (req, res) => {
    const items = await prisma.menuItem.findMany({
      where: { restaurantId: req.params.id, isAvailable: true },
      include: { category: true, addOnGroups: { include: { addOns: true } }, variants: true },
      orderBy: { name: 'asc' },
    });
    res.json({ items });
  }),
);

export default router;
