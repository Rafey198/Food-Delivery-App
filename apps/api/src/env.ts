import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing env: ${name}`);
  }
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.API_PORT ?? 4000),
  HOST: process.env.API_HOST ?? '0.0.0.0',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  DATABASE_URL: required('DATABASE_URL', 'postgresql://food:food@localhost:5432/food?schema=public'),
  REDIS_URL: process.env.REDIS_URL ?? '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? '30d',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  AI_PROVIDER: process.env.AI_PROVIDER ?? 'mock',
};
