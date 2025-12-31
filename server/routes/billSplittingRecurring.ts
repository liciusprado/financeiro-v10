/**
 * Bill Splitting & Recurring Routes
 * Endpoints tRPC para divisão de contas e recorrências
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import * as billSplitService from '../services/billSplitService';
import * as recurringService from '../services/recurringService';

// ========== SCHEMAS ==========

const participantSchema = z.object({
  userId: z.number().optional(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  amount: z.number().positive(),
});

const createBillSplitSchema = z.object({
  title: z.string().min(1).max(200),
  totalAmount: z.number().positive(),
  splitDate: z.date(),
  participants: z.array(participantSchema).min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  splitMethod: z.enum(['equal', 'custom']).default('equal'),
});

const recordPaymentSchema = z.object({
  participantId: z.number(),
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
  paymentDate: z.date().optional(),
  notes: z.string().optional(),
});

const splitCalculationSchema = z.object({
  totalAmount: z.number().positive(),
  method: z.enum(['equal', 'percentage', 'shares']),
  values: z.array(z.number()),
});

// ========== BILL SPLITTING ROUTER ==========

export const billSplittingRouter = router({
  /**
   * Criar divisão de conta
   */
  create: protectedProcedure
    .input(createBillSplitSchema)
    .mutation(async ({ ctx, input }) => {
      return await billSplitService.createBillSplit({
        ownerId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Listar minhas divisões (como dono)
   */
  myBillSplits: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await billSplitService.getMyBillSplits(
        ctx.user.id,
        input.status
      );
    }),

  /**
   * Buscar divisão por ID
   */
  getById: protectedProcedure
    .input(z.object({ splitId: z.number() }))
    .query(async ({ input }) => {
      return await billSplitService.getBillSplit(input.splitId);
    }),

  /**
   * Listar participantes
   */
  getParticipants: protectedProcedure
    .input(z.object({ splitId: z.number() }))
    .query(async ({ input }) => {
      return await billSplitService.getSplitParticipants(input.splitId);
    }),

  /**
   * Registrar pagamento
   */
  recordPayment: protectedProcedure
    .input(recordPaymentSchema)
    .mutation(async ({ input }) => {
      return await billSplitService.recordSplitPayment(input);
    }),

  /**
   * Minhas dívidas (o que devo)
   */
  myDebts: protectedProcedure
    .query(async ({ ctx }) => {
      return await billSplitService.getMyDebts(ctx.user.id);
    }),

  /**
   * Meus créditos (o que me devem)
   */
  myCredits: protectedProcedure
    .query(async ({ ctx }) => {
      return await billSplitService.getMyCredits(ctx.user.id);
    }),

  /**
   * Cancelar divisão
   */
  cancel: protectedProcedure
    .input(z.object({ splitId: z.number() }))
    .mutation(async ({ input }) => {
      await billSplitService.cancelBillSplit(input.splitId);
      return { success: true };
    }),

  /**
   * Dashboard
   */
  dashboard: protectedProcedure
    .query(async ({ ctx }) => {
      return await billSplitService.getSplitsDashboard(ctx.user.id);
    }),

  /**
   * Enviar lembrete de pagamento
   */
  sendReminder: protectedProcedure
    .input(z.object({ participantId: z.number() }))
    .mutation(async ({ input }) => {
      return await billSplitService.sendPaymentReminder(
        input.participantId
      );
    }),

  /**
   * Calcular divisão (helper)
   */
  calculate: protectedProcedure
    .input(splitCalculationSchema)
    .query(({ input }) => {
      switch (input.method) {
        case 'equal':
          return billSplitService.splitEqually(
            input.totalAmount,
            input.values[0]
          );
        case 'percentage':
          return billSplitService.splitByPercentage(
            input.totalAmount,
            input.values
          );
        case 'shares':
          return billSplitService.splitByShares(
            input.totalAmount,
            input.values
          );
        default:
          throw new Error('Método inválido');
      }
    }),
});

// ========== RECURRING PATTERNS ROUTER ==========

