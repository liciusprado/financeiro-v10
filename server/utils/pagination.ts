/**
 * Pagination Helper
 * Sistema de paginação otimizado com cursor e offset
 */

import { SQL } from 'drizzle-orm';

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string | number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string | number;
    prevCursor?: string | number;
  };
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    limit: number;
    hasNext: boolean;
    nextCursor?: string | number;
  };
}

/**
 * Offset-based Pagination (tradicional)
 * Melhor para: Páginas com números fixos
 */
export function getPaginationParams(params: PaginationParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
}

/**
 * Calcular metadados de paginação
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginatedResult<any>['pagination'] {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Helper para fazer paginação completa
 */
export async function paginate<T>(
  query: any, // Drizzle query
  countQuery: any, // Query para contar total
  params: PaginationParams
): Promise<PaginatedResult<T>> {
  const { page, limit, offset } = getPaginationParams(params);

  // Buscar dados paginados
  const data = await query.limit(limit).offset(offset);

  // Contar total (pode ser cacheado)
  const countResult = await countQuery;
  const total = countResult[0]?.count || 0;

  return {
    data,
    pagination: buildPaginationMeta(page, limit, total),
  };
}

/**
 * Cursor-based Pagination (melhor performance)
 * Melhor para: Infinite scroll, feeds em tempo real
 * Vantagens: Não precisa contar total, mais rápido para grandes datasets
 */
export async function cursorPaginate<T extends { id: number | string }>(
  query: any,
  params: {
    limit?: number;
    cursor?: string | number;
    orderDirection?: 'asc' | 'desc';
  }
): Promise<CursorPaginationResult<T>> {
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  
  // Buscar limit + 1 para saber se tem próxima página
  const data = await query.limit(limit + 1);

  // Verificar se tem próxima página
  const hasNext = data.length > limit;
  
  // Remover item extra se houver
  if (hasNext) {
    data.pop();
  }

  // Próximo cursor é o ID do último item
  const nextCursor = hasNext && data.length > 0 
    ? data[data.length - 1].id 
    : undefined;

  return {
    data,
    pagination: {
      limit,
      hasNext,
      nextCursor,
    },
  };
}

/**
 * Keyset Pagination (melhor performance para ordenação)
 * Usa múltiplas colunas para cursor estável
 */
export interface KeysetParams {
  limit?: number;
  afterId?: number;
  afterValue?: any;
  orderBy: string;
  orderDirection?: 'asc' | 'desc';
}

export async function keysetPaginate<T>(
  query: any,
  params: KeysetParams
): Promise<CursorPaginationResult<T>> {
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  
  // Aplicar cursor se fornecido
  // TODO: Implementar WHERE clause baseado no cursor
  
  const data = await query.limit(limit + 1);
  
  const hasNext = data.length > limit;
  if (hasNext) {
    data.pop();
  }

  return {
    data,
    pagination: {
      limit,
      hasNext,
      nextCursor: hasNext && data.length > 0 ? data[data.length - 1].id : undefined,
    },
  };
}

/**
 * Infinite Scroll Helper
 * Facilita implementação de scroll infinito no frontend
 */
export function buildInfiniteScrollResponse<T>(
  data: T[],
  limit: number,
  getNextCursor: (lastItem: T) => string | number
) {
  const hasMore = data.length === limit;
  const nextCursor = hasMore && data.length > 0 ? getNextCursor(data[data.length - 1]) : null;

  return {
    items: data,
    nextCursor,
    hasMore,
  };
}

/**
 * Validar parâmetros de paginação
 */
export function validatePaginationParams(params: PaginationParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (params.page !== undefined) {
    if (params.page < 1) {
      errors.push('Page must be >= 1');
    }
    if (params.page > 10000) {
      errors.push('Page too high (max: 10000)');
    }
  }

  if (params.limit !== undefined) {
    if (params.limit < 1) {
      errors.push('Limit must be >= 1');
    }
    if (params.limit > 100) {
      errors.push('Limit too high (max: 100)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Zod schemas para validação tRPC
 */
import { z } from 'zod';

export const offsetPaginationSchema = z.object({
  page: z.number().min(1).max(10000).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

export const cursorPaginationSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  cursor: z.union([z.string(), z.number()]).optional(),
});

/**
 * Exemplo de uso no tRPC:
 * 
 * // Offset pagination
 * getTransactions: protectedProcedure
 *   .input(z.object({
 *     pagination: offsetPaginationSchema,
 *     filters: z.object({...}).optional(),
 *   }))
 *   .query(async ({ ctx, input }) => {
 *     const { page, limit, offset } = getPaginationParams(input.pagination);
 *     
 *     const query = db.select()
 *       .from(schema.transactions)
 *       .where(eq(schema.transactions.userId, ctx.user.id));
 *     
 *     const countQuery = db.select({ count: count() })
 *       .from(schema.transactions)
 *       .where(eq(schema.transactions.userId, ctx.user.id));
 *     
 *     return await paginate(query, countQuery, input.pagination);
 *   }),
 * 
 * // Cursor pagination
 * getTransactionsFeed: protectedProcedure
 *   .input(cursorPaginationSchema)
 *   .query(async ({ ctx, input }) => {
 *     let query = db.select()
 *       .from(schema.transactions)
 *       .where(eq(schema.transactions.userId, ctx.user.id))
 *       .orderBy(desc(schema.transactions.createdAt));
 *     
 *     if (input.cursor) {
 *       query = query.where(lt(schema.transactions.id, input.cursor));
 *     }
 *     
 *     return await cursorPaginate(query, input);
 *   }),
 */

/**
 * Frontend React Query Helper
 */
export const frontendPaginationExample = `
// Offset pagination
const { data, isLoading } = useQuery({
  queryKey: ['transactions', page],
  queryFn: () => client.transactions.list.query({ 
    pagination: { page, limit: 20 } 
  }),
});

// Infinite scroll (cursor)
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['transactions-feed'],
  queryFn: ({ pageParam }) => 
    client.transactions.feed.query({ 
      cursor: pageParam,
      limit: 20,
    }),
  getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
});
`;
