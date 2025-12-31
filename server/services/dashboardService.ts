import { db } from "../db";
import {
  dashboardLayouts,
  dashboardWidgets,
  dashboardPresets,
  type InsertDashboardLayout,
  type InsertDashboardWidget,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Tipos de widgets disponíveis
 */
export type WidgetType =
  | "balance"
  | "expenses-summary"
  | "income-summary"
  | "chart-expenses"
  | "chart-income"
  | "recent-transactions"
  | "budget-progress"
  | "goals-summary"
  | "projects-summary"
  | "alerts-summary"
  | "category-breakdown"
  | "monthly-comparison"
  | "quick-actions";

/**
 * Posição e tamanho de um widget no layout
 */
export interface WidgetPosition {
  i: string; // ID único do widget
  x: number; // Coluna (0-11)
  y: number; // Linha
  w: number; // Largura (1-12)
  h: number; // Altura
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

/**
 * Configuração de um widget
 */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title?: string;
  position: WidgetPosition;
  config?: Record<string, any>;
}

/**
 * Serviço de Dashboard Personalizável
 */
export class DashboardService {
  /**
   * Criar novo layout
   */
  async createLayout(userId: number, data: {
    name: string;
    layout: WidgetConfig[];
    isDefault?: boolean;
  }) {
    // Se for default, remover default de outros
    if (data.isDefault) {
      await db
        .update(dashboardLayouts)
        .set({ isDefault: false })
        .where(eq(dashboardLayouts.userId, userId));
    }

    const [result] = await db.insert(dashboardLayouts).values({
      userId,
      name: data.name,
      isDefault: data.isDefault || false,
      layout: JSON.stringify(data.layout),
    });

    return { success: true, layoutId: result.insertId };
  }

  /**
   * Listar layouts do usuário
   */
  async listLayouts(userId: number) {
    const layouts = await db
      .select()
      .from(dashboardLayouts)
      .where(eq(dashboardLayouts.userId, userId))
      .orderBy(dashboardLayouts.isDefault);

    return layouts.map((layout) => ({
      ...layout,
      layout: JSON.parse(layout.layout),
    }));
  }

  /**
   * Obter layout específico
   */
  async getLayout(layoutId: number, userId: number) {
    const [layout] = await db
      .select()
      .from(dashboardLayouts)
      .where(and(eq(dashboardLayouts.id, layoutId), eq(dashboardLayouts.userId, userId)));

    if (!layout) return null;

    return {
      ...layout,
      layout: JSON.parse(layout.layout),
    };
  }

  /**
   * Obter layout padrão
   */
  async getDefaultLayout(userId: number) {
    const [layout] = await db
      .select()
      .from(dashboardLayouts)
      .where(and(eq(dashboardLayouts.userId, userId), eq(dashboardLayouts.isDefault, true)));

    if (!layout) {
      // Criar layout padrão básico
      const defaultLayout = this.getBasicLayout();
      await this.createLayout(userId, {
        name: "Layout Padrão",
        layout: defaultLayout,
        isDefault: true,
      });

      const [newLayout] = await db
        .select()
        .from(dashboardLayouts)
        .where(and(eq(dashboardLayouts.userId, userId), eq(dashboardLayouts.isDefault, true)));

      return {
        ...newLayout,
        layout: JSON.parse(newLayout.layout),
      };
    }

    return {
      ...layout,
      layout: JSON.parse(layout.layout),
    };
  }

  /**
   * Atualizar layout
   */
  async updateLayout(layoutId: number, userId: number, data: {
    name?: string;
    layout?: WidgetConfig[];
    isDefault?: boolean;
  }) {
    // Se for default, remover default de outros
    if (data.isDefault) {
      await db
        .update(dashboardLayouts)
        .set({ isDefault: false })
        .where(eq(dashboardLayouts.userId, userId));
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.layout) updateData.layout = JSON.stringify(data.layout);
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    await db
      .update(dashboardLayouts)
      .set(updateData)
      .where(and(eq(dashboardLayouts.id, layoutId), eq(dashboardLayouts.userId, userId)));

    return { success: true };
  }

  /**
   * Deletar layout
   */
  async deleteLayout(layoutId: number, userId: number) {
    await db
      .delete(dashboardLayouts)
      .where(and(eq(dashboardLayouts.id, layoutId), eq(dashboardLayouts.userId, userId)));

    return { success: true };
  }

  /**
   * Definir layout como padrão
   */
  async setDefaultLayout(layoutId: number, userId: number) {
    // Remover default de todos
    await db
      .update(dashboardLayouts)
      .set({ isDefault: false })
      .where(eq(dashboardLayouts.userId, userId));

    // Definir novo default
    await db
      .update(dashboardLayouts)
      .set({ isDefault: true })
      .where(and(eq(dashboardLayouts.id, layoutId), eq(dashboardLayouts.userId, userId)));

    return { success: true };
  }

  /**
   * Listar presets públicos
   */
  async listPresets() {
    const presets = await db
      .select()
      .from(dashboardPresets)
      .where(eq(dashboardPresets.isPublic, true))
      .orderBy(dashboardPresets.usageCount);

    return presets.map((preset) => ({
      ...preset,
      layout: JSON.parse(preset.layout),
    }));
  }

  /**
   * Criar layout a partir de preset
   */
  async createFromPreset(userId: number, presetId: number, name?: string) {
    const [preset] = await db
      .select()
      .from(dashboardPresets)
      .where(eq(dashboardPresets.id, presetId));

    if (!preset) {
      return { success: false, error: "Preset não encontrado" };
    }

    // Incrementar contador
    await db
      .update(dashboardPresets)
      .set({ usageCount: preset.usageCount + 1 })
      .where(eq(dashboardPresets.id, presetId));

    // Criar layout
    const result = await this.createLayout(userId, {
      name: name || preset.name,
      layout: JSON.parse(preset.layout),
    });

    return result;
  }

  /**
   * Layout básico padrão
   */
  private getBasicLayout(): WidgetConfig[] {
    return [
      {
        id: "balance",
        type: "balance",
        title: "Saldo",
        position: { i: "balance", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      },
      {
        id: "expenses",
        type: "expenses-summary",
        title: "Despesas",
        position: { i: "expenses", x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      },
      {
        id: "income",
        type: "income-summary",
        title: "Receitas",
        position: { i: "income", x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      },
      {
        id: "chart-expenses",
        type: "chart-expenses",
        title: "Gráfico de Despesas",
        position: { i: "chart-expenses", x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
      },
      {
        id: "budget-progress",
        type: "budget-progress",
        title: "Progresso do Orçamento",
        position: { i: "budget-progress", x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
      },
      {
        id: "recent",
        type: "recent-transactions",
        title: "Transações Recentes",
        position: { i: "recent", x: 0, y: 6, w: 12, h: 3, minW: 6, minH: 3 },
      },
    ];
  }

  /**
   * Layout profissional
   */
  getProfessionalLayout(): WidgetConfig[] {
    return [
      {
        id: "balance",
        type: "balance",
        title: "Saldo Atual",
        position: { i: "balance", x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "expenses",
        type: "expenses-summary",
        title: "Despesas",
        position: { i: "expenses", x: 3, y: 0, w: 3, h: 2 },
      },
      {
        id: "income",
        type: "income-summary",
        title: "Receitas",
        position: { i: "income", x: 6, y: 0, w: 3, h: 2 },
      },
      {
        id: "goals",
        type: "goals-summary",
        title: "Metas",
        position: { i: "goals", x: 9, y: 0, w: 3, h: 2 },
      },
      {
        id: "chart-expenses",
        type: "chart-expenses",
        title: "Despesas por Categoria",
        position: { i: "chart-expenses", x: 0, y: 2, w: 6, h: 4 },
      },
      {
        id: "monthly-comparison",
        type: "monthly-comparison",
        title: "Comparação Mensal",
        position: { i: "monthly-comparison", x: 6, y: 2, w: 6, h: 4 },
      },
      {
        id: "category-breakdown",
        type: "category-breakdown",
        title: "Análise por Categoria",
        position: { i: "category-breakdown", x: 0, y: 6, w: 6, h: 3 },
      },
      {
        id: "projects",
        type: "projects-summary",
        title: "Projetos Ativos",
        position: { i: "projects", x: 6, y: 6, w: 6, h: 3 },
      },
      {
        id: "recent",
        type: "recent-transactions",
        title: "Últimas Transações",
        position: { i: "recent", x: 0, y: 9, w: 12, h: 3 },
      },
    ];
  }

  /**
   * Layout minimalista
   */
  getMinimalistLayout(): WidgetConfig[] {
    return [
      {
        id: "balance",
        type: "balance",
        title: "Saldo",
        position: { i: "balance", x: 0, y: 0, w: 12, h: 3 },
      },
      {
        id: "chart-expenses",
        type: "chart-expenses",
        title: "Despesas",
        position: { i: "chart-expenses", x: 0, y: 3, w: 12, h: 4 },
      },
      {
        id: "recent",
        type: "recent-transactions",
        title: "Recentes",
        position: { i: "recent", x: 0, y: 7, w: 12, h: 3 },
      },
    ];
  }
}

export const dashboardService = new DashboardService();
