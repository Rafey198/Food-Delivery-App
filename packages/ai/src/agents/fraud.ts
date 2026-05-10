import { AgentDefinition, AgentResult } from '../agent';

export interface FraudAgentInput {
  customerId: string;
  total: number;
  paymentMethod: string;
  hoursSinceFirstOrder?: number;
  ordersInLast24h?: number;
  distinctCardsLast30d?: number;
  addressIsNew?: boolean;
  ipCountryMatchesAddress?: boolean;
  chargebacksLast90d?: number;
}

export interface FraudAgentOutput {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  signals: string[];
  recommendation: 'APPROVE' | 'REVIEW' | 'BLOCK';
}

export const FraudDetectionAgent: AgentDefinition<FraudAgentInput, FraudAgentOutput> = {
  id: 'fraud',
  name: 'Fraud Detection Agent',
  description:
    'Scores each order for fraud risk using payment, behaviour and velocity signals. Recommends approve / manual review / block.',
  capabilities: [
    'Velocity-based risk scoring',
    'Card cycling detection',
    'New-address heuristics',
    'IP-country mismatch checks',
  ],
  rolesAllowed: ['ADMIN', 'SYSTEM'],
  sampleInput: {
    customerId: 'demo',
    total: 220,
    paymentMethod: 'CARD',
    hoursSinceFirstOrder: 2,
    ordersInLast24h: 4,
    distinctCardsLast30d: 3,
    addressIsNew: true,
    ipCountryMatchesAddress: false,
    chargebacksLast90d: 1,
  },

  async run(input): Promise<AgentResult<FraudAgentOutput>> {
    const signals: string[] = [];
    let score = 0;

    if (input.total > 150) {
      score += 15;
      signals.push(`High order total: $${input.total}`);
    }
    if ((input.hoursSinceFirstOrder ?? 999) < 4) {
      score += 15;
      signals.push('Brand-new customer (< 4h)');
    }
    if ((input.ordersInLast24h ?? 0) >= 4) {
      score += 20;
      signals.push(`High velocity: ${input.ordersInLast24h} orders in 24h`);
    }
    if ((input.distinctCardsLast30d ?? 0) >= 3) {
      score += 25;
      signals.push(`Multiple cards used: ${input.distinctCardsLast30d} in 30d`);
    }
    if (input.addressIsNew) {
      score += 10;
      signals.push('New delivery address');
    }
    if (input.ipCountryMatchesAddress === false) {
      score += 20;
      signals.push('IP country ≠ delivery country');
    }
    if ((input.chargebacksLast90d ?? 0) > 0) {
      score += 30;
      signals.push(`${input.chargebacksLast90d} chargeback(s) in 90d`);
    }
    if (input.paymentMethod === 'CASH' && input.total > 80) {
      score += 10;
      signals.push('Large cash-on-delivery order');
    }

    const riskScore = Math.min(100, score);
    const riskLevel: FraudAgentOutput['riskLevel'] =
      riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';
    const recommendation: FraudAgentOutput['recommendation'] =
      riskLevel === 'HIGH' ? 'BLOCK' : riskLevel === 'MEDIUM' ? 'REVIEW' : 'APPROVE';

    return {
      output: { riskScore, riskLevel, signals, recommendation },
      reasoning: signals,
      confidence: 0.7 + Math.min(0.25, signals.length * 0.05),
      usedTools: ['velocity-counter', 'address-history', 'ip-geolocate', 'chargeback-history'],
      modelVersion: 'fraud-agent-v1',
    };
  },
};
