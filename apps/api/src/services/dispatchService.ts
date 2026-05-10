import { prisma } from '@food/database';
import { DispatchService } from '@food/ai';
import { realtime } from '../realtime/gateway';

const dispatcher = new DispatchService();

export async function dispatchOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { restaurant: true },
  });
  if (!order || !order.restaurant) throw new Error('Order not found');

  const couriers = await prisma.courier.findMany({
    where: { isApproved: true, status: { in: ['ONLINE', 'ON_DELIVERY'] } },
    take: 50,
  });

  const activeCounts = await prisma.deliveryAssignment.groupBy({
    by: ['courierId'],
    where: { status: { in: ['OFFERED', 'ACCEPTED', 'PICKED_UP'] } },
    _count: { _all: true },
  });
  const activeMap = new Map(activeCounts.map((a) => [a.courierId, a._count._all]));

  const candidates = couriers
    .filter((c) => c.currentLat != null && c.currentLon != null)
    .map((c) => ({
      id: c.id,
      lat: c.currentLat!,
      lon: c.currentLon!,
      vehicleType: c.vehicleType,
      rating: c.rating,
      acceptanceRate: c.acceptanceRate,
      fairnessScore: c.fairnessScore,
      status: c.status,
      isApproved: c.isApproved,
      activeAssignments: activeMap.get(c.id) ?? 0,
    }));

  const ranked = dispatcher.rank({
    restaurantLat: order.restaurant.latitude,
    restaurantLon: order.restaurant.longitude,
    prepTimeMinutes: order.restaurant.averagePrepTime,
    candidateCouriers: candidates,
    maxCandidates: 3,
  });

  const offers = [];
  for (const r of ranked) {
    const offer = await prisma.deliveryAssignment.upsert({
      where: { orderId_courierId: { orderId, courierId: r.courierId } },
      create: {
        orderId,
        courierId: r.courierId,
        status: 'OFFERED',
        basePay: r.basePay,
        distancePay: r.distancePay,
        reason: r.reasoning.join('; '),
        expiresAt: new Date(Date.now() + 60_000),
      },
      update: {
        status: 'OFFERED',
        offeredAt: new Date(),
        basePay: r.basePay,
        distancePay: r.distancePay,
        reason: r.reasoning.join('; '),
      },
    });
    offers.push(offer);
    const courier = await prisma.courier.findUnique({ where: { id: r.courierId } });
    if (courier) {
      realtime.emitToUser(courier.userId, {
        type: 'courier-offer-created',
        courierId: r.courierId,
        orderId,
        data: { distanceKm: r.distanceKm, basePay: r.basePay, distancePay: r.distancePay, reason: r.reasoning },
      });
    }
  }

  return offers;
}
