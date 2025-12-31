import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { customAlertService, type AlertCondition, type AlertRule } from "../services/customAlertService";

// Schemas de validação
const alertConditionSchema = z.object({
  field: z.string(),
  operator: z.enum([">", ">=", "<", "<=", "==", "!=", "contains"]),
  value: z.union([z.number(), z.string()]),
  type: z.enum(["expense", "income", "balance", "budget", "category"]),
});

const alertRuleSchema = z.object({
  conditions: z.array(alertConditionSchema),
  logic: z.enum(["AND", "OR"]),
  message: z.string(),
});

export const customAlertRouter = router({
  /**
   * Criar alerta personalizado
   */
  createAlert: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        conditions: alertRuleSchema,
        channels: z.array(z.enum(["push", "email", "whatsapp"])),
        frequency: z.enum(["realtime", "daily", "weekly", "monthly"]).default("realtime"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await customAlertService.createAlert(ctx.user.id, input);
    }),

  /**
   * Listar alertas
   */
  listAlerts: publicProcedure
    .input(z.object({ onlyEnabled: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await customAlertService.listAlerts(ctx.user.id, input?.onlyEnabled);
    }),

  /**
   * Obter alerta específico
   */
  getAlert: publicProcedure
    .input(z.object({ alertId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await customAlertService.getAlert(input.alertId, ctx.user.id);
    }),

  /**
   * Atualizar alerta
   */
  updateAlert: publicProcedure
    .input(
      z.object({
        alertId: z.number(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        conditions: alertRuleSchema.optional(),
        channels: z.array(z.enum(["push", "email", "whatsapp"])).optional(),
        enabled: z.boolean().optional(),
        frequency: z.enum(["realtime", "daily", "weekly", "monthly"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const { alertId, ...data } = input;
      return await customAlertService.updateAlert(alertId, ctx.user.id, data);
    }),

  /**
   * Deletar alerta
   */
  deleteAlert: publicProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await customAlertService.deleteAlert(input.alertId, ctx.user.id);
    }),

  /**
   * Testar condições de um alerta
   */
  testConditions: publicProcedure
    .input(
      z.object({
        conditions: alertRuleSchema,
        testData: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return customAlertService.evaluateConditions(input.conditions, input.testData);
    }),

  /**
   * Salvar template
   */
  saveTemplate: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        conditions: alertRuleSchema,
        channels: z.array(z.enum(["push", "email", "whatsapp"])),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await customAlertService.saveTemplate(ctx.user.id, input);
    }),

  /**
   * Listar templates
   */
  listTemplates: publicProcedure
    .input(z.object({ includePublic: z.boolean().default(true) }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await customAlertService.listTemplates(ctx.user.id, input?.includePublic);
    }),

  /**
   * Criar alerta a partir de template
   */
  createFromTemplate: publicProcedure
    .input(
      z.object({
        templateId: z.number(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await customAlertService.createFromTemplate(
        ctx.user.id,
        input.templateId,
        input.name
      );
    }),

  /**
   * Configurar canais
   */
  configureChannels: publicProcedure
    .input(
      z.object({
        emailEnabled: z.boolean().optional(),
        emailAddress: z.string().email().optional(),
        whatsappEnabled: z.boolean().optional(),
        whatsappNumber: z.string().optional(),
        pushEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await customAlertService.configureChannels(ctx.user.id, input);
    }),

  /**
   * Obter configuração de canais
   */
  getChannelsConfig: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Não autenticado");
    return await customAlertService.getChannelsConfig(ctx.user.id);
  }),

  /**
   * Obter histórico de disparos
   */
  getTriggerHistory: publicProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await customAlertService.getTriggerHistory(ctx.user.id, input?.limit);
    }),
});
