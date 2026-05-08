import { describe, it, expect } from 'vitest';
import { calculateOrderPricing, haversineKm } from '@food/shared';

describe('pricing', () => {
  it('computes subtotal, fees and total', () => {
    const p = calculateOrderPricing({
      items: [
        { price: 7.5, quantity: 2 },
        { price: 3.5, quantity: 1 },
      ],
      distanceKm: 3,
      tip: 1,
    });
    expect(p.subtotal).toBeCloseTo(18.5, 2);
    expect(p.deliveryFee).toBeGreaterThan(0);
    expect(p.total).toBeGreaterThan(p.subtotal);
  });

  it('applies free-delivery coupon', () => {
    const p = calculateOrderPricing({
      items: [{ price: 10, quantity: 1 }],
      distanceKm: 5,
      coupon: { type: 'FREE_DELIVERY', value: 0 },
    });
    expect(p.deliveryFee).toBe(0);
    expect(p.discount).toBeGreaterThan(0);
  });
});

describe('geo', () => {
  it('computes haversine distance', () => {
    const d = haversineKm({ lat: 24.86, lon: 67.0 }, { lat: 24.87, lon: 67.01 });
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(2);
  });
});
