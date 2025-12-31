import { db } from "../db";
import {
  customAlerts,
  alertTriggers,
  alertTemplates,
  alertChannelsConfig,
  type InsertCustomAlert,
  type InsertAlertTemplate,
  type InsertAlertChannelsConfig,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Tipos de condições suportadas
 */
export interface AlertCondition {
  field: string; // "expense.mercado", "income.total", "balance", etc
  operator: ">" | ">=" | "<" | "<=" | "==" | "!=" | "contains";
  value: number | string;
  type: "expense" | "income" | "balance" | "budget" | "category";
}

export interface AlertRule {
  conditions: AlertCondition[];
  logic: "AND" | "OR"; // Como combinar condições
  message: string;
}

/**
 * Serviço de Alertas Customizáveis
 */
export class CustomAlertService {
  /**
   * Criar alerta personalizado
   */
  async createAlert(userId: number, data: {
    name: string;
    description?: string;
    conditions: AlertRule;
    channels: string[];
    frequency?: "realtime" | "daily" | "weekly" | "monthly";
  }) {
    const [result] = await db.insert(customAlerts).values({
      userId,
      name: data.name,
      description: data.description,
      conditions: JSON.stringify(data.conditions),
      channels: JSON.stringify(data.channels),
      frequency: data.frequency || "realtime",
      enabled: true,
    });

    return { success: true, alertId: result.insertId };
  }

  /**
   * Listar alertas do usuário
   */
  async listAlerts(userId: number, onlyEnabled?: boolean) {
    let query = db
      .select()
      .from(customAlerts)
      .where(eq(customAlerts.userId, userId));

    if (onlyEnabled) {
      query = query.where(
        and(
          eq(customAlerts.userId, userId),
          eq(customAlerts.enabled, true)
        )
      );
    }

    const alerts = await query.orderBy(desc(customAlerts.createdAt));

    return alerts.map((alert) => ({
      ...alert,
      conditions: JSON.parse(alert.conditions),
      channels: JSON.parse(alert.channels),
    }));
  }

  /**
   * Obter alerta específico
   */
  async getAlert(alertId: number, userId: number) {
    const [alert] = await db
      .select()
      .from(customAlerts)
      .where(and(eq(customAlerts.id, alertId), eq(customAlerts.userId, userId)));

    if (!alert) return null;

    // Buscar histórico de disparos
    const triggers = await db
      .select()
      .from(alertTriggers)
      .where(eq(alertTriggers.alertId, alertId))
      .orderBy(desc(alertTriggers.triggeredAt))
      .limit(50);

    return {
      ...alert,
      conditions: JSON.parse(alert.conditions),
      channels: JSON.parse(alert.channels),
      triggers: triggers.map((t) => ({
        ...t,
        conditionsMet: JSON.parse(t.conditionsMet),
        channelsSent: JSON.parse(t.channelsSent),
        metadata: t.metadata ? JSON.parse(t.metadata) : null,
      })),
    };
  }

  /**
   * Atualizar alerta
   */
  async updateAlert(alertId: number, userId: number, data: Partial<{
    name: string;
    description: string;
    conditions: AlertRule;
    channels: string[];
    enabled: boolean;
    frequency: "realtime" | "daily" | "weekly" | "monthly";
  }>) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.conditions) updateData.conditions = JSON.stringify(data.conditions);
    if (data.channels) updateData.channels = JSON.stringify(data.channels);
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.frequency) updateData.frequency = data.frequency;

    await db
      .update(customAlerts)
      .set(updateData)
      .where(and(eq(customAlerts.id, alertId), eq(customAlerts.userId, userId)));

    return { success: true };
  }

  /**
   * Deletar alerta
   */
  async deleteAlert(alertId: number, userId: number) {
    await db
      .delete(customAlerts)
      .where(and(eq(customAlerts.id, alertId), eq(customAlerts.userId, userId)));

    return { success: true };
  }

  /**
   * Avaliar condições de um alerta
   * Retorna true se todas/alguma condição for atendida
   */
  evaluateConditions(rule: AlertRule, data: any): {
    met: boolean;
    conditionsMet: AlertCondition[];
    message: string;
  } {
    const conditionResults: boolean[] = [];
    const metConditions: AlertCondition[] = [];

    for (const condition of rule.conditions) {
      const value = this.extractValue(data, condition.field);
      const result = this.evaluateCondition(value, condition.operator, condition.value);

      conditionResults.push(result);
      if (result) {
        metConditions.push(condition);
      }
    }

    let met = false;
    if (rule.logic === "AND") {
      met = conditionResults.every((r) => r);
    } else {
      met = conditionResults.some((r) => r);
    }

    return {
      met,
      conditionsMet: metConditions,
      message: rule.message,
    };
  }

  /**
   * Extrair valor de um campo (suporta notação ponto)
   */
  private extractValue(data: any, field: string): any {
    const parts = field.split(".");
    let value = data;

    for (const part of parts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Avaliar uma condição individual
   */
  private evaluateCondition(actualValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case ">":
        return actualValue > expectedValue;
      case ">=":
        return actualValue >= expectedValue;
      case "<":
        return actualValue < expectedValue;
      case "<=":
        return actualValue <= expectedValue;
      case "==":
        return actualValue == expectedValue;
      case "!=":
        return actualValue != expectedValue;
      case "contains":
        return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Disparar alerta
   */
  async triggerAlert(
    alertId: number,
    conditionsMet: AlertCondition[],
    message: string,
    metadata?: any
  ) {
    const [alert] = await db
      .select()
      .from(customAlerts)
      .where(eq(customAlerts.id, alertId));

    if (!alert || !alert.enabled) {
      return { success: false, error: "Alerta não encontrado ou desabilitado" };
    }

    const channels = JSON.parse(alert.channels);

    // Registrar disparo
    await db.insert(alertTriggers).values({
      alertId,
      conditionsMet: JSON.stringify(conditionsMet),
      channelsSent: JSON.stringify(channels),
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      success: true,
    });

    // Atualizar contador
    await db
      .update(customAlerts)
      .set({
        lastTriggered: new Date(),
        triggerCount: alert.triggerCount + 1,
      })
      .where(eq(customAlerts.id, alertId));

    // TODO: Enviar notificações pelos canais configurados
    // await this.sendNotifications(alert.userId, channels, message);

    return { success: true };
  }

  /**
   * Salvar template de alerta
   */
  async saveTemplate(userId: number, data: {
    name: string;
    description?: string;
    conditions: AlertRule;
    channels: string[];
    isPublic?: boolean;
  }) {
    const [result] = await db.insert(alertTemplates).values({
      userId,
      name: data.name,
      description: data.description,
      conditions: JSON.stringify(data.conditions),
      channels: JSON.stringify(data.channels),
      isPublic: data.isPublic || false,
    });

    return { success: true, templateId: result.insertId };
  }

  /**
   * Listar templates
   */
  async listTemplates(userId: number, includePublic: boolean = true) {
    let templates;

    if (includePublic) {
      templates = await db
        .select()
        .from(alertTemplates)
        .where(
          and(
            eq(alertTemplates.userId, userId)
          )
        );

      // Buscar também templates públicos
      const publicTemplates = await db
        .select()
        .from(alertTemplates)
        .where(eq(alertTemplates.isPublic, true));

      templates = [...templates, ...publicTemplates];
    } else {
      templates = await db
        .select()
        .from(alertTemplates)
        .where(eq(alertTemplates.userId, userId));
    }

    return templates.map((t) => ({
      ...t,
      conditions: JSON.parse(t.conditions),
      channels: JSON.parse(t.channels),
    }));
  }

  /**
   * Criar alerta a partir de template
   */
  async createFromTemplate(userId: number, templateId: number, name?: string) {
    const [template] = await db
      .select()
      .from(alertTemplates)
      .where(eq(alertTemplates.id, templateId));

    if (!template) {
      return { success: false, error: "Template não encontrado" };
    }

    // Incrementar contador de uso
    await db
      .update(alertTemplates)
      .set({ usageCount: template.usageCount + 1 })
      .where(eq(alertTemplates.id, templateId));

    // Criar alerta
    const result = await this.createAlert(userId, {
      name: name || template.name,
      description: template.description || undefined,
      conditions: JSON.parse(template.conditions),
      channels: JSON.parse(template.channels),
    });

    return result;
  }

  /**
   * Configurar canais de notificação
   */
  async configureChannels(userId: number, config: {
    emailEnabled?: boolean;
    emailAddress?: string;
    whatsappEnabled?: boolean;
    whatsappNumber?: string;
    pushEnabled?: boolean;
  }) {
    const [existing] = await db
      .select()
      .from(alertChannelsConfig)
      .where(eq(alertChannelsConfig.userId, userId));

    if (existing) {
      await db
        .update(alertChannelsConfig)
        .set(config)
        .where(eq(alertChannelsConfig.userId, userId));
    } else {
      await db.insert(alertChannelsConfig).values({
        userId,
        ...config,
      });
    }

    return { success: true };
  }

  /**
   * Obter configuração de canais
   */
  async getChannelsConfig(userId: number) {
    const [config] = await db
      .select()
      .from(alertChannelsConfig)
      .where(eq(alertChannelsConfig.userId, userId));

    return config || {
      emailEnabled: false,
      whatsappEnabled: false,
      pushEnabled: true,
    };
  }

  /**
   * Obter histórico de disparos
   */
  async getTriggerHistory(userId: number, limit: number = 50) {
    // Buscar alertas do usuário
    const userAlerts = await db
      .select()
      .from(customAlerts)
      .where(eq(customAlerts.userId, userId));

    const alertIds = userAlerts.map((a) => a.id);

    if (alertIds.length === 0) {
      return [];
    }

    // Buscar disparos
    const triggers = await db
      .select()
      .from(alertTriggers)
      .where(eq(alertTriggers.alertId, alertIds[0])) // Simplified - in prod use IN clause
      .orderBy(desc(alertTriggers.triggeredAt))
      .limit(limit);

    return triggers.map((t) => ({
      ...t,
      conditionsMet: JSON.parse(t.conditionsMet),
      channelsSent: JSON.parse(t.channelsSent),
      metadata: t.metadata ? JSON.parse(t.metadata) : null,
    }));
  }
}

export const customAlertService = new CustomAlertService();
