/**
 * Query Optimization Helpers
 * Best practices e helpers para queries otimizadas
 */

import { sql } from 'drizzle-orm';

/**
 * Batch Loading Helper
 * Carrega múltiplos items de uma vez ao invés de N+1 queries
 */
export class DataLoader<K, V> {
  private cache = new Map<K, Promise<V>>();
  private batch: K[] = [];
  private batchScheduled = false;

  constructor(
    private batchLoadFn: (keys: K[]) => Promise<V[]>,
    private options: {
      maxBatchSize?: number;
      cache?: boolean;
    } = {}
  ) {}

  async load(key: K): Promise<V> {
    const { cache = true } = this.options;

    // Retornar do cache se disponível
    if (cache && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Criar promise e adicionar ao batch
    const promise = new Promise<V>((resolve, reject) => {
      this.batch.push(key);

      if (!this.batchScheduled) {
        this.batchScheduled = true;
        
        // Processar batch no próximo tick
        process.nextTick(() => {
          this.dispatchBatch().catch(reject);
        });
      }
    });

    if (cache) {
      this.cache.set(key, promise);
    }

    return promise;
  }

  private async dispatchBatch() {
    const batch = this.batch;
    this.batch = [];
    this.batchScheduled = false;

    const { maxBatchSize = 100 } = this.options;
    
    // Limitar tamanho do batch
    const limitedBatch = batch.slice(0, maxBatchSize);

    try {
      const values = await this.batchLoadFn(limitedBatch);
      
      // Resolver promises
      limitedBatch.forEach((key, index) => {
        const cachedPromise = this.cache.get(key);
        if (cachedPromise) {
          // Resolver com valor ou rejeitar
          Promise.resolve(values[index]);
        }
      });
    } catch (error) {
      // Rejeitar todas as promises do batch
      limitedBatch.forEach((key) => {
        this.cache.delete(key);
      });
      throw error;
    }
  }

  clear(key?: K) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

/**
 * Select Only What You Need
 * Helper para selecionar apenas colunas necessárias
 */
export const selectOptimized = {
  // Transactions básico (para listas)
  transactionList: {
    id: true,
    amount: true,
    description: true,
    category: true,
    date: true,
    type: true,
  },

  // Transaction completo (para detalhes)
  transactionFull: {
    id: true,
    userId: true,
    amount: true,
    description: true,
    category: true,
    subcategory: true,
    date: true,
    type: true,
    paymentMethod: true,
    tags: true,
    notes: true,
    recurring: true,
    createdAt: true,
    updatedAt: true,
  },

  // User básico
  userBasic: {
    id: true,
    name: true,
    email: true,
  },

  // Goal básico
  goalBasic: {
    id: true,
    name: true,
    targetAmount: true,
    currentAmount: true,
    deadline: true,
  },
};

/**
 * Query com Aggregation Otimizada
 */
export const aggregationQueries = {
  /**
   * Soma total de transações por categoria
   */
  sumByCategory: (userId: number, startDate: Date, endDate: Date) => sql`
    SELECT 
      category,
      SUM(amount) as total,
      COUNT(*) as count
    FROM transactions
    WHERE user_id = ${userId}
      AND date BETWEEN ${startDate} AND ${endDate}
    GROUP BY category
    ORDER BY total DESC
  `,

  /**
   * Média de gastos por mês
   */
  avgMonthlyExpense: (userId: number, months: number = 6) => sql`
    SELECT 
      AVG(monthly_total) as avg_expense
    FROM (
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(amount) as monthly_total
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'expense'
        AND date >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
      GROUP BY month
    ) as monthly_totals
  `,

  /**
   * Top categorias por período
   */
  topCategories: (userId: number, limit: number = 10) => sql`
    SELECT 
      category,
      SUM(amount) as total,
      COUNT(*) as transaction_count,
      AVG(amount) as avg_amount
    FROM transactions
    WHERE user_id = ${userId}
      AND type = 'expense'
    GROUP BY category
    ORDER BY total DESC
    LIMIT ${limit}
  `,
};

/**
 * Index Suggestions
 * Sugestões de índices para performance
 */
export const indexSuggestions = {
  transactions: [
    'CREATE INDEX idx_transactions_user_date ON transactions(user_id, date)',
    'CREATE INDEX idx_transactions_user_category ON transactions(user_id, category)',
    'CREATE INDEX idx_transactions_user_type_date ON transactions(user_id, type, date)',
    'CREATE INDEX idx_transactions_date ON transactions(date)',
    'CREATE INDEX idx_transactions_amount ON transactions(amount)',
  ],
  
  goals: [
    'CREATE INDEX idx_goals_user_status ON goals(user_id, status)',
    'CREATE INDEX idx_goals_user_deadline ON goals(user_id, deadline)',
  ],
  
  budgets: [
    'CREATE INDEX idx_budgets_user_period ON budgets(user_id, year, month)',
    'CREATE INDEX idx_budgets_user_category ON budgets(user_id, category)',
  ],
  
  auditLogs: [
    'CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at)',
    'CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
    'CREATE INDEX idx_audit_logs_action ON audit_logs(action)',
  ],
};

/**
 * Query Performance Tips
 */
export const performanceTips = {
  /**
   * 1. Use SELECT específico ao invés de SELECT *
   */
  bad: `SELECT * FROM transactions WHERE user_id = 1`,
  good: `SELECT id, amount, description FROM transactions WHERE user_id = 1`,

  /**
   * 2. Use LIMIT sempre que possível
   */
  bad2: `SELECT * FROM transactions WHERE user_id = 1`,
  good2: `SELECT * FROM transactions WHERE user_id = 1 LIMIT 100`,

  /**
   * 3. Use índices compostos para queries comuns
   */
  bad3: `WHERE user_id = 1 AND date > '2024-01-01'`,
  good3: `-- Com índice: (user_id, date)`,

  /**
   * 4. Evite OR em WHERE, use UNION quando apropriado
   */
  bad4: `WHERE category = 'food' OR category = 'transport'`,
  good4: `WHERE category IN ('food', 'transport')`,

  /**
   * 5. Use EXPLAIN para analisar queries lentas
   */
  analyze: `EXPLAIN SELECT * FROM transactions WHERE user_id = 1`,

  /**
   * 6. Denormalize quando necessário
   */
  example: `-- Ao invés de JOIN toda vez, cache o nome da categoria na transaction`,

  /**
   * 7. Use cursor pagination para datasets grandes
   */
  bad5: `LIMIT 1000000, 20`, // Muito lento
  good5: `WHERE id > last_id ORDER BY id LIMIT 20`, // Rápido

  /**
   * 8. Agregações com índices
   */
  bad6: `SELECT COUNT(*) FROM transactions`, // Scan completo
  good6: `SELECT COUNT(*) FROM transactions WHERE user_id = 1`, // Usa índice
};

/**
 * Query Batch Executor
 * Executa múltiplas queries em paralelo
 */
export async function executeBatch<T>(
  queries: (() => Promise<T>)[]
): Promise<T[]> {
  return Promise.all(queries.map((query) => query()));
}

/**
 * Query com timeout
 */
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    ),
  ]);
}

