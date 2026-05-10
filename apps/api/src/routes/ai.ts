import { Router } from 'express';
import { prisma } from '@food/database';
import { authRequired, requireRole } from '../auth/middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getValidated, validate } from '../utils/validate';
import { MealAssistantSchema, RecommendationsSchema, haversineKm, estimateDriveMinutes } from '@food/shared';
import {
  MealAssistantService,
  RecommendationService,
  listAgents,
  getAgent,
} from '@food/ai';
import { Forbidden, NotFound } from '../utils/errors';

const router = Router();
const recommender = new RecommendationService();
const assistant = new MealAssistantService();

router.post(
  '/recommendations',
  authRequired,
  requireRole('CUSTOMER'),
  validate(RecommendationsSchema),
  asyncHandler(async (req, res) => {
    const data = getValidated<typeof RecommendationsSchema._type>(req);
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const prefs = (user?.preferences as any) ?? {};
    const past = await prisma.order.findMany({
      where: { customerId: userId, status: 'DELIVERED' },
      select: { restaurantId: true, items: { select: { menuItemId: true } } },
      take: 30,
    });
    const pastRestaurants = past.map((o) => o.restaurantId);
    const pastDishes = past.flatMap((o) => o.items.map((i) => i.menuItemId).filter(Boolean) as string[]);

    const lat = data.lat ?? 24.8607;
    const lon = data.lon ?? 67.0011;

    const restaurants = await prisma.restaurant.findMany({
      where: { status: 'APPROVED' },
      take: 100,
    });
    const ranked = recommender
      .rankRestaurants(
        restaurants.map((r) => ({
          id: r.id,
          name: r.name,
          cuisineTypes: r.cuisineTypes,
          rating: r.rating,
          reviewCount: r.reviewCount,
          averagePrepTime: r.averagePrepTime,
          latitude: r.latitude,
          longitude: r.longitude,
          isOpen: r.isOpen,
        })),
        {
          userLat: lat,
          userLon: lon,
          preferredCuisines: prefs.cuisines ?? [],
          dietary: data.dietary ?? prefs.dietary ?? [],
          pastOrderRestaurantIds: pastRestaurants,
          pastOrderDishIds: pastDishes,
          budget: data.budget,
        },
      )
      .slice(0, data.limit);

    const dishes = await prisma.menuItem.findMany({
      where: { isAvailable: true, restaurant: { status: 'APPROVED' } },
      include: { restaurant: { select: { id: true, name: true, latitude: true, longitude: true, averagePrepTime: true } } },
      take: 200,
    });
    const rankedDishes = recommender
      .rankDishes(
        dishes.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          price: Number(d.price),
          restaurantId: d.restaurantId,
          dietaryTags: d.dietaryTags,
          popularity: d.popularity,
          rating: 4.5,
        })),
        { dietary: data.dietary, budget: data.budget, pastOrderDishIds: pastDishes },
      )
      .slice(0, data.limit);

    res.json({
      restaurants: ranked.map((r) => ({
        id: r.item.id,
        name: r.item.name,
        cuisineTypes: r.item.cuisineTypes,
        rating: r.item.rating,
        averagePrepTime: r.item.averagePrepTime,
        score: r.score,
        reasons: r.reasons,
        distanceKm: +haversineKm({ lat, lon }, { lat: r.item.latitude, lon: r.item.longitude }).toFixed(2),
      })),
      dishes: rankedDishes.map((d) => ({
        id: d.item.id,
        name: d.item.name,
        price: d.item.price,
        restaurantId: d.item.restaurantId,
        score: d.score,
        reasons: d.reasons,
      })),
    });
  }),
);

router.post(
  '/meal-assistant',
  authRequired,
  requireRole('CUSTOMER'),
  validate(MealAssistantSchema),
  asyncHandler(async (req, res) => {
    const data = getValidated<typeof MealAssistantSchema._type>(req);
    const lat = data.context?.lat ?? 24.8607;
    const lon = data.context?.lon ?? 67.0011;

    const items = await prisma.menuItem.findMany({
      where: { isAvailable: true, restaurant: { status: 'APPROVED', isOpen: true } },
      include: { restaurant: true },
      take: 500,
    });
    const RADIUS_KM = 25;
    const candidates = items
      .map((it) => ({
        item: it,
        distanceKm: haversineKm({ lat, lon }, { lat: it.restaurant.latitude, lon: it.restaurant.longitude }),
      }))
      .filter((x) => x.distanceKm <= RADIUS_KM)
      .map(({ item: it, distanceKm }) => ({
        id: it.id,
        name: it.name,
        description: it.description,
        price: Number(it.price),
        restaurantId: it.restaurantId,
        restaurantName: it.restaurant.name,
        dietaryTags: it.dietaryTags,
        allergens: it.allergens,
        popularity: it.popularity,
        rating: it.restaurant.rating,
        isAvailable: it.isAvailable,
        estimatedDeliveryMinutes: it.restaurant.averagePrepTime + estimateDriveMinutes(distanceKm),
      }));

    const result = await assistant.suggest(data.message, candidates, {
      userLat: lat,
      userLon: lon,
      budget: data.context?.budget,
      dietary: data.context?.dietary,
    });

    res.json(result);
  }),
);

// -------- Agent registry --------

router.get(
  '/agents',
  authRequired,
  asyncHandler(async (req, res) => {
    const role = req.user!.role;
    const agents = listAgents()
      .filter((a) => a.rolesAllowed.includes(role) || role === 'ADMIN')
      .map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        capabilities: a.capabilities,
        rolesAllowed: a.rolesAllowed,
        sampleInput: a.sampleInput,
      }));
    res.json({ items: agents });
  }),
);

router.post(
  '/agents/:id/run',
  authRequired,
  asyncHandler(async (req, res) => {
    const agent = getAgent(req.params.id);
    if (!agent) throw NotFound('Agent not found');
    const role = req.user!.role;
    if (!agent.rolesAllowed.includes(role) && role !== 'ADMIN') {
      throw Forbidden('You cannot run this agent');
    }
    const t0 = Date.now();
    const result = await agent.run(req.body?.input ?? {}, { userId: req.user!.sub, userRole: role });
    res.json({
      agentId: agent.id,
      name: agent.name,
      durationMs: Date.now() - t0,
      ...result,
    });
  }),
);

export default router;
