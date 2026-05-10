import { AgentDefinition, AgentResult } from '../agent';

export interface PricingAgentInput {
  baseFee: number;
  perKm: number;
  distanceKm: number;
  hourOfDay: number;
  isWeekend: boolean;
  weather?: 'CLEAR' | 'RAIN' | 'STORM' | 'SNOW';
  courierSupply: number; // 0..1 (0 = none, 1 = abundant)
  orderDemandLast30m?: number;
}

export interface PricingAgentOutput {
  baseFee: number;
  surgeMultiplier: number;
  appliedReasons: string[];
  finalFee: number;
  isPeak: boolean;
  capApplied: boolean;
}

const MAX_SURGE = 1.5;

export const PricingOptimizationAgent: AgentDefinition<PricingAgentInput, PricingAgentOutput> = {
  id: 'pricing',
  name: 'Pricing Optimisation Agent',
  description:
    'Computes a transparent, capped surge multiplier from peak-hour, weather, courier supply and demand signals, and explains every reason that contributed.',
  capabilities: ['Peak-hour detection', 'Weather modifier', 'Supply-demand balance', 'Hard cap (max 1.5x)'],
  rolesAllowed: ['ADMIN', 'SYSTEM'],
  sampleInput: {
    baseFee: 1.99,
    perKm: 0.5,
    distanceKm: 3.2,
    hourOfDay: 19,
    isWeekend: true,
    weather: 'RAIN',
    courierSupply: 0.35,
    orderDemandLast30m: 80,
  },

  async run(input): Promise<AgentResult<PricingAgentOutput>> {
    const reasons: string[] = [];
    let multiplier = 1;
    let isPeak = false;

    if ((input.hourOfDay >= 11 && input.hourOfDay <= 14) || (input.hourOfDay >= 18 && input.hourOfDay <= 22)) {
      multiplier += 0.15;
      isPeak = true;
      reasons.push('Peak meal window (+15%)');
    }
    if (input.isWeekend && isPeak) {
      multiplier += 0.05;
      reasons.push('Weekend peak (+5%)');
    }
    if (input.weather === 'RAIN') {
      multiplier += 0.1;
      reasons.push('Rain (+10%)');
    } else if (input.weather === 'STORM' || input.weather === 'SNOW') {
      multiplier += 0.2;
      reasons.push(`${input.weather} (+20%)`);
    }
    if (input.courierSupply < 0.4) {
      multiplier += 0.15;
      reasons.push(`Low courier supply (${(input.courierSupply * 100).toFixed(0)}%) (+15%)`);
    }
    if ((input.orderDemandLast30m ?? 0) > 60) {
      multiplier += 0.1;
      reasons.push('High recent demand (+10%)');
    }

    let capApplied = false;
    if (multiplier > MAX_SURGE) {
      multiplier = MAX_SURGE;
      capApplied = true;
      reasons.push(`Capped at ${MAX_SURGE}x for fairness`);
    }

    const rawFee = input.baseFee + input.distanceKm * input.perKm;
    const finalFee = +(rawFee * multiplier).toFixed(2);

    return {
      output: {
        baseFee: +rawFee.toFixed(2),
        surgeMultiplier: +multiplier.toFixed(2),
        appliedReasons: reasons,
        finalFee,
        isPeak,
        capApplied,
      },
      reasoning: reasons,
      confidence: 0.9,
      usedTools: ['peak-detector', 'weather-feed', 'supply-balance'],
      modelVersion: 'pricing-agent-v1',
    };
  },
};
