import { env } from './env';

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<any>;
  del(key: string): Promise<any>;
  publish(channel: string, message: string): Promise<any>;
  hset(key: string, field: string, value: string): Promise<any>;
  hgetall(key: string): Promise<Record<string, string>>;
  expire(key: string, seconds: number): Promise<any>;
};

class InMemoryRedis implements RedisLike {
  private store = new Map<string, { v: string; expiresAt?: number }>();
  private hashes = new Map<string, Record<string, string>>();

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.v;
  }
  async set(key: string, value: string, ...args: any[]) {
    let expiresAt: number | undefined;
    for (let i = 0; i < args.length; i++) {
      if ((args[i] === 'EX' || args[i] === 'ex') && args[i + 1]) {
        expiresAt = Date.now() + Number(args[i + 1]) * 1000;
      }
      if ((args[i] === 'PX' || args[i] === 'px') && args[i + 1]) {
        expiresAt = Date.now() + Number(args[i + 1]);
      }
    }
    this.store.set(key, { v: value, expiresAt });
    return 'OK';
  }
  async del(key: string) {
    this.store.delete(key);
    this.hashes.delete(key);
    return 1;
  }
  async publish() {
    return 0;
  }
  async hset(key: string, field: string, value: string) {
    const h = this.hashes.get(key) ?? {};
    h[field] = value;
    this.hashes.set(key, h);
    return 1;
  }
  async hgetall(key: string) {
    return this.hashes.get(key) ?? {};
  }
  async expire() {
    return 1;
  }
}

let client: RedisLike | null = null;

export function getRedis(): RedisLike {
  if (client) return client;
  if (env.REDIS_URL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const IORedis = require('ioredis');
      client = new IORedis(env.REDIS_URL);
      return client!;
    } catch {
      // fall through to memory
    }
  }
  client = new InMemoryRedis();
  return client;
}