/**
 * Memoization para queries
 */
const queryCache = new Map<string, { result: any; timestamp: number }>();

export async function memoizedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttlMs: number = 60000
): Promise<T> {
  const cached = queryCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.result;
  }

  const result = await queryFn();
  queryCache.set(key, { result, timestamp: Date.now() });
  
  return result;
}

/**
 * Cleanup old cache entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > 300000) { // 5 minutos
      queryCache.delete(key);
    }
  }
}, 60000); // Limpar a cada 1 minuto

/**
 * Performance Monitoring
 */
export async function monitorQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`[SLOW QUERY] ${name} took ${duration}ms`);
    } else {
      console.log(`[QUERY] ${name} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    console.error(`[QUERY ERROR] ${name}:`, error);
    throw error;
  }
}

/**
 * Example Usage:
 * 
 * // DataLoader
 * const userLoader = new DataLoader(
 *   async (userIds) => {
 *     return await db.select()
 *       .from(schema.users)
 *       .where(inArray(schema.users.id, userIds));
 *   }
 * );
 * 
 * // Batch executor
 * const [users, transactions, goals] = await executeBatch([
 *   () => getUsers(),
 *   () => getTransactions(),
 *   () => getGoals(),
 * ]);
 * 
 * // Monitored query
 * const result = await monitorQuery('getUserTransactions', async () => {
 *   return await db.select().from(schema.transactions).where(...);
 * });
 */
