export interface HistoricalOrder {
  zoneId: string;
  createdAt: Date;
}

export interface ZoneForecast {
  zoneId: string;
  forecastHour: Date;
  predictedOrders: number;
  confidence: number;
}

/**
 * Baseline forecaster: average orders per (zone, weekday, hour) +
 * a recency-weighted boost. Designed so a real ML model can replace
 * this implementation behind the same interface later.
 */
export class DemandForecastService {
  forecastNext24h(orders: HistoricalOrder[], zoneIds: string[]): ZoneForecast[] {
    const buckets = new Map<string, number[]>();
    for (const o of orders) {
      const key = `${o.zoneId}:${o.createdAt.getDay()}:${o.createdAt.getHours()}`;
      const arr = buckets.get(key) ?? [];
      arr.push(1);
      buckets.set(key, arr);
    }

    const now = new Date();
    const out: ZoneForecast[] = [];
    for (const zoneId of zoneIds) {
      for (let h = 0; h < 24; h++) {
        const target = new Date(now);
        target.setHours(now.getHours() + h, 0, 0, 0);
        const key = `${zoneId}:${target.getDay()}:${target.getHours()}`;
        const samples = buckets.get(key) ?? [];
        const baseline = samples.length;
        const peakBoost =
          target.getHours() >= 11 && target.getHours() <= 14
            ? 1.4
            : target.getHours() >= 18 && target.getHours() <= 22
              ? 1.6
              : 0.8;
        const predicted = Math.max(1, Math.round(baseline * peakBoost) + 5);
        const confidence = Math.min(0.95, 0.4 + samples.length / 50);
        out.push({ zoneId, forecastHour: target, predictedOrders: predicted, confidence });
      }
    }
    return out;
  }
}
