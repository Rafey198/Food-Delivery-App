import { haversineKm } from './geo';

export interface DeliveryFeeContext {
  distanceKm: number;
  surgeMultiplier?: number;
  isPlusMember?: boolean;
  baseFee?: number;
  perKm?: number;
}

export function calculateDeliveryFee(ctx: DeliveryFeeContext): number {
  const base = ctx.baseFee ?? 1.99;
  const perKm = ctx.perKm ?? 0.5;
  const surge = Math.min(ctx.surgeMultiplier ?? 1, 1.5);
  let fee = (base + ctx.distanceKm * perKm) * surge;
  if (ctx.isPlusMember && fee > 0) {
    fee = Math.max(0, fee - 2);
  }
  return +fee.toFixed(2);
}

export interface OrderPricingInput {
  items: Array<{ price: number; quantity: number }>;
  distanceKm: number;
  taxPct?: number;
  servicePct?: number;
  tip?: number;
  isPlusMember?: boolean;
  surgeMultiplier?: number;
  coupon?: { type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY'; value: number; max?: number };
  baseFee?: number;
  perKm?: number;
}

export interface OrderPricing {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  reasoning: string[];
}

export function calculateOrderPricing(input: OrderPricingInput): OrderPricing {
  const reasoning: string[] = [];
  const subtotal = +input.items
    .reduce((sum, it) => sum + it.price * it.quantity, 0)
    .toFixed(2);

  let deliveryFee = calculateDeliveryFee({
    distanceKm: input.distanceKm,
    surgeMultiplier: input.surgeMultiplier,
    isPlusMember: input.isPlusMember,
    baseFee: input.baseFee,
    perKm: input.perKm,
  });
  reasoning.push(
    `Base + per km (${input.distanceKm.toFixed(2)} km${input.surgeMultiplier && input.surgeMultiplier > 1 ? `, surge x${input.surgeMultiplier}` : ''})`,
  );

  const serviceFee = +(subtotal * (input.servicePct ?? 0.05)).toFixed(2);
  const tax = +(subtotal * (input.taxPct ?? 0.08)).toFixed(2);
  const tip = +(input.tip ?? 0).toFixed(2);

  let discount = 0;
  if (input.coupon) {
    if (input.coupon.type === 'PERCENT') {
      discount = (subtotal * input.coupon.value) / 100;
      if (input.coupon.max) discount = Math.min(discount, input.coupon.max);
      reasoning.push(`Coupon ${input.coupon.value}% off`);
    } else if (input.coupon.type === 'FIXED') {
      discount = input.coupon.value;
      reasoning.push(`Coupon $${input.coupon.value} off`);
    } else if (input.coupon.type === 'FREE_DELIVERY') {
      discount = deliveryFee;
      deliveryFee = 0;
      reasoning.push('Free delivery applied');
    }
  }
  discount = +discount.toFixed(2);

  const total = +(subtotal + deliveryFee + serviceFee + tax + tip - discount).toFixed(2);

  return { subtotal, deliveryFee, serviceFee, tax, tip, discount, total, reasoning };
}

export { haversineKm };
