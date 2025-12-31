/**
 * Rate Limiter
 * Protege APIs contra abuso e DDoS
 */

interface RateLimitConfig {
  windowMs: number; // Janela de tempo em ms
  max: number; // Máximo de requests na janela
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpar entries expiradas a cada minuto
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Verificar se request está dentro do limite
   */
  async check(key: string, config: RateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const entry = this.store.get(key);

    // Se não existe ou expirou, criar novo
    if (!entry || entry.resetAt < now) {
      this.store.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });

      return {
        allowed: true,
        remaining: config.max - 1,
        resetAt: now + config.windowMs,
      };
    }

    // Incrementar contador
    entry.count++;

    // Verificar se ultrapassou limite
    if (entry.count > config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    return {
      allowed: true,
      remaining: config.max - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Consumir um request (mesmo que check + incrementar)
   */
  async consume(key: string, config: RateLimitConfig): Promise<void> {
    const result = await this.check(key, config);
    
    if (!result.allowed) {
      const waitTime = Math.ceil((result.resetAt - Date.now()) / 1000);
      throw new Error(
        config.message || 
        `Rate limit exceeded. Try again in ${waitTime} seconds.`
      );
    }
  }

  /**
   * Resetar limite para uma key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Limpar entries expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destruir rate limiter
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton
export const rateLimiter = new RateLimiter();

/**
 * Rate Limit Presets
 */
export const RATE_LIMITS = {
  // Geral - API pública
  PUBLIC: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests
    message: 'Too many requests, please try again later.',
  },

  // Autenticação
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas
    message: 'Too many login attempts, please try again in 15 minutes.',
  },

  // Criação de recursos
  CREATE: {
    windowMs: 60 * 1000, // 1 minuto
    max: 20, // 20 criações
    message: 'Too many create requests, please slow down.',
  },

  // Exportação/Download
  EXPORT: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // 10 exports
    message: 'Export limit reached, please try again later.',
  },

  // Email sending
  EMAIL: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // 5 emails
    message: 'Email limit reached.',
  },

  // Upload
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // 10 uploads
    message: 'Upload limit reached.',
  },

  // Search
  SEARCH: {
    windowMs: 60 * 1000, // 1 minuto
    max: 30, // 30 buscas
    message: 'Too many searches.',
  },

  // 2FA
  TWO_FA: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 5, // 5 tentativas
    message: '2FA attempts limit reached. Try again in 5 minutes.',
  },

  // Password reset
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // 3 resets
    message: 'Password reset limit reached.',
  },
};

/**
 * Rate Limit Middleware para tRPC
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (opts: any) => {
    const { ctx, next } = opts;
    
    // Gerar key baseada no user ou IP
    const key = ctx.user?.id 
      ? `user:${ctx.user.id}` 
      : `ip:${ctx.req?.ip || 'unknown'}`;

    // Verificar rate limit
    await rateLimiter.consume(key, config);

    // Continuar se OK
    return next();
  };
}

/**
 * Rate Limit Helper para endpoints específicos
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  await rateLimiter.consume(identifier, config);
}

/**
 * Rate Limit por IP
 */
export async function rateLimitByIp(
  ip: string,
  config: RateLimitConfig = RATE_LIMITS.PUBLIC
): Promise<void> {
  await rateLimiter.consume(`ip:${ip}`, config);
}

/**
 * Rate Limit por User ID
 */
export async function rateLimitByUser(
  userId: number,
  config: RateLimitConfig = RATE_LIMITS.PUBLIC
): Promise<void> {
  await rateLimiter.consume(`user:${userId}`, config);
}

/**
 * Rate Limit por ação específica
 */
export async function rateLimitByAction(
  userId: number,
  action: string,
  config: RateLimitConfig
): Promise<void> {
  await rateLimiter.consume(`user:${userId}:${action}`, config);
}

/**
 * Adaptive Rate Limiting (ajusta limite baseado em comportamento)
 */
export class AdaptiveRateLimiter {
  private baseConfig: RateLimitConfig;
  private suspiciousUsers = new Set<string>();

  constructor(baseConfig: RateLimitConfig) {
    this.baseConfig = baseConfig;
  }

  async check(key: string): Promise<void> {
    const config = this.suspiciousUsers.has(key)
      ? {
          ...this.baseConfig,
          max: Math.floor(this.baseConfig.max / 2), // Reduzir limite pela metade
        }
      : this.baseConfig;

    try {
      await rateLimiter.consume(key, config);
    } catch (error) {
      // Marcar como suspeito após exceder limite
      this.suspiciousUsers.add(key);
      
      // Remover marcação após 1 hora
      setTimeout(() => {
        this.suspiciousUsers.delete(key);
      }, 60 * 60 * 1000);
      
      throw error;
    }
  }
}

/**
 * Distributed Rate Limiting (usando Redis)
 * TODO: Implementar quando Redis estiver configurado
 */
export class RedisRateLimiter {
  // private redis: RedisClient;

  constructor() {
    // this.redis = createRedisClient();
  }

  async check(key: string, config: RateLimitConfig): Promise<boolean> {
    // TODO: Implementar com Redis INCR e EXPIRE
    return true;
  }
}

/**
 * Rate Limit Headers Helper
 * Adiciona headers X-RateLimit-* na resposta
 */
export function getRateLimitHeaders(result: {
  remaining: number;
  resetAt: number;
}) {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    'X-RateLimit-Reset-After': Math.ceil(
      (result.resetAt - Date.now()) / 1000
    ).toString(),
  };
}

/**
 * Exemplo de uso no tRPC:
 * 
 * // No endpoint
 * createTransaction: protectedProcedure
 *   .input(transactionSchema)
 *   .mutation(async ({ ctx, input }) => {
 *     // Rate limit: max 20 transações por minuto
 *     await rateLimitByAction(
 *       ctx.user.id, 
 *       'create_transaction',
 *       RATE_LIMITS.CREATE
 *     );
 *     
 *     // Criar transação...
 *   }),
 * 
 * // Login
 * login: publicProcedure
 *   .input(loginSchema)
 *   .mutation(async ({ ctx, input }) => {
 *     await rateLimitByIp(ctx.req.ip, RATE_LIMITS.LOGIN);
 *     
 *     // Fazer login...
 *   }),
 * 
 * // Export
 * exportData: protectedProcedure
 *   .mutation(async ({ ctx }) => {
 *     await rateLimitByAction(
 *       ctx.user.id,
 *       'export',
 *       RATE_LIMITS.EXPORT
 *     );
 *     
 *     // Exportar dados...
 *   }),
 */

/**
 * Statistics
 */
export function getRateLimitStats() {
  return {
    totalKeys: rateLimiter['store'].size,
    // Mais estatísticas podem ser adicionadas
  };
}
