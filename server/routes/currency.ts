import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { currencyService } from "../services/currencyService";

export const currencyRouter = router({
  /**
   * Listar moedas disponíveis
   */
  listCurrencies: publicProcedure.query(async () => {
    return await currencyService.listCurrencies();
  }),

  /**
   * Obter moeda específica
   */
  getCurrency: publicProcedure
    .input(z.object({ code: z.string().length(3) }))
    .query(async ({ input }) => {
      return await currencyService.getCurrency(input.code);
    }),

  /**
   * Obter preferências do usuário
   */
  getUserPreferences: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Não autenticado");
    return await currencyService.getUserPreferences(ctx.user.id);
  }),

  /**
   * Atualizar preferências
   */
  updateUserPreferences: publicProcedure
    .input(
      z.object({
        baseCurrency: z.string().length(3).optional(),
        displayCurrencies: z.array(z.string().length(3)).optional(),
        autoConvert: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await currencyService.updateUserPreferences(ctx.user.id, input);
    }),

  /**
   * Obter taxa de câmbio
   */
  getExchangeRate: publicProcedure
    .input(
      z.object({
        from: z.string().length(3),
        to: z.string().length(3),
        date: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const rate = await currencyService.getExchangeRate(input.from, input.to, input.date);
      return { from: input.from, to: input.to, rate };
    }),

  /**
   * Converter valor
   */
  convertCurrency: publicProcedure
    .input(
      z.object({
        amount: z.number(),
        from: z.string().length(3),
        to: z.string().length(3),
        date: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const converted = await currencyService.convertCurrency(
        input.amount,
        input.from,
        input.to,
        input.date
      );
      return { amount: input.amount, from: input.from, to: input.to, converted };
    }),

  /**
   * Converter para moeda base
   */
  convertToBaseCurrency: publicProcedure
    .input(
      z.object({
        amount: z.number(),
        from: z.string().length(3),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const converted = await currencyService.convertToBaseCurrency(
        ctx.user.id,
        input.amount,
        input.from
      );
      return { amount: input.amount, from: input.from, converted };
    }),

  /**
   * Salvar taxa de câmbio manual
   */
  saveExchangeRate: publicProcedure
    .input(
      z.object({
        from: z.string().length(3),
        to: z.string().length(3),
        rate: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await currencyService.saveExchangeRate(input.from, input.to, input.rate, "manual");
    }),

  /**
   * Obter histórico de taxas
   */
  getExchangeRateHistory: publicProcedure
    .input(
      z.object({
        from: z.string().length(3),
        to: z.string().length(3),
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      return await currencyService.getExchangeRateHistory(input.from, input.to, input.days);
    }),

  /**
   * Atualizar todas as taxas
   */
  updateAllRates: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Não autenticado");
    return await currencyService.updateAllRates();
  }),
});
