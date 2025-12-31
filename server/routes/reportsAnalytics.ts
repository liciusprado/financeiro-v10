/**
 * Reports & Analytics Routes
 * Endpoints tRPC para relatórios, analytics e simulações
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import * as exportService from '../services/exportService';
import * as analyticsService from '../services/analyticsService';
import * as simulationService from '../services/simulationService';

// ========== SCHEMAS ==========

const exportFiltersSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().optional(),
});

const customReportSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({
    type: z.enum(['transactions', 'goals', 'budgets', 'summary']),
    filters: z.any().optional(),
  })),
  format: z.enum(['xlsx', 'pdf']),
});

const scenarioSchema = z.object({
  name: z.string(),
  incomeChange: z.number().optional(),
  expenseChange: z.number().optional(),
  months: z.number().min(1).max(120),
});

// ========== EXPORT ROUTER ==========

export const exportRouter = router({
  /**
   * Exportar transações para Excel
   */
  transactionsToExcel: protectedProcedure
    .input(exportFiltersSchema)
    .mutation(async ({ ctx, input }) => {
      const buffer = await exportService.exportTransactionsToExcel(
        ctx.user.id,
        input
      );

      // Retornar base64 para download no frontend
      return {
        filename: `transacoes_${Date.now()}.xlsx`,
        data: buffer.toString('base64'),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }),

  /**
   * Exportar transações para PDF
   */
  transactionsToPDF: protectedProcedure
    .input(exportFiltersSchema)
    .mutation(async ({ ctx, input }) => {
      const buffer = await exportService.exportTransactionsToPDF(
        ctx.user.id,
        input
      );

      return {
        filename: `relatorio_${Date.now()}.pdf`,
        data: buffer.toString('base64'),
        mimeType: 'application/pdf',
      };
    }),

  /**
   * Exportar dashboard completo
   */
  fullDashboard: protectedProcedure
    .mutation(async ({ ctx }) => {
      const buffer = await exportService.exportFullDashboard(ctx.user.id);

      return {
        filename: `dashboard_completo_${Date.now()}.xlsx`,
        data: buffer.toString('base64'),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }),

  /**
   * Exportar relatório customizado
   */
  customReport: protectedProcedure
    .input(customReportSchema)
    .mutation(async ({ ctx, input }) => {
      const buffer = await exportService.exportCustomReport(
        ctx.user.id,
        input
      );

      const extension = input.format === 'xlsx' ? 'xlsx' : 'pdf';
      const mimeType = input.format === 'xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

      return {
        filename: `${input.title}_${Date.now()}.${extension}`,
        data: buffer.toString('base64'),
        mimeType,
      };
    }),
});

// ========== ANALYTICS ROUTER ==========

