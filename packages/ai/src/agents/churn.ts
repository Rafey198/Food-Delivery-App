import { AgentDefinition, AgentResult } from '../agent';

export interface ChurnAgentInput {
  daysSinceLastOrder: number;
  ordersLast90d: number;
  avgOrderValue: number;
  cancellationRate: number;
  supportTicketsLast90d: number;
  averageRatingGiven?: number;
}

export interface ChurnAgentOutput {
  churnProbability: number;
  segment: 'LOYAL' | 'AT_RISK' | 'DORMANT' | 'CHURNED';
  reasons: string[];
  retentionPlay: string;
  estimatedLTVUSD: number;
}

export const ChurnPredictionAgent: AgentDefinition<ChurnAgentInput, ChurnAgentOutput> = {
  id: 'churn',
  name: 'Churn Prediction Agent',
  description:
    'Predicts each customer’s likelihood of churning over the next 30 days and recommends the highest-leverage retention play.',
  capabilities: ['Recency-frequency-monetary scoring', 'Segment assignment', 'Retention play recommender'],
  rolesAllowed: ['ADMIN', 'SYSTEM'],
  sampleInput: {
    daysSinceLastOrder: 42,
    ordersLast90d: 1,
    avgOrderValue: 18,
    cancellationRate: 0.1,
    supportTicketsLast90d: 1,
    averageRatingGiven: 3.5,
  },

  async run(input): Promise<AgentResult<ChurnAgentOutput>> {
    const reasons: string[] = [];
    let p = 0;

    if (input.daysSinceLastOrder > 60) {
      p += 0.5;
      reasons.push(`Inactive ${input.daysSinceLastOrder} days`);
    } else if (input.daysSinceLastOrder > 30) {
      p += 0.3;
      reasons.push(`Slowing engagement (${input.daysSinceLastOrder} days)`);
    }
    if (input.ordersLast90d < 2) {
      p += 0.15;
      reasons.push('Low order count in last 90d');
    }
    if (input.cancellationRate > 0.2) {
      p += 0.1;
      reasons.push(`High cancellation rate (${(input.cancellationRate * 100).toFixed(0)}%)`);
    }
    if (input.supportTicketsLast90d >= 2) {
      p += 0.1;
      reasons.push(`Multiple support tickets (${input.supportTicketsLast90d})`);
    }
    if (input.averageRatingGiven !== undefined && input.averageRatingGiven < 3.5) {
      p += 0.1;
      reasons.push(`Low ratings given (${input.averageRatingGiven.toFixed(1)})`);
    }

    p = Math.min(0.97, p);
    const segment: ChurnAgentOutput['segment'] =
      input.daysSinceLastOrder > 90 ? 'CHURNED' : p > 0.6 ? 'AT_RISK' : p > 0.35 ? 'DORMANT' : 'LOYAL';

    const plays: Record<ChurnAgentOutput['segment'], string> = {
      LOYAL: 'Send loyalty-tier upgrade nudge + early access to weekly deals',
      DORMANT: 'Offer 20% off (capped at $8) good for the next 7 days',
      AT_RISK: 'Personal apology email + free-delivery coupon for 30 days + concierge support',
      CHURNED: 'Win-back campaign: free meal under $15 + survey on why they left',
    };

    return {
      output: {
        churnProbability: +p.toFixed(2),
        segment,
        reasons,
        retentionPlay: plays[segment],
        estimatedLTVUSD: +(input.avgOrderValue * Math.max(1, input.ordersLast90d) * 4).toFixed(2),
      },
      reasoning: reasons,
      confidence: 0.65 + Math.min(0.25, reasons.length * 0.05),
      usedTools: ['rfm-scorer', 'segment-mapper', 'play-selector'],
      modelVersion: 'churn-agent-v1',
    };
  },
};
