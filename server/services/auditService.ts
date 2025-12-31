/**
 * Audit Service
 * Registra todas ações importantes do sistema
 */

import { getDb } from '../db';
import * as schema from '../../drizzle/schema';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

interface AuditLogData {
  userId: number;
  action: string;
  entityType?: string;
  entityId?: number;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failed' | 'warning';
  errorMessage?: string;
  metadata?: any;
}

/**
 * Registrar ação no audit log
 */
export async function logAudit(data: AuditLogData) {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(schema.auditLogs).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
      newValues: data.newValues ? JSON.stringify(data.newValues) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      status: data.status || 'success',
      errorMessage: data.errorMessage,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  } catch (error) {
    // Não deixar erro no audit log quebrar a operação principal
    console.error('Error logging audit:', error);
  }
}

/**
 * Buscar audit logs de um usuário
 */
export async function getUserAuditLogs(
  userId: number,
  options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    actions?: string[];
    entityTypes?: string[];
    status?: 'success' | 'failed' | 'warning';
  } = {}
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const {
    limit = 50,
    offset = 0,
    startDate,
    endDate,
    actions,
    entityTypes,
    status,
  } = options;

  let query = db
    .select()
    .from(schema.auditLogs)
    .where(eq(schema.auditLogs.userId, userId))
    .$dynamic();

  // Filtros opcionais
  const conditions: any[] = [eq(schema.auditLogs.userId, userId)];

  if (startDate) {
    conditions.push(gte(schema.auditLogs.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(schema.auditLogs.createdAt, endDate));
  }

  if (status) {
    conditions.push(eq(schema.auditLogs.status, status));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const logs = await query
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  // Parse JSON fields
  return logs.map((log) => ({
    ...log,
    oldValues: log.oldValues ? JSON.parse(log.oldValues as any) : null,
    newValues: log.newValues ? JSON.parse(log.newValues as any) : null,
    metadata: log.metadata ? JSON.parse(log.metadata as any) : null,
  }));
}

/**
 * Buscar audit logs de uma entidade específica
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: number,
  limit: number = 50
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const logs = await db
    .select()
    .from(schema.auditLogs)
    .where(
      and(
        eq(schema.auditLogs.entityType, entityType),
        eq(schema.auditLogs.entityId, entityId)
      )
    )
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit);

  return logs.map((log) => ({
    ...log,
    oldValues: log.oldValues ? JSON.parse(log.oldValues as any) : null,
    newValues: log.newValues ? JSON.parse(log.newValues as any) : null,
    metadata: log.metadata ? JSON.parse(log.metadata as any) : null,
  }));
}

/**
 * Estatísticas de audit logs
 */
export async function getAuditStats(
  userId: number,
  days: number = 30
): Promise<{
  totalActions: number;
  successCount: number;
  failedCount: number;
  warningCount: number;
  topActions: { action: string; count: number }[];
  actionsByDay: { date: string; count: number }[];
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await db
    .select()
    .from(schema.auditLogs)
    .where(
      and(
        eq(schema.auditLogs.userId, userId),
        gte(schema.auditLogs.createdAt, startDate)
      )
    );

  // Contar por status
  const successCount = logs.filter((l) => l.status === 'success').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;
  const warningCount = logs.filter((l) => l.status === 'warning').length;

  // Top ações
  const actionCounts: Record<string, number> = {};
  logs.forEach((log) => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });

  const topActions = Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([action, count]) => ({ action, count }));

  // Ações por dia
  const actionsByDay: Record<string, number> = {};
  logs.forEach((log) => {
    const date = new Date(log.createdAt!).toISOString().split('T')[0];
    actionsByDay[date] = (actionsByDay[date] || 0) + 1;
  });

  return {
    totalActions: logs.length,
    successCount,
    failedCount,
    warningCount,
    topActions,
    actionsByDay: Object.entries(actionsByDay).map(([date, count]) => ({
      date,
      count,
    })),
  };
}

/**
 * Tipos de ações comuns para audit log
 */
export const AUDIT_ACTIONS = {
  // Auth
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGED: 'password_changed',
  PASSWORD_RESET: 'password_reset',

  // 2FA
  TWO_FA_ENABLED: '2fa_enabled',
  TWO_FA_DISABLED: '2fa_disabled',
  TWO_FA_VERIFIED: '2fa_verified',
  BACKUP_CODES_GENERATED: 'backup_codes_regenerated',

  // Transactions
  TRANSACTION_CREATED: 'transaction_created',
  TRANSACTION_UPDATED: 'transaction_updated',
  TRANSACTION_DELETED: 'transaction_deleted',
  BULK_IMPORT: 'bulk_import',

  // Goals
  GOAL_CREATED: 'goal_created',
  GOAL_UPDATED: 'goal_updated',
  GOAL_DELETED: 'goal_deleted',
  GOAL_COMPLETED: 'goal_completed',

  // Budget
  BUDGET_CREATED: 'budget_created',
  BUDGET_UPDATED: 'budget_updated',
  BUDGET_DELETED: 'budget_deleted',

  // Open Banking
  BANK_CONNECTED: 'bank_connected',
  BANK_DISCONNECTED: 'bank_disconnected',
  BANK_SYNC: 'bank_sync',

  // Collaboration
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  APPROVAL_GRANTED: 'approval_granted',
  APPROVAL_DENIED: 'approval_denied',

  // Security
  SESSION_CREATED: 'session_created',
  SESSION_TERMINATED: 'session_terminated',
  SECURITY_ALERT: 'security_alert',
  DATA_EXPORTED: 'data_exported',
  ACCOUNT_DELETED: 'account_deleted',

  // Settings
  SETTINGS_UPDATED: 'settings_updated',
  CATEGORY_CREATED: 'category_created',
  CATEGORY_DELETED: 'category_deleted',
};
