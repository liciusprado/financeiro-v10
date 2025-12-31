import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { dashboardService, type WidgetConfig } from "../services/dashboardService";

// Schemas de validação
const widgetPositionSchema = z.object({
  i: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
  maxW: z.number().optional(),
  maxH: z.number().optional(),
});

const widgetConfigSchema = z.object({
  id: z.string(),
  type: z.enum([
    "balance",
    "expenses-summary",
    "income-summary",
    "chart-expenses",
    "chart-income",
    "recent-transactions",
    "budget-progress",
    "goals-summary",
    "projects-summary",
    "alerts-summary",
    "category-breakdown",
    "monthly-comparison",
    "quick-actions",
  ]),
  title: z.string().optional(),
  position: widgetPositionSchema,
  config: z.record(z.any()).optional(),
});

export const dashboardRouter = router({
  /**
   * Criar novo layout
   */
  createLayout: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        layout: z.array(widgetConfigSchema),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await dashboardService.createLayout(ctx.user.id, input);
    }),

  /**
   * Listar layouts do usuário
   */
  listLayouts: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Não autenticado");
    return await dashboardService.listLayouts(ctx.user.id);
  }),

  /**
   * Obter layout específico
   */
  getLayout: publicProcedure
    .input(z.object({ layoutId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await dashboardService.getLayout(input.layoutId, ctx.user.id);
    }),

  /**
   * Obter layout padrão
   */
  getDefaultLayout: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Não autenticado");
    return await dashboardService.getDefaultLayout(ctx.user.id);
  }),

  /**
   * Atualizar layout
   */
  updateLayout: publicProcedure
    .input(
      z.object({
        layoutId: z.number(),
        name: z.string().optional(),
        layout: z.array(widgetConfigSchema).optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const { layoutId, ...data } = input;
      return await dashboardService.updateLayout(layoutId, ctx.user.id, data);
    }),

  /**
   * Deletar layout
   */
  deleteLayout: publicProcedure
    .input(z.object({ layoutId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await dashboardService.deleteLayout(input.layoutId, ctx.user.id);
    }),

  /**
   * Definir layout padrão
   */
  setDefaultLayout: publicProcedure
    .input(z.object({ layoutId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await dashboardService.setDefaultLayout(input.layoutId, ctx.user.id);
    }),

  /**
   * Listar presets
   */
  listPresets: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Não autenticado");
    return await dashboardService.listPresets();
  }),

  /**
   * Criar layout a partir de preset
   */
  createFromPreset: publicProcedure
    .input(
      z.object({
        presetId: z.number(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await dashboardService.createFromPreset(ctx.user.id, input.presetId, input.name);
    }),
});
