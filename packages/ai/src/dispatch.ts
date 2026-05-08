import { haversineKm } from '@food/shared';

export interface DispatchableCourier {
  id: string;
  lat: number;
  lon: number;
  vehicleType: 'BICYCLE' | 'SCOOTER' | 'MOTORCYCLE' | 'CAR' | 'WALK';
  rating: number;
  acceptanceRate: number;
  fairnessScore: number;
  status: string;
  isApproved: boolean;
  activeAssignments: number;
}

export interface DispatchInput {
  restaurantLat: number;
  restaurantLon: number;
  prepTimeMinutes: number;
  candidateCouriers: DispatchableCourier[];
  maxCandidates?: number;
}

export interface DispatchScore {
  courierId: string;
  score: number;
  reasoning: string[];
  distanceKm: number;
  basePay: number;
  distancePay: number;
}

/**
 * Multi-objective courier dispatch with explainability + fairness rotation.
 *  - distance to restaurant (closer is better)
 *  - vehicle suitability
 *  - rating + acceptance rate
 *  - fairness score (higher = needs more jobs, gets boosted)
 *  - workload (fewer active jobs is better)
 */
export class DispatchService {
  rank(input: DispatchInput): DispatchScore[] {
    const eligible = input.candidateCouriers.filter(
      (c) => c.isApproved && (c.status === 'ONLINE' || c.status === 'ON_DELIVERY'),
    );

    const scored = eligible.map((c) => {
      const distanceKm = haversineKm(
        { lat: c.lat, lon: c.lon },
        { lat: input.restaurantLat, lon: input.restaurantLon },
      );
      const reasoning: string[] = [];

      const distanceScore = Math.max(0, 1 - distanceKm / 5);
      reasoning.push(`Distance ${distanceKm.toFixed(2)} km`);

      const vehicleScore = c.vehicleType === 'BICYCLE' && distanceKm > 4 ? 0.3 : 1;
      if (vehicleScore < 1) reasoning.push('Long distance for bicycle');

      const ratingScore = Math.min(1, c.rating / 5);
      const acceptanceScore = Math.min(1, c.acceptanceRate);
      const workloadScore = Math.max(0, 1 - c.activeAssignments * 0.4);
      if (c.activeAssignments > 0) reasoning.push(`${c.activeAssignments} active job(s)`);

      const fairnessBoost = Math.min(1, c.fairnessScore);
      if (fairnessBoost > 0.7) reasoning.push('Fairness rotation: needs more jobs');

      const score =
        0.35 * distanceScore +
        0.15 * vehicleScore +
        0.15 * ratingScore +
        0.1 * acceptanceScore +
        0.1 * workloadScore +
        0.15 * fairnessBoost;

      const basePay = 1.5;
      const distancePay = +(distanceKm * 0.6).toFixed(2);

      return {
        courierId: c.id,
        score: +score.toFixed(4),
        reasoning,
        distanceKm: +distanceKm.toFixed(2),
        basePay,
        distancePay,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, input.maxCandidates ?? 5);
  }
}
