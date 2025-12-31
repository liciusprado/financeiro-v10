/**
 * Credit Cards & Installments Routes
 * Endpoints tRPC para cartões e parcelamentos
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import * as creditCardService from '../services/creditCardService';
import * as installmentService from '../services/installmentService';

// ========== SCHEMAS ==========

const createCardSchema = z.object({
  name: z.string().min(1).max(100),
  lastDigits: z.string().length(4),
  brand: z.enum(['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'other']),
  creditLimit: z.number().positive(),
  closingDay: z.number().min(1).max(31),
  dueDay: z.number().min(1).max(31),
  color: z.string().optional(),
  icon: z.string().optional(),
  notes: z.string().optional(),
});

const updateCardSchema = z.object({
  cardId: z.number(),
  name: z.string().min(1).max(100).optional(),
  creditLimit: z.number().positive().optional(),
  closingDay: z.number().min(1).max(31).optional(),
  dueDay: z.number().min(1).max(31).optional(),
  isActive: z.boolean().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
});

const createInstallmentSchema = z.object({
  description: z.string().min(1).max(200),
  totalAmount: z.number().positive(),
  totalInstallments: z.number().min(2).max(48),
  startDate: z.date(),
  cardId: z.number().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  interestRate: z.number().min(0).max(10).optional(),
});

const simulateInstallmentSchema = z.object({
  totalAmount: z.number().positive(),
  installments: z.number().min(2).max(48),
  interestRate: z.number().min(0).max(10).optional(),
});

// ========== CREDIT CARDS ROUTER ==========

export const creditCardsRouter = router({
  /**
   * Criar cartão de crédito
   */
  create: protectedProcedure
    .input(createCardSchema)
    .mutation(async ({ ctx, input }) => {
      return await creditCardService.createCreditCard({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Listar cartões
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await creditCardService.getUserCreditCards(ctx.user.id);
    }),

  /**
   * Buscar cartão por ID
   */
  getById: protectedProcedure
    .input(z.object({ cardId: z.number() }))
    .query(async ({ input }) => {
      return await creditCardService.getCreditCard(input.cardId);
    }),

  /**
   * Atualizar cartão
   */
  update: protectedProcedure
    .input(updateCardSchema)
    .mutation(async ({ input }) => {
      const { cardId, ...data } = input;
      return await creditCardService.updateCreditCard(cardId, data);
    }),

  /**
   * Deletar cartão
   */
  delete: protectedProcedure
    .input(z.object({ cardId: z.number() }))
    .mutation(async ({ input }) => {
      await creditCardService.deleteCreditCard(input.cardId);
      return { success: true };
    }),

  /**
   * Buscar faturas do cartão
   */
  getStatements: protectedProcedure
    .input(z.object({
      cardId: z.number(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await creditCardService.getCardStatements(
        input.cardId,
        input.limit
      );
    }),

  /**
   * Fechar fatura
   */
  closeStatement: protectedProcedure
    .input(z.object({ statementId: z.number() }))
    .mutation(async ({ input }) => {
      return await creditCardService.closeStatement(input.statementId);
    }),

  /**
   * Pagar fatura
   */
  payStatement: protectedProcedure
    .input(z.object({
      statementId: z.number(),
      amount: z.number().positive(),
      paymentDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      return await creditCardService.payStatement(
        input.statementId,
        input.amount,
        input.paymentDate
      );
    }),

  /**
   * Próximas faturas a vencer
   */
  upcomingStatements: protectedProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return await creditCardService.getUpcomingStatements(
        ctx.user.id,
        input.days
      );
    }),

  /**
   * Dashboard de cartões
   */
  dashboard: protectedProcedure
    .query(async ({ ctx }) => {
      return await creditCardService.getCardsDashboard(ctx.user.id);
    }),

  /**
   * Limite disponível
   */
  availableLimit: protectedProcedure
    .input(z.object({ cardId: z.number() }))
    .query(async ({ input }) => {
      return await creditCardService.getAvailableLimit(input.cardId);
    }),
});

// ========== INSTALLMENTS ROUTER ==========

export const installmentsRouter = router({
  /**
   * Criar parcelamento
   */
  create: protectedProcedure
    .input(createInstallmentSchema)
    .mutation(async ({ ctx, input }) => {
      return await installmentService.createInstallment({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Listar parcelamentos
   */
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'completed', 'cancelled']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await installmentService.getUserInstallments(
        ctx.user.id,
        input.status
      );
    }),

  /**
   * Buscar parcelamento por ID
   */
  getById: protectedProcedure
    .input(z.object({ installmentId: z.number() }))
    .query(async ({ input }) => {
      return await installmentService.getInstallment(input.installmentId);
    }),

  /**
   * Buscar parcelas do parcelamento
   */
  getPayments: protectedProcedure
    .input(z.object({ installmentId: z.number() }))
    .query(async ({ input }) => {
      return await installmentService.getInstallmentPayments(
        input.installmentId
      );
    }),

  /**
   * Pagar parcela
   */
  payPayment: protectedProcedure
    .input(z.object({
      paymentId: z.number(),
      paymentDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      return await installmentService.payInstallmentPayment(
        input.paymentId,
        input.paymentDate
      );
    }),

  /**
   * Cancelar parcelamento
   */
  cancel: protectedProcedure
    .input(z.object({ installmentId: z.number() }))
    .mutation(async ({ input }) => {
      await installmentService.cancelInstallment(input.installmentId);
      return { success: true };
    }),

  /**
   * Próximas parcelas a vencer
   */
  upcomingPayments: protectedProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return await installmentService.getUpcomingPayments(
        ctx.user.id,
        input.days
      );
    }),

  /**
   * Dashboard de parcelamentos
   */
  dashboard: protectedProcedure
    .query(async ({ ctx }) => {
      return await installmentService.getInstallmentsDashboard(ctx.user.id);
    }),

  /**
   * Simular parcelamento
   */
  simulate: protectedProcedure
    .input(simulateInstallmentSchema)
    .query(({ input }) => {
      return installmentService.simulateInstallment(
        input.totalAmount,
        input.installments,
        input.interestRate
      );
    }),

  /**
   * Antecipar parcelas
   */
  anticipate: protectedProcedure
    .input(z.object({
      installmentId: z.number(),
      paymentIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      return await installmentService.anticipatePayments(
        input.installmentId,
        input.paymentIds
      );
    }),
});

/**
 * Exemplo de uso no frontend:
 * 
 * // Criar cartão
 * const card = await client.creditCards.create.mutate({
 *   name: 'Nubank',
 *   lastDigits: '1234',
 *   brand: 'mastercard',
 *   creditLimit: 5000,
 *   closingDay: 10,
 *   dueDay: 20,
 *   color: '#8A05BE',
 * });
 * 
 * // Listar cartões
 * const cards = await client.creditCards.list.query();
 * 
 * // Dashboard
 * const dashboard = await client.creditCards.dashboard.query();
 * 
 * // Criar parcelamento
 * const installment = await client.installments.create.mutate({
 *   description: 'iPhone 15',
 *   totalAmount: 7200,
 *   totalInstallments: 12,
 *   startDate: new Date(),
 *   cardId: 1,
 * });
 * 
 * // Simular parcelamento com juros
 * const simulation = await client.installments.simulate.query({
 *   totalAmount: 10000,
 *   installments: 12,
 *   interestRate: 2.5,
 * });
 * 
 * // Pagar parcela
 * await client.installments.payPayment.mutate({
 *   paymentId: 123,
 * });
 */
