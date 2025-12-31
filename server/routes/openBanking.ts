/**
 * Open Banking Routes (Belvo Integration)
 * tRPC routes for bank connections and transaction imports
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { BelvoService } from '../services/belvoService';
import {
  fetchTransactionsFromBelvo,
  fetchAccountsFromBelvo,
  importBankTransaction,
  getBankConnections,
  getBankAccounts,
  getImportedTransactions,
  createBankConnection,
  updateBankConnection,
  deleteBankConnection,
  syncBankTransactions,
} from '../bankIntegration';

const belvoService = new BelvoService();

export const openBankingRouter = router({
  // ========== INSTITUTIONS ==========

  /**
   * Listar instituições financeiras disponíveis
   */
  listInstitutions: protectedProcedure
    .input(
      z.object({
        country: z.string().default('BR'),
      })
    )
    .query(async ({ input }) => {
      try {
        const institutions = await belvoService.listInstitutions(input.country);
        return { success: true, institutions };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar instituições: ' + error.message,
        });
      }
    }),

  // ========== BANK CONNECTIONS ==========

  /**
   * Listar conexões bancárias do usuário
   */
  listConnections: protectedProcedure.query(async ({ ctx }) => {
    try {
      const connections = await getBankConnections(ctx.user.id);
      return { success: true, connections };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao buscar conexões: ' + error.message,
      });
    }
  }),

  /**
   * Criar nova conexão bancária
   */
  createConnection: protectedProcedure
    .input(
      z.object({
        institution: z.string(),
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const link = await belvoService.createLink(
          input.institution,
          input.username,
          input.password,
          ctx.user.id
        );

        const connection = await createBankConnection({
          userId: ctx.user.id,
          belvoLinkId: link.id,
          institutionName: link.institution,
          institutionCode: input.institution,
          status: 'active',
        });

        // Sincronizar transações iniciais
        await syncBankTransactions(connection.id);

        return { success: true, connection };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao criar conexão: ' + error.message,
        });
      }
    }),

  /**
   * Atualizar status de conexão
   */
  updateConnection: protectedProcedure
    .input(
      z.object({
        connectionId: z.number(),
        status: z.enum(['active', 'invalid', 'error', 'pending']),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await updateBankConnection(input.connectionId, {
          status: input.status,
          errorMessage: input.errorMessage,
        });

        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao atualizar conexão: ' + error.message,
        });
      }
    }),

  /**
   * Deletar conexão bancária
   */
  deleteConnection: protectedProcedure
    .input(
      z.object({
        connectionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteBankConnection(input.connectionId);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao deletar conexão: ' + error.message,
        });
      }
    }),

  // ========== BANK ACCOUNTS ==========

  /**
   * Listar contas bancárias
   */
  listAccounts: protectedProcedure
    .input(
      z.object({
        connectionId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const accounts = await getBankAccounts(ctx.user.id, input.connectionId);
        return { success: true, accounts };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar contas: ' + error.message,
        });
      }
    }),

  /**
   * Sincronizar contas de uma conexão
   */
  syncAccounts: protectedProcedure
    .input(
      z.object({
        connectionId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const accounts = await fetchAccountsFromBelvo(input.connectionId);
        return { success: true, accounts };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao sincronizar contas: ' + error.message,
        });
      }
    }),

  // ========== TRANSACTIONS ==========

  /**
   * Listar transações importadas
   */
  listImportedTransactions: protectedProcedure
    .input(
      z.object({
        connectionId: z.number().optional(),
        accountId: z.number().optional(),
        status: z.enum(['pending', 'imported', 'ignored', 'error']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const transactions = await getImportedTransactions({
          userId: ctx.user.id,
          connectionId: input.connectionId,
          accountId: input.accountId,
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        });

        return { success: true, transactions };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar transações: ' + error.message,
        });
      }
    }),

  /**
   * Sincronizar transações de uma conexão
   */
  syncTransactions: protectedProcedure
    .input(
      z.object({
        connectionId: z.number(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await syncBankTransactions(
          input.connectionId,
          input.dateFrom,
          input.dateTo
        );

        return {
          success: true,
          transactionsFetched: result.fetched,
          transactionsImported: result.imported,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao sincronizar transações: ' + error.message,
        });
      }
    }),

  /**
   * Importar transação para o sistema
   */
  importTransaction: protectedProcedure
    .input(
      z.object({
        transactionId: z.number(),
        categoryId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entry = await importBankTransaction(
          input.transactionId,
          ctx.user.id,
          input.categoryId,
          input.notes
        );

        return { success: true, entry };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao importar transação: ' + error.message,
        });
      }
    }),

  /**
   * Importar múltiplas transações em lote
   */
  importBulkTransactions: protectedProcedure
    .input(
      z.object({
        transactionIds: z.array(z.number()),
        categoryId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const results = [];
        
        for (const transactionId of input.transactionIds) {
          try {
            const entry = await importBankTransaction(
              transactionId,
              ctx.user.id,
              input.categoryId
            );
            results.push({ transactionId, success: true, entry });
          } catch (error: any) {
            results.push({
              transactionId,
              success: false,
              error: error.message,
            });
          }
        }

        const successCount = results.filter((r) => r.success).length;

        return {
          success: true,
          imported: successCount,
          total: input.transactionIds.length,
          results,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao importar transações: ' + error.message,
        });
      }
    }),

  /**
   * Ignorar transação (marcar como não importar)
   */
  ignoreTransaction: protectedProcedure
    .input(
      z.object({
        transactionId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // TODO: Implementar na bankIntegration
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao ignorar transação: ' + error.message,
        });
      }
    }),

  // ========== STATISTICS ==========

  /**
   * Estatísticas de importação
   */
  getImportStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      // TODO: Implementar estatísticas detalhadas
      const connections = await getBankConnections(ctx.user.id);
      const transactions = await getImportedTransactions({
        userId: ctx.user.id,
        limit: 1000,
      });

      const stats = {
        totalConnections: connections.length,
        activeConnections: connections.filter((c) => c.status === 'active').length,
        totalTransactions: transactions.length,
        pendingTransactions: transactions.filter((t) => t.importStatus === 'pending')
          .length,
        importedTransactions: transactions.filter((t) => t.importStatus === 'imported')
          .length,
        lastSync: connections[0]?.lastSync || null,
      };

      return { success: true, stats };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao buscar estatísticas: ' + error.message,
      });
    }
  }),
});
