import { db } from "../db";
import { 
  projects, 
  projectCategories, 
  projectExpenses, 
  projectMilestones,
  type InsertProject,
  type InsertProjectCategory,
  type InsertProjectExpense,
  type InsertProjectMilestone
} from "../../drizzle/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";

/**
 * Serviço de Projetos
 * 
 * Gerencia orçamentos temporários para eventos específicos
 * (casamento, reforma, viagem, etc)
 */
export class ProjectService {
  /**
   * Criar novo projeto
   */
  async createProject(userId: number, data: Omit<InsertProject, 'userId'>) {
    const [result] = await db.insert(projects).values({
      ...data,
      userId,
    });

    return { success: true, projectId: result.insertId };
  }

  /**
   * Listar projetos do usuário
   */
  async listProjects(userId: number, status?: string) {
    let query = db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId));

    if (status) {
      query = query.where(
        and(
          eq(projects.userId, userId),
          eq(projects.status, status as any)
        )
      );
    }

    return await query.orderBy(desc(projects.createdAt));
  }

  /**
   * Obter projeto com estatísticas
   */
  async getProject(projectId: number, userId: number) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    if (!project) {
      return null;
    }

    // Buscar categorias
    const categories = await db
      .select()
      .from(projectCategories)
      .where(eq(projectCategories.projectId, projectId));

    // Buscar despesas
    const expenses = await db
      .select()
      .from(projectExpenses)
      .where(eq(projectExpenses.projectId, projectId))
      .orderBy(desc(projectExpenses.date));

    // Buscar milestones
    const milestones = await db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId))
      .orderBy(asc(projectMilestones.dueDate));

    // Calcular estatísticas
    const totalPlanned = expenses.reduce((sum, e) => sum + e.plannedValue, 0);
    const totalActual = expenses.reduce((sum, e) => sum + e.actualValue, 0);
    const totalPaid = expenses.filter((e) => e.paid).reduce((sum, e) => sum + e.actualValue, 0);
    const totalPending = totalActual - totalPaid;

    // Por categoria
    const categoryStats = categories.map((cat) => {
      const catExpenses = expenses.filter((e) => e.categoryId === cat.id);
      const planned = catExpenses.reduce((sum, e) => sum + e.plannedValue, 0);
      const actual = catExpenses.reduce((sum, e) => sum + e.actualValue, 0);

      return {
        ...cat,
        planned,
        actual,
        remaining: cat.budget - actual,
        percentage: cat.budget > 0 ? (actual / cat.budget) * 100 : 0,
      };
    });

    // Milestones stats
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m) => m.completed).length;
    const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

    return {
      ...project,
      categories: categoryStats,
      expenses,
      milestones,
      stats: {
        totalPlanned,
        totalActual,
        totalPaid,
        totalPending,
        remaining: project.totalBudget - totalActual,
        percentage: project.totalBudget > 0 ? (totalActual / project.totalBudget) * 100 : 0,
        totalMilestones,
        completedMilestones,
        milestoneProgress,
      },
    };
  }

  /**
   * Atualizar projeto
   */
  async updateProject(
    projectId: number,
    userId: number,
    data: Partial<Omit<InsertProject, 'userId'>>
  ) {
    await db
      .update(projects)
      .set(data)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    return { success: true };
  }

  /**
   * Deletar projeto
   */
  async deleteProject(projectId: number, userId: number) {
    await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    return { success: true };
  }

  /**
   * Adicionar categoria ao projeto
   */
  async addCategory(projectId: number, data: Omit<InsertProjectCategory, 'projectId'>) {
    const [result] = await db.insert(projectCategories).values({
      ...data,
      projectId,
    });

    return { success: true, categoryId: result.insertId };
  }

  /**
   * Atualizar categoria
   */
  async updateCategory(categoryId: number, data: Partial<Omit<InsertProjectCategory, 'projectId'>>) {
    await db.update(projectCategories).set(data).where(eq(projectCategories.id, categoryId));
    return { success: true };
  }

  /**
   * Deletar categoria
   */
  async deleteCategory(categoryId: number) {
    await db.delete(projectCategories).where(eq(projectCategories.id, categoryId));
    return { success: true };
  }

  /**
   * Adicionar despesa
   */
  async addExpense(projectId: number, data: Omit<InsertProjectExpense, 'projectId'>) {
    const [result] = await db.insert(projectExpenses).values({
      ...data,
      projectId,
    });

    return { success: true, expenseId: result.insertId };
  }

  /**
   * Atualizar despesa
   */
  async updateExpense(expenseId: number, data: Partial<Omit<InsertProjectExpense, 'projectId'>>) {
    await db.update(projectExpenses).set(data).where(eq(projectExpenses.id, expenseId));
    return { success: true };
  }

  /**
   * Marcar despesa como paga
   */
  async markExpensePaid(expenseId: number, paid: boolean) {
    await db.update(projectExpenses).set({ paid }).where(eq(projectExpenses.id, expenseId));
    return { success: true };
  }

  /**
   * Deletar despesa
   */
  async deleteExpense(expenseId: number) {
    await db.delete(projectExpenses).where(eq(projectExpenses.id, expenseId));
    return { success: true };
  }

  /**
   * Adicionar milestone
   */
  async addMilestone(projectId: number, data: Omit<InsertProjectMilestone, 'projectId'>) {
    const [result] = await db.insert(projectMilestones).values({
      ...data,
      projectId,
    });

    return { success: true, milestoneId: result.insertId };
  }

  /**
   * Marcar milestone como completo
   */
  async completeMilestone(milestoneId: number, completed: boolean) {
    await db
      .update(projectMilestones)
      .set({
        completed,
        completedAt: completed ? new Date() : null,
      })
      .where(eq(projectMilestones.id, milestoneId));

    return { success: true };
  }

  /**
   * Deletar milestone
   */
  async deleteMilestone(milestoneId: number) {
    await db.delete(projectMilestones).where(eq(projectMilestones.id, milestoneId));
    return { success: true };
  }

  /**
   * Obter resumo de todos os projetos do usuário
   */
  async getProjectsSummary(userId: number) {
    const allProjects = await this.listProjects(userId);

    const summary = {
      total: allProjects.length,
      planning: allProjects.filter((p) => p.status === "planning").length,
      active: allProjects.filter((p) => p.status === "active").length,
      completed: allProjects.filter((p) => p.status === "completed").length,
      cancelled: allProjects.filter((p) => p.status === "cancelled").length,
      totalBudget: allProjects.reduce((sum, p) => sum + p.totalBudget, 0),
    };

    return summary;
  }

  /**
   * Arquivar projeto (marcar como completo)
   */
  async archiveProject(projectId: number, userId: number) {
    await db
      .update(projects)
      .set({ status: "completed" })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    return { success: true };
  }

  /**
   * Cancelar projeto
   */
  async cancelProject(projectId: number, userId: number) {
    await db
      .update(projects)
      .set({ status: "cancelled" })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    return { success: true };
  }

  /**
   * Reativar projeto
   */
  async reactivateProject(projectId: number, userId: number) {
    await db
      .update(projects)
      .set({ status: "active" })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    return { success: true };
  }

  /**
   * Obter análise pós-evento
   */
  async getProjectAnalysis(projectId: number, userId: number) {
    const projectData = await this.getProject(projectId, userId);

    if (!projectData) {
      return null;
    }

    // Análise por categoria
    const categoryAnalysis = projectData.categories.map((cat) => ({
      name: cat.name,
      budget: cat.budget,
      actual: cat.actual,
      variance: cat.actual - cat.budget,
      variancePercentage: cat.budget > 0 ? ((cat.actual - cat.budget) / cat.budget) * 100 : 0,
      status: cat.actual > cat.budget ? "over" : cat.actual < cat.budget ? "under" : "exact",
    }));

    // Despesas mais caras
    const topExpenses = projectData.expenses
      .sort((a, b) => b.actualValue - a.actualValue)
      .slice(0, 10);

    // Despesas não pagas
    const unpaidExpenses = projectData.expenses.filter((e) => !e.paid);

    // Timeline (despesas ao longo do tempo)
    const timeline = projectData.expenses
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((e) => ({
        date: e.date,
        amount: e.actualValue,
        description: e.description,
      }));

    return {
      project: projectData,
      categoryAnalysis,
      topExpenses,
      unpaidExpenses,
      timeline,
      summary: {
        totalBudget: projectData.totalBudget,
        totalSpent: projectData.stats.totalActual,
        variance: projectData.stats.totalActual - projectData.totalBudget,
        variancePercentage:
          projectData.totalBudget > 0
            ? ((projectData.stats.totalActual - projectData.totalBudget) / projectData.totalBudget) * 100
            : 0,
        onBudget: projectData.stats.totalActual <= projectData.totalBudget,
      },
    };
  }
}

export const projectService = new ProjectService();
