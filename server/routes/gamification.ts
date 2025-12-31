import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { gamificationService } from "../services/gamificationService";

export const gamificationRouter = router({
  /**
   * Obter estatísticas do usuário
   */
  getStats: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Não autenticado");
    return await gamificationService.getUserStats(ctx.user.id);
  }),

  /**
   * Listar todas as conquistas
   */
  listAchievements: publicProcedure.query(async () => {
    return await gamificationService.listAchievements();
  }),

  /**
   * Obter conquistas do usuário
   */
  getUserAchievements: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Não autenticado");
    return await gamificationService.getUserAchievements(ctx.user.id);
  }),

  /**
   * Listar desafios ativos
   */
  listChallenges: publicProcedure.query(async () => {
    return await gamificationService.listActiveChallenges();
  }),

  /**
   * Obter desafios do usuário
   */
  getUserChallenges: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Não autenticado");
    return await gamificationService.getUserChallenges(ctx.user.id);
  }),

  /**
   * Obter leaderboard
   */
  getLeaderboard: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return await gamificationService.getLeaderboard(input.limit);
    }),

  /**
   * Obter histórico de XP
   */
  getXPHistory: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await gamificationService.getXPHistory(ctx.user.id, input.limit);
    }),
});
