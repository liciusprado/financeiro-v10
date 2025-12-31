/**
 * Cache Service
 * Sistema de cache com suporte a Redis e fallback para Memory
 * Otimiza queries frequentes e reduz carga no banco
 */

import { createClient, RedisClientType } from 'redis';

interface CacheConfig {
  ttl?: number; // Time to live em segundos (default: 300 = 5 min)
  prefix?: string; // Prefixo para as keys
}

class CacheService {
  private redisClient: RedisClientType | null = null;
  private memoryCache: Map<string, { value: any; expiry: number }> = new Map();
  private useRedis: boolean = false;
  private defaultTTL: number = 300; // 5 minutos
  private prefix: string = 'pf:'; // planejamento-financeiro

  constructor() {
    this.initRedis();
    this.startCleanupInterval();
  }

  /**
   * Inicializar Redis (opcional)
   */
  private async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        console.log('[CACHE] Redis not configured, using memory cache');
        return;
      }

      this.redisClient = createClient({ url: redisUrl });
      
      this.redisClient.on('error', (err) => {
        console.error('[CACHE] Redis error:', err);
        this.useRedis = false;
      });

      this.redisClient.on('connect', () => {
        console.log('[CACHE] Redis connected');
        this.useRedis = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('[CACHE] Failed to connect to Redis:', error);
      this.useRedis = false;
    }
  }

  /**
   * Limpar cache em memória expirado (a cada 1 minuto)
   */
  private startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.memoryCache.entries()) {
        if (data.expiry < now) {
          this.memoryCache.delete(key);
        }
      }
    }, 60000); // 1 minuto
  }

  /**
   * Gerar key completa com prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * GET - Buscar valor no cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);

    try {
      // Tentar Redis primeiro
      if (this.useRedis && this.redisClient) {
        const value = await this.redisClient.get(fullKey);
        if (value) {
          return JSON.parse(value) as T;
        }
      }

      // Fallback para memory cache
      const cached = this.memoryCache.get(fullKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.value as T;
      }

      return null;
    } catch (error) {
      console.error('[CACHE] Error getting key:', key, error);
      return null;
    }
  }

  /**
   * SET - Salvar valor no cache
   */
  async set<T>(key: string, value: T, config?: CacheConfig): Promise<void> {
    const fullKey = this.getKey(key);
    const ttl = config?.ttl || this.defaultTTL;

    try {
      const serialized = JSON.stringify(value);

      // Redis
      if (this.useRedis && this.redisClient) {
        await this.redisClient.setEx(fullKey, ttl, serialized);
      }

      // Memory cache (sempre como fallback)
      this.memoryCache.set(fullKey, {
        value,
        expiry: Date.now() + ttl * 1000,
      });
    } catch (error) {
      console.error('[CACHE] Error setting key:', key, error);
    }
  }

  /**
   * DELETE - Remover valor do cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.getKey(key);

    try {
      // Redis
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(fullKey);
      }

      // Memory
      this.memoryCache.delete(fullKey);
    } catch (error) {
      console.error('[CACHE] Error deleting key:', key, error);
    }
  }

  /**
   * DELETE PATTERN - Remover múltiplas keys por padrão
   */
  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = this.getKey(pattern);

    try {
      // Redis
      if (this.useRedis && this.redisClient) {
        const keys = await this.redisClient.keys(fullPattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      }

      // Memory (remover keys que começam com o pattern)
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(fullPattern.replace('*', ''))) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('[CACHE] Error deleting pattern:', pattern, error);
    }
  }

  /**
   * FLUSH - Limpar todo o cache
   */
  async flush(): Promise<void> {
    try {
      // Redis
      if (this.useRedis && this.redisClient) {
        await this.redisClient.flushAll();
      }

      // Memory
      this.memoryCache.clear();
    } catch (error) {
      console.error('[CACHE] Error flushing cache:', error);
    }
  }

  /**
   * REMEMBER - Get or Set (cache aside pattern)
   */
  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    config?: CacheConfig
  ): Promise<T> {
    // Tentar buscar do cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Se não existir, executar callback e cachear
    const value = await callback();
    await this.set(key, value, config);
    return value;
  }

  /**
   * Estatísticas do cache
   */
  getStats() {
    return {
      redisConnected: this.useRedis,
      memorySize: this.memoryCache.size,
      prefix: this.prefix,
      defaultTTL: this.defaultTTL,
    };
  }
}

// Singleton
export const cacheService = new CacheService();

/**
 * Cache Keys Helpers
 */
export const CACHE_KEYS = {
  // User
  user: (userId: number) => `user:${userId}`,
  userStats: (userId: number) => `user:${userId}:stats`,
  
  // Transactions
  transactions: (userId: number) => `transactions:${userId}`,
  transactionsByMonth: (userId: number, year: number, month: number) => 
    `transactions:${userId}:${year}-${month}`,
  
  // Dashboard
  dashboardSummary: (userId: number) => `dashboard:${userId}:summary`,
  
  // Goals
  goals: (userId: number) => `goals:${userId}`,
  goalProgress: (userId: number, goalId: number) => 
    `goals:${userId}:${goalId}:progress`,
  
  // Budget
  budgets: (userId: number) => `budgets:${userId}`,
  budgetUsage: (userId: number, month: string) => 
    `budgets:${userId}:${month}:usage`,
  
  // Reports
  monthlyReport: (userId: number, year: number, month: number) => 
    `reports:${userId}:${year}-${month}`,
  yearlyReport: (userId: number, year: number) => 
    `reports:${userId}:${year}`,
  
  // Categories
  categories: (userId: number) => `categories:${userId}`,
  categorySpending: (userId: number, categoryId: number, month: string) => 
    `categories:${userId}:${categoryId}:${month}`,
};

/**
 * Cache TTL Presets (em segundos)
 */
export const CACHE_TTL = {
  SHORT: 60,        // 1 minuto
  MEDIUM: 300,      // 5 minutos
  LONG: 1800,       // 30 minutos
  HOUR: 3600,       // 1 hora
  DAY: 86400,       // 24 horas
  WEEK: 604800,     // 7 dias
};

/**
 * Invalidar cache quando dados mudam
 */
export async function invalidateUserCache(userId: number) {
  await cacheService.deletePattern(`*user:${userId}*`);
  await cacheService.deletePattern(`*transactions:${userId}*`);
  await cacheService.deletePattern(`*dashboard:${userId}*`);
  await cacheService.deletePattern(`*goals:${userId}*`);
  await cacheService.deletePattern(`*budgets:${userId}*`);
  await cacheService.deletePattern(`*reports:${userId}*`);
}

/**
 * Exemplo de uso:
 * 
 * // Get/Set manual
 * await cacheService.set('user:123', userData, { ttl: CACHE_TTL.HOUR });
 * const user = await cacheService.get('user:123');
 * 
 * // Remember (cache aside)
 * const transactions = await cacheService.remember(
 *   CACHE_KEYS.transactions(userId),
 *   async () => {
 *     return await db.select().from(schema.transactions).where(...);
 *   },
 *   { ttl: CACHE_TTL.MEDIUM }
 * );
 * 
 * // Invalidar cache
 * await invalidateUserCache(userId);
 */
