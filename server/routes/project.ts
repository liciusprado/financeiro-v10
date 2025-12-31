import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { projectService } from "../services/projectService";

export const projectRouter = router({
  /**
   * Criar projeto
   */
  createProject: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        type: z.enum(["wedding", "renovation", "travel", "event", "other"]).default("other"),
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string().optional(),
        totalBudget: z.number().int().min(0),
        color: z.string().default("#3b82f6"),
        icon: z.string().default("briefcase"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.createProject(ctx.user.id, input);
    }),

  /**
   * Listar projetos
   */
  listProjects: publicProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.listProjects(ctx.user.id, input?.status);
    }),

  /**
   * Obter projeto com detalhes
   */
  getProject: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.getProject(input.projectId, ctx.user.id);
    }),

  /**
   * Atualizar projeto
   */
  updateProject: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        type: z.enum(["wedding", "renovation", "travel", "event", "other"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        totalBudget: z.number().int().min(0).optional(),
        status: z.enum(["planning", "active", "completed", "cancelled"]).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const { projectId, ...data } = input;
      return await projectService.updateProject(projectId, ctx.user.id, data);
    }),

  /**
   * Deletar projeto
   */
  deleteProject: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.deleteProject(input.projectId, ctx.user.id);
    }),

  /**
   * Adicionar categoria
   */
  addCategory: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1).max(100),
        budget: z.number().int().min(0),
        color: z.string().default("#6b7280"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const { projectId, ...data } = input;
      return await projectService.addCategory(projectId, data);
    }),

  /**
   * Atualizar categoria
   */
  updateCategory: publicProcedure
    .input(
      z.object({
        categoryId: z.number(),
        name: z.string().min(1).max(100).optional(),
        budget: z.number().int().min(0).optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const { categoryId, ...data } = input;
      return await projectService.updateCategory(categoryId, data);
    }),

  /**
   * Deletar categoria
   */
  deleteCategory: publicProcedure
    .input(z.object({ categoryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.deleteCategory(input.categoryId);
    }),

  /**
   * Adicionar despesa
   */
  addExpense: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        categoryId: z.number().optional(),
        description: z.string().min(1).max(200),
        plannedValue: z.number().int().min(0),
        actualValue: z.number().int().min(0).default(0),
        date: z.string(), // YYYY-MM-DD
        paid: z.boolean().default(false),
        notes: z.string().optional(),
        attachmentUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const { projectId, ...data } = input;
      return await projectService.addExpense(projectId, data);
    }),

  /**
   * Atualizar despesa
   */
  updateExpense: publicProcedure
    .input(
      z.object({
        expenseId: z.number(),
        categoryId: z.number().optional(),
        description: z.string().min(1).max(200).optional(),
        plannedValue: z.number().int().min(0).optional(),
        actualValue: z.number().int().min(0).optional(),
        date: z.string().optional(),
        paid: z.boolean().optional(),
        notes: z.string().optional(),
        attachmentUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const { expenseId, ...data } = input;
      return await projectService.updateExpense(expenseId, data);
    }),

  /**
   * Marcar despesa como paga
   */
  markExpensePaid: publicProcedure
    .input(z.object({ expenseId: z.number(), paid: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.markExpensePaid(input.expenseId, input.paid);
    }),

  /**
   * Deletar despesa
   */
  deleteExpense: publicProcedure
    .input(z.object({ expenseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.deleteExpense(input.expenseId);
    }),

  /**
   * Adicionar milestone
   */
  addMilestone: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        dueDate: z.string(), // YYYY-MM-DD
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const { projectId, ...data } = input;
      return await projectService.addMilestone(projectId, data);
    }),

  /**
   * Completar milestone
   */
  completeMilestone: publicProcedure
    .input(z.object({ milestoneId: z.number(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.completeMilestone(input.milestoneId, input.completed);
    }),

  /**
   * Deletar milestone
   */
  deleteMilestone: publicProcedure
    .input(z.object({ milestoneId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.deleteMilestone(input.milestoneId);
    }),

  /**
   * Obter resumo de projetos
   */
  getProjectsSummary: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Não autenticado");
    return await projectService.getProjectsSummary(ctx.user.id);
  }),

  /**
   * Arquivar projeto
   */
  archiveProject: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.archiveProject(input.projectId, ctx.user.id);
    }),

  /**
   * Cancelar projeto
   */
  cancelProject: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.cancelProject(input.projectId, ctx.user.id);
    }),

  /**
   * Reativar projeto
   */
  reactivateProject: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.reactivateProject(input.projectId, ctx.user.id);
    }),

  /**
   * Obter análise pós-evento
   */
  getProjectAnalysis: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return await projectService.getProjectAnalysis(input.projectId, ctx.user.id);
    }),
});
