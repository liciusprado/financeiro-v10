/**
 * Investments & Loans Routes
 * Endpoints tRPC para investimentos e empréstimos
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import * as investmentService from '../services/investmentService';
import * as loanService from '../services/loanService';

// ========== SCHEMAS ==========

const createInvestmentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string(),
  investedAmount: z.number().positive(),
  broker: z.string().optional(),
  ticker: z.string().optional(),
  maturityDate: z.date().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  liquidity: z.enum(['daily', 'monthly', 'maturity']).optional(),
  taxRegime: z.enum(['progressive', 'regressive', 'exempt']).optional(),
  notes: z.string().optional(),
});

const investmentTransactionSchema = z.object({
  investmentId: z.number(),
  type: z.enum(['buy', 'sell', 'dividend', 'interest', 'tax', 'fee']),
  amount: z.number(),
  quantity: z.number().optional(),
  pricePerUnit: z.number().optional(),
  transactionDate: z.date(),
  description: z.string().optional(),
});

const createLoanSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['personal', 'home', 'car', 'education', 'business', 'other']),
  principalAmount: z.number().positive(),
  interestRate: z.number().min(0).max(50),
  totalInstallments: z.number().min(1).max(600),
  amortizationType: z.enum(['price', 'sac', 'american']),
  startDate: z.date(),
  creditor: z.string().optional(),
  notes: z.string().optional(),
});

const simulateLoanSchema = z.object({
  principal: z.number().positive(),
  annualRate: z.number().min(0).max(50),
  installments: z.number().min(1).max(600),
  type: z.enum(['price', 'sac', 'american']),
});

// ========== INVESTMENTS ROUTER ==========

export const investmentsRouter = router({
  /**
   * Criar investimento
   */
  create: protectedProcedure
    .input(createInvestmentSchema)
    .mutation(async ({ ctx, input }) => {
      return await investmentService.createInvestment({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Listar investimentos
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await investmentService.getUserInvestments(ctx.user.id);
    }),

  /**
   * Buscar investimento por ID
   */
  getById: protectedProcedure
    .input(z.object({ investmentId: z.number() }))
    .query(async ({ input }) => {
      return await investmentService.getInvestment(input.investmentId);
    }),

  /**
   * Adicionar transação
   */
  addTransaction: protectedProcedure
    .input(investmentTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      return await investmentService.addInvestmentTransaction({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Listar transações
   */
  getTransactions: protectedProcedure
    .input(z.object({ investmentId: z.number() }))
    .query(async ({ input }) => {
      return await investmentService.getInvestmentTransactions(
        input.investmentId
      );
    }),

  /**
   * Atualizar valor
   */
  updateValue: protectedProcedure
    .input(z.object({
      investmentId: z.number(),
      newValue: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return await investmentService.updateInvestmentValue(
        input.investmentId,
        input.newValue
      );
    }),

  /**
   * Calcular IR
   */
  calculateTax: protectedProcedure
    .input(z.object({
      investmentType: z.string(),
      profitAmount: z.number(),
      holdingPeriodDays: z.number(),
      taxRegime: z.enum(['progressive', 'regressive', 'exempt']),
    }))
    .query(({ input }) => {
      return investmentService.calculateInvestmentTax(
        input.investmentType,
        input.profitAmount,
        input.holdingPeriodDays,
        input.taxRegime
      );
    }),

  /**
   * Listar impostos pendentes
   */
  pendingTaxes: protectedProcedure
    .query(async ({ ctx }) => {
      return await investmentService.getPendingTaxes(ctx.user.id);
    }),

  /**
   * Pagar imposto
   */
  payTax: protectedProcedure
    .input(z.object({
      taxId: z.number(),
      paymentDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      await investmentService.payInvestmentTax(
        input.taxId,
        input.paymentDate
      );
      return { success: true };
    }),

  /**
   * Dashboard
   */
  dashboard: protectedProcedure
    .query(async ({ ctx }) => {
      return await investmentService.getInvestmentsDashboard(ctx.user.id);
    }),

  /**
   * Sugestão de rebalanceamento
   */
  rebalancingSuggestion: protectedProcedure
    .query(async ({ ctx }) => {
      return await investmentService.getRebalancingSuggestion(ctx.user.id);
    }),

  /**
   * Simular venda
   */
  simulateSale: protectedProcedure
    .input(z.object({
      investmentId: z.number(),
      saleAmount: z.number().positive(),
    }))
    .query(async ({ input }) => {
      return await investmentService.simulateSale(
        input.investmentId,
        input.saleAmount
      );
    }),
});

// ========== LOANS ROUTER ==========

export const loansRouter = router({
  /**
   * Criar empréstimo
   */
  create: protectedProcedure
    .input(createLoanSchema)
    .mutation(async ({ ctx, input }) => {
      return await loanService.createLoan({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Listar empréstimos
   */
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'paid_off', 'defaulted']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await loanService.getUserLoans(ctx.user.id, input.status);
    }),

  /**
   * Buscar empréstimo por ID
   */
  getById: protectedProcedure
    .input(z.object({ loanId: z.number() }))
    .query(async ({ input }) => {
      return await loanService.getLoan(input.loanId);
    }),

  /**
   * Buscar cronograma de pagamentos
   */
  getPayments: protectedProcedure
    .input(z.object({ loanId: z.number() }))
    .query(async ({ input }) => {
      return await loanService.getLoanPayments(input.loanId);
    }),

  /**
   * Pagar parcela
   */
  payPayment: protectedProcedure
    .input(z.object({
      paymentId: z.number(),
      paidAmount: z.number().optional(),
      paymentDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      return await loanService.payLoanPayment(
        input.paymentId,
        input.paidAmount,
        input.paymentDate
      );
    }),

  /**
   * Próximas parcelas a vencer
   */
  upcomingPayments: protectedProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return await loanService.getUpcomingLoanPayments(
        ctx.user.id,
        input.days
      );
    }),

  /**
   * Dashboard
   */
  dashboard: protectedProcedure
    .query(async ({ ctx }) => {
      return await loanService.getLoansDashboard(ctx.user.id);
    }),

  /**
   * Simular empréstimo
   */
  simulate: protectedProcedure
    .input(simulateLoanSchema)
    .query(({ input }) => {
      return loanService.simulateLoan(
        input.principal,
        input.annualRate,
        input.installments,
        input.type
      );
    }),

  /**
   * Comparar sistemas de amortização
   */
  compareAmortization: protectedProcedure
    .input(z.object({
      principal: z.number().positive(),
      annualRate: z.number().min(0).max(50),
      installments: z.number().min(1).max(600),
    }))
    .query(({ input }) => {
      return loanService.compareAmortizationSystems(
        input.principal,
        input.annualRate,
        input.installments
      );
    }),
});

/**
 * Exemplo de uso no frontend:
 * 
 * // INVESTIMENTOS
 * 
 * // Criar investimento
 * const investment = await client.investments.create.mutate({
 *   name: 'Tesouro Selic 2029',
 *   type: 'treasury',
 *   investedAmount: 10000,
 *   broker: 'XP',
 *   riskLevel: 'low',
 *   taxRegime: 'regressive',
 * });
 * 
 * // Adicionar dividendo
 * await client.investments.addTransaction.mutate({
 *   investmentId: 1,
 *   type: 'dividend',
 *   amount: 150,
 *   transactionDate: new Date(),
 * });
 * 
 * // Dashboard
 * const dashboard = await client.investments.dashboard.query();
 * 
 * // Simular venda
 * const simulation = await client.investments.simulateSale.query({
 *   investmentId: 1,
 *   saleAmount: 10500,
 * });
 * 
 * // EMPRÉSTIMOS
 * 
 * // Simular antes de criar
 * const simulation = await client.loans.simulate.query({
 *   principal: 300000,
 *   annualRate: 9.5,
 *   installments: 360,
 *   type: 'sac',
 * });
 * 
 * // Comparar sistemas
 * const comparison = await client.loans.compareAmortization.query({
 *   principal: 300000,
 *   annualRate: 9.5,
 *   installments: 360,
 * });
 * 
 * // Criar empréstimo
 * const loan = await client.loans.create.mutate({
 *   name: 'Financiamento Casa',
 *   type: 'home',
 *   principalAmount: 300000,
 *   interestRate: 9.5,
 *   totalInstallments: 360,
 *   amortizationType: 'sac',
 *   startDate: new Date(),
 * });
 * 
 * // Pagar parcela
 * await client.loans.payPayment.mutate({
 *   paymentId: 123,
 * });
 */