export const recurringRouter = router({
  /**
   * Detectar padrões recorrentes
   */
  detect: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await recurringService.detectRecurringPatterns(ctx.user.id);
    }),

  /**
   * Listar padrões ativos
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await recurringService.getActivePatterns(ctx.user.id);
    }),

  /**
   * Próximas recorrências previstas
   */
  upcoming: protectedProcedure
    .input(z.object({ days: z.number().optional().default(30) }))
    .query(async ({ ctx, input }) => {
      return await recurringService.getUpcomingRecurring(
        ctx.user.id,
        input.days
      );
    }),

  /**
   * Confirmar padrão
   */
  confirm: protectedProcedure
    .input(z.object({ patternId: z.number() }))
    .mutation(async ({ input }) => {
      await recurringService.confirmPattern(input.patternId);
      return { success: true };
    }),

  /**
   * Desativar padrão
   */
  deactivate: protectedProcedure
    .input(z.object({ patternId: z.number() }))
    .mutation(async ({ input }) => {
      await recurringService.deactivatePattern(input.patternId);
      return { success: true };
    }),

  /**
   * Atualizar padrão com nova ocorrência
   */
  updateOccurrence: protectedProcedure
    .input(z.object({
      patternId: z.number(),
      transactionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await recurringService.updatePatternWithOccurrence(
        input.patternId,
        input.transactionId
      );
      return { success: true };
    }),

  /**
   * Dashboard
   */
  dashboard: protectedProcedure
    .query(async ({ ctx }) => {
      return await recurringService.getRecurringDashboard(ctx.user.id);
    }),

  /**
   * Sugerir automação
   */
  suggestAutomation: protectedProcedure
    .input(z.object({ patternId: z.number() }))
    .query(async ({ input }) => {
      return await recurringService.suggestAutomation(input.patternId);
    }),
});

/**
 * Exemplo de uso no frontend:
 * 
 * // BILL SPLITTING
 * 
 * // Criar divisão de conta
 * const split = await client.billSplitting.create.mutate({
 *   title: 'Jantar Restaurante',
 *   totalAmount: 240,
 *   splitDate: new Date(),
 *   splitMethod: 'equal',
 *   participants: [
 *     { name: 'João', email: 'joao@email.com', amount: 0 },
 *     { name: 'Maria', email: 'maria@email.com', amount: 0 },
 *     { name: 'Pedro', phone: '11999887766', amount: 0 },
 *   ],
 *   category: 'Alimentação',
 * });
 * 
 * // Calcular divisão
 * const calculation = await client.billSplitting.calculate.query({
 *   totalAmount: 240,
 *   method: 'equal',
 *   values: [4], // 4 pessoas
 * });
 * 
 * // Ver minhas dívidas
 * const debts = await client.billSplitting.myDebts.query();
 * 
 * // Ver quem me deve
 * const credits = await client.billSplitting.myCredits.query();
 * 
 * // Registrar pagamento
 * await client.billSplitting.recordPayment.mutate({
 *   participantId: 1,
 *   amount: 60,
 *   paymentMethod: 'pix',
 * });
 * 
 * // Enviar lembrete
 * await client.billSplitting.sendReminder.mutate({
 *   participantId: 1,
 * });
 * 
 * // Dashboard
 * const dashboard = await client.billSplitting.dashboard.query();
 * 
 * // RECORRÊNCIAS
 * 
 * // Detectar padrões
 * const detection = await client.recurring.detect.mutate();
 * console.log(`Detectados ${detection.detected} padrões`);
 * 
 * // Listar padrões ativos
 * const patterns = await client.recurring.list.query();
 * 
 * // Próximas recorrências (7 dias)
 * const upcoming = await client.recurring.upcoming.query({ days: 7 });
 * 
 * // Confirmar padrão
 * await client.recurring.confirm.mutate({ patternId: 1 });
 * 
 * // Dashboard
 * const recurringDashboard = await client.recurring.dashboard.query();
 * 
 * // Sugerir automação
 * const suggestion = await client.recurring.suggestAutomation.query({
 *   patternId: 1,
 * });
 * if (suggestion.canAutomate) {
 *   console.log(suggestion.suggestion);
 * }
 */