export const analyticsRouter = router({
  /**
   * Analisar tendência de gastos
   */
  spendingTrend: protectedProcedure
    .input(z.object({ months: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return await analyticsService.analyzeSpendingTrend(
        ctx.user.id,
        input.months
      );
    }),

  /**
   * Analisar tendência de receitas
   */
  incomeTrend: protectedProcedure
    .input(z.object({ months: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return await analyticsService.analyzeIncomeTrend(
        ctx.user.id,
        input.months
      );
    }),

  /**
   * Identificar categorias problemáticas
   */
  problemCategories: protectedProcedure
    .query(async ({ ctx }) => {
      return await analyticsService.identifyProblemCategories(ctx.user.id);
    }),

  /**
   * Prever gastos do próximo mês
   */
  predictNextMonth: protectedProcedure
    .query(async ({ ctx }) => {
      return await analyticsService.predictNextMonthExpenses(ctx.user.id);
    }),

  /**
   * Analisar padrões sazonais
   */
  seasonalPatterns: protectedProcedure
    .query(async ({ ctx }) => {
      return await analyticsService.analyzeSeasonalPatterns(ctx.user.id);
    }),

  /**
   * Identificar oportunidades de economia
   */
  savingsOpportunities: protectedProcedure
    .query(async ({ ctx }) => {
      return await analyticsService.identifySavingsOpportunities(ctx.user.id);
    }),

  /**
   * Calcular score de saúde financeira
   */
  financialHealthScore: protectedProcedure
    .query(async ({ ctx }) => {
      return await analyticsService.calculateFinancialHealthScore(
        ctx.user.id
      );
    }),
});

// ========== SIMULATION ROUTER ==========

export const simulationRouter = router({
  /**
   * Simular taxa de poupança
   */
  savingsRate: protectedProcedure
    .input(z.object({
      savingsRate: z.number().min(0).max(100),
      months: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await simulationService.simulateSavingsRate(
        ctx.user.id,
        input.savingsRate,
        input.months
      );
    }),

  /**
   * Simular redução de categoria
   */
  categoryReduction: protectedProcedure
    .input(z.object({
      category: z.string(),
      reductionPercent: z.number().min(0).max(100),
      months: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await simulationService.simulateCategoryReduction(
        ctx.user.id,
        input.category,
        input.reductionPercent,
        input.months
      );
    }),

  /**
   * Simular aumento de renda
   */
  incomeIncrease: protectedProcedure
    .input(z.object({
      increasePercent: z.number().min(0).max(1000),
      months: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await simulationService.simulateIncomeIncrease(
        ctx.user.id,
        input.increasePercent,
        input.months
      );
    }),

  /**
   * Simular alcance de meta
   */
  goalAchievement: protectedProcedure
    .input(z.object({
      goalAmount: z.number().positive(),
      monthlySavings: z.number().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await simulationService.simulateGoalAchievement(
        ctx.user.id,
        input.goalAmount,
        input.monthlySavings
      );
    }),

  /**
   * Simular aposentadoria
   */
  retirement: protectedProcedure
    .input(z.object({
      currentAge: z.number().min(18).max(100),
      retirementAge: z.number().min(18).max(100),
      monthlySavings: z.number().positive(),
      expectedReturn: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await simulationService.simulateRetirement(
        ctx.user.id,
        input.currentAge,
        input.retirementAge,
        input.monthlySavings,
        input.expectedReturn
      );
    }),

  /**
   * Simular cenário completo
   */
  completeScenario: protectedProcedure
    .input(z.object({
      incomeChange: z.number().optional(),
      expenseChange: z.number().optional(),
      newExpense: z.object({
        category: z.string(),
        amount: z.number().positive(),
      }).optional(),
      months: z.number().min(1).max(120),
    }))
    .query(async ({ ctx, input }) => {
      return await simulationService.simulateCompleteScenario(
        ctx.user.id,
        input
      );
    }),

  /**
   * Comparar múltiplos cenários
   */
  compareScenarios: protectedProcedure
    .input(z.object({
      scenarios: z.array(scenarioSchema).min(1).max(5),
    }))
    .query(async ({ ctx, input }) => {
      return await simulationService.compareScenarios(
        ctx.user.id,
        input.scenarios
      );
    }),
});

/**
 * Exemplo de uso no frontend:
 * 
 * // EXPORTAÇÃO
 * 
 * // Exportar transações para Excel
 * const excel = await client.export.transactionsToExcel.mutate({
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-12-31'),
 *   type: 'expense',
 * });
 * 
 * // Download do arquivo
 * const blob = new Blob(
 *   [Buffer.from(excel.data, 'base64')],
 *   { type: excel.mimeType }
 * );
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = excel.filename;
 * a.click();
 * 
 * // Exportar para PDF
 * const pdf = await client.export.transactionsToPDF.mutate({
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-12-31'),
 * });
 * 
 * // Dashboard completo
 * const dashboard = await client.export.fullDashboard.mutate();
 * 
 * // ANALYTICS
 * 
 * // Tendência de gastos
 * const trend = await client.analytics.spendingTrend.query({ months: 6 });
 * console.log(`Tendência: ${trend.direction}, ${trend.percentage}%`);
 * 
 * // Categorias problemáticas
 * const problems = await client.analytics.problemCategories.query();
 * 
 * // Prever próximo mês
 * const prediction = await client.analytics.predictNextMonth.query();
 * console.log(`Previsão: R$ ${prediction.total}`);
 * 
 * // Score de saúde financeira
 * const health = await client.analytics.financialHealthScore.query();
 * console.log(`Score: ${health.score} (${health.grade})`);
 * 
 * // SIMULAÇÕES
 * 
 * // Simular 20% de poupança
 * const savings = await client.simulation.savingsRate.query({
 *   savingsRate: 20,
 *   months: 12,
 * });
 * 
 * // Simular redução de 30% em Alimentação
 * const reduction = await client.simulation.categoryReduction.query({
 *   category: 'Alimentação',
 *   reductionPercent: 30,
 *   months: 12,
 * });
 * 
 * // Simular aumento de 15% na renda
 * const increase = await client.simulation.incomeIncrease.query({
 *   increasePercent: 15,
 *   months: 12,
 * });
 * 
 * // Simular meta
 * const goal = await client.simulation.goalAchievement.query({
 *   goalAmount: 50000,
 * });
 * console.log(`Alcançar em ${goal.months} meses`);
 * 
 * // Simular aposentadoria
 * const retirement = await client.simulation.retirement.query({
 *   currentAge: 30,
 *   retirementAge: 65,
 *   monthlySavings: 1500,
 * });
 * 
 * // Comparar cenários
 * const comparison = await client.simulation.compareScenarios.query({
 *   scenarios: [
 *     { name: 'Conservador', expenseChange: -10, months: 12 },
 *     { name: 'Moderado', expenseChange: -20, months: 12 },
 *     { name: 'Agressivo', expenseChange: -30, months: 12 },
 *   ],
 * });
 */
