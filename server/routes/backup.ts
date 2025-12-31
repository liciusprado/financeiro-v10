import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { backupService } from "../services/backupService";

export const backupRouter = router({
  /**
   * Criar backup manual
   */
  createBackup: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("Não autenticado");
    }

    return await backupService.createBackup(ctx.user.id);
  }),

  /**
   * Listar backups
   */
  listBackups: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("Não autenticado");
    }

    return await backupService.listBackups(ctx.user.id);
  }),

  /**
   * Obter detalhes de um backup
   */
  getBackup: publicProcedure
    .input(z.object({ backupId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Não autenticado");
      }

      return await backupService.getBackup(input.backupId, ctx.user.id);
    }),

  /**
   * Restaurar backup
   */
  restoreBackup: publicProcedure
    .input(z.object({ backupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Não autenticado");
      }

      return await backupService.restoreBackup(input.backupId, ctx.user.id);
    }),

  /**
   * Deletar backup
   */
  deleteBackup: publicProcedure
    .input(z.object({ backupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Não autenticado");
      }

      return await backupService.deleteBackup(input.backupId, ctx.user.id);
    }),

  /**
   * Configurar agendamento
   */
  setSchedule: publicProcedure
    .input(
      z.object({
        frequency: z.enum(["daily", "weekly", "monthly"]),
        time: z.string().default("02:00:00"),
        enabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Não autenticado");
      }

      return await backupService.setSchedule(
        ctx.user.id,
        input.frequency,
        input.time,
        input.enabled
      );
    }),

  /**
   * Obter schedule
   */
  getSchedule: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error("Não autenticado");
    }

    return await backupService.getSchedule(ctx.user.id);
  }),
});
