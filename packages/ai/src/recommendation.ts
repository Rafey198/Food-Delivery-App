import { haversineKm } from '@food/shared';

export interface RecommendableRestaurant {
  id: string;
  name: string;
  cuisineTypes: string[];
  rating: number;
  reviewCount: number;
  averagePrepTime: number;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  popularity?: number;
}

export interface RecommendableDish {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  restaurantId: string;
  dietaryTags: string[];
  popularity: number;
  rating?: number;
}

export interface RecommendationContext {
  userLat?: number;
  userLon?: number;
  budget?: number;
  dietary?: string[];
  preferredCuisines?: string[];
  pastOrderRestaurantIds?: string[];
  pastOrderDishIds?: string[];
  timeOfDay?: 'breakfast' | 'lunch' | 'dinner' | 'late';
}

export interface ScoredRecommendation<T> {
  item: T;
  score: number;
  reasons: string[];
}

/**
 * Baseline recommendation scorer — interpretable and works without ML.
 * Score weights:
 *   0.25 preferenceMatch + 0.20 rating + 0.20 deliverySpeed +
 *   0.15 priceFit + 0.10 popularity + 0.10 availability
 */
export class RecommendationService {
  rankRestaurants(
    list: RecommendableRestaurant[],
    ctx: RecommendationContext,
  ): ScoredRecommendation<RecommendableRestaurant>[] {
    return list
      .map((r) => {
        const reasons: string[] = [];
        const cuisineMatch = ctx.preferredCuisines?.some((c) =>
          r.cuisineTypes.map((x) => x.toLowerCase()).includes(c.toLowerCase()),
        )
          ? 1
          : 0;
        if (cuisineMatch) reasons.push('Matches your favourite cuisine');

        const pastBoost = ctx.pastOrderRestaurantIds?.includes(r.id) ? 1 : 0;
        if (pastBoost) reasons.push('You ordered here before');

        const ratingScore = Math.min(1, r.rating / 5);
        if (r.rating >= 4.5) reasons.push(`Highly rated (${r.rating.toFixed(1)}★)`);

        let speedScore = 1 - Math.min(1, (r.averagePrepTime - 10) / 30);
        let distance = 0;
        if (ctx.userLat && ctx.userLon) {
          distance = haversineKm({ lat: ctx.userLat, lon: ctx.userLon }, { lat: r.latitude, lon: r.longitude });
          const distancePenalty = Math.min(1, distance / 8);
          speedScore = Math.max(0, speedScore - distancePenalty * 0.3);
          if (distance < 2) reasons.push('Very close to you');
        }

        const popularityScore = Math.min(1, (r.popularity ?? r.reviewCount) / 200);
        const availability = r.isOpen ? 1 : 0;
        if (!r.isOpen) reasons.push('Currently closed');

        const preferenceMatch = (cuisineMatch + pastBoost) / 2;

        const score =
          0.25 * preferenceMatch +
          0.2 * ratingScore +
          0.2 * speedScore +
          0.15 * 0.7 + // base price fit (no per-restaurant price knowledge here)
          0.1 * popularityScore +
          0.1 * availability;

        return { item: r, score: +score.toFixed(4), reasons };
      })
      .sort((a, b) => b.score - a.score);
  }

  rankDishes(
    list: RecommendableDish[],
    ctx: RecommendationContext,
  ): ScoredRecommendation<RecommendableDish>[] {
    return list
      .map((d) => {
        const reasons: string[] = [];

        const dietaryMatch = ctx.dietary?.length
          ? ctx.dietary.every((tag) =>
              d.dietaryTags.map((t) => t.toUpperCase()).includes(tag.toUpperCase()),
            )
            ? 1
            : 0
          : 0.5;
        if (ctx.dietary?.length && dietaryMatch === 1) reasons.push('Matches your dietary needs');

        const priceFit = ctx.budget
          ? d.price <= ctx.budget
            ? 1 - d.price / (ctx.budget * 1.2)
            : 0
          : 0.6;
        if (ctx.budget && d.price <= ctx.budget) reasons.push(`Within $${ctx.budget} budget`);

        const popularity = Math.min(1, d.popularity / 100);
        if (d.popularity > 50) reasons.push('Popular choice');

        const past = ctx.pastOrderDishIds?.includes(d.id) ? 1 : 0;
        if (past) reasons.push('You loved this before');

        const score =
          0.25 * (dietaryMatch + past) / 2 +
          0.2 * (d.rating ? d.rating / 5 : 0.7) +
          0.2 * 0.6 + // delivery speed proxied at restaurant level
          0.15 * Math.max(0, priceFit) +
          0.1 * popularity +
          0.1 * 1;

        return { item: d, score: +score.toFixed(4), reasons };
      })
      .sort((a, b) => b.score - a.score);
  }
}
