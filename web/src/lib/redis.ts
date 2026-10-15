import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let isRedisConnected = false;

// Local in-memory fallback cache
const memoryCache = new Map<string, { value: any; expiry: number }>();

// If no REDIS_URL is explicitly set, skip Redis entirely and use memory-only cache
const hasRedisConfig = !!process.env.REDIS_URL;

let redis: IORedis | null = null;

if (hasRedisConfig) {
  redis = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: 1, // Don't block forever
    connectTimeout: 3000,   // Fail fast
    lazyConnect: true,       // Don't connect immediately at module init
    retryStrategy(times) {
      // Stop retrying after 3 attempts to avoid blocking requests
      if (times > 3) return null;
      return Math.min(times * 100, 1000);
    }
  });

  redis.on('connect', () => {
    console.log('✅ Connected to Redis');
    isRedisConnected = true;
  });

  redis.on('error', (err: any) => {
    console.warn('⚠️ Redis Connection Error:', err.message || err.code || 'Unknown');
    isRedisConnected = false;
  });

  redis.on('close', () => {
    isRedisConnected = false;
  });

  // Try connecting but don't wait for it
  redis.connect().catch(() => {
    // Redis unavailable – will use memory cache fallback
    isRedisConnected = false;
  });
} else {
  console.log('ℹ️ No REDIS_URL set – using in-memory cache only');
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (hasRedisConfig && redis && isRedisConnected) {
      try {
        const data = await redis.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
      } catch (e) {
        // Fallback to memory on error
      }
    }
    
    const cached = memoryCache.get(key);
    if (cached) {
      if (Date.now() < cached.expiry) {
        return cached.value as T;
      }
      memoryCache.delete(key);
    }
    return null;
  },

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (hasRedisConfig && redis && isRedisConnected) {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (e) {
        // Fallback to memory on error
      }
    }
    
    memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  },

  async del(key: string): Promise<void> {
    if (hasRedisConfig && redis && isRedisConnected) {
      try {
        await redis.del(key);
      } catch (e) {}
    }
    memoryCache.delete(key);
  },

  async flush(): Promise<void> {
    if (hasRedisConfig && redis && isRedisConnected) {
      try {
        await redis.flushall();
      } catch (e) {}
    }
    memoryCache.clear();
  }
};

export default redis;
