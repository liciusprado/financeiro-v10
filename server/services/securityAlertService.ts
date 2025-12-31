/**
 * Security Alerts Service
 * Gerencia alertas de segurança para usuários
 */

import { getDb } from '../db';
import * as schema from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

interface SecurityAlertData {
  userId: number;
  alertType:
    | 'new_login'
    | 'password_changed'
    | '2fa_enabled'
    | '2fa_disabled'
    | 'suspicious_activity'
    | 'failed_login_attempts'
    | 'session_expired'
    | 'data_export'
    | 'account_deletion';
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
  ipAddress?: string;
  location?: string;
  deviceInfo?: string;
  actionRequired?: boolean;
  actionUrl?: string;
}

/**
 * Criar alerta de segurança
 */
export async function createSecurityAlert(data: SecurityAlertData) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [alert] = await db
    .insert(schema.securityAlerts)
    .values({
      userId: data.userId,
      alertType: data.alertType,
      severity: data.severity || 'info',
      title: data.title,
      description: data.description,
      ipAddress: data.ipAddress,
      location: data.location,
      deviceInfo: data.deviceInfo,
      isRead: false,
      isDismissed: false,
      actionRequired: data.actionRequired || false,
      actionUrl: data.actionUrl,
    })
    .$returningId();

  // TODO: Enviar notificação push/email se configurado
  await notifyUser(data.userId, data.alertType, data.severity);

  return alert;
}

/**
 * Buscar alertas de um usuário
 */
export async function getUserAlerts(
  userId: number,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const { unreadOnly = false, limit = 50, offset = 0 } = options;

  let query = db
    .select()
    .from(schema.securityAlerts)
    .where(eq(schema.securityAlerts.userId, userId))
    .$dynamic();

  if (unreadOnly) {
    query = query.where(
      and(
        eq(schema.securityAlerts.userId, userId),
        eq(schema.securityAlerts.isRead, false),
        eq(schema.securityAlerts.isDismissed, false)
      )
    );
  }

  const alerts = await query
    .orderBy(desc(schema.securityAlerts.createdAt))
    .limit(limit)
    .offset(offset);

  return alerts;
}

/**
 * Marcar alerta como lido
 */
export async function markAlertAsRead(userId: number, alertId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(schema.securityAlerts)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(schema.securityAlerts.id, alertId),
        eq(schema.securityAlerts.userId, userId)
      )
    );

  return { success: true };
}

/**
 * Marcar todos alertas como lidos
 */
export async function markAllAlertsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(schema.securityAlerts)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(schema.securityAlerts.userId, userId),
        eq(schema.securityAlerts.isRead, false)
      )
    );

  return { success: true };
}

/**
 * Dispensar alerta
 */
export async function dismissAlert(userId: number, alertId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(schema.securityAlerts)
    .set({ isDismissed: true, dismissedAt: new Date() })
    .where(
      and(
        eq(schema.securityAlerts.id, alertId),
        eq(schema.securityAlerts.userId, userId)
      )
    );

  return { success: true };
}

/**
 * Obter contagem de alertas não lidos
 */
export async function getUnreadAlertCount(userId: number): Promise<{
  total: number;
  critical: number;
  warning: number;
  info: number;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const alerts = await db
    .select()
    .from(schema.securityAlerts)
    .where(
      and(
        eq(schema.securityAlerts.userId, userId),
        eq(schema.securityAlerts.isRead, false),
        eq(schema.securityAlerts.isDismissed, false)
      )
    );

  return {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  };
}

/**
 * Alertas pré-definidos para eventos comuns
 */
export const ALERT_TEMPLATES = {
  NEW_LOGIN: (deviceInfo: string, location?: string) => ({
    alertType: 'new_login' as const,
    severity: 'warning' as const,
    title: '🔐 Novo login detectado',
    description: `Um novo login foi realizado em: ${deviceInfo}${location ? ` de ${location}` : ''}. Se não foi você, mude sua senha imediatamente.`,
    actionRequired: true,
    actionUrl: '/configuracoes/seguranca',
  }),

  PASSWORD_CHANGED: () => ({
    alertType: 'password_changed' as const,
    severity: 'info' as const,
    title: '✅ Senha alterada',
    description: 'Sua senha foi alterada com sucesso. Se não foi você, contate o suporte imediatamente.',
    actionRequired: false,
  }),

  TWO_FA_ENABLED: () => ({
    alertType: '2fa_enabled' as const,
    severity: 'info' as const,
    title: '🔒 2FA ativado',
    description: 'Autenticação de dois fatores foi ativada em sua conta. Sua conta está mais segura agora!',
    actionRequired: false,
  }),

  TWO_FA_DISABLED: () => ({
    alertType: '2fa_disabled' as const,
    severity: 'warning' as const,
    title: '⚠️ 2FA desativado',
    description: 'Autenticação de dois fatores foi desativada. Recomendamos reativar para maior segurança.',
    actionRequired: true,
    actionUrl: '/configuracoes/seguranca',
  }),

  SUSPICIOUS_ACTIVITY: (details: string) => ({
    alertType: 'suspicious_activity' as const,
    severity: 'critical' as const,
    title: '🚨 Atividade suspeita detectada',
    description: `Detectamos atividade incomum em sua conta: ${details}. Recomendamos revisar suas configurações de segurança.`,
    actionRequired: true,
    actionUrl: '/configuracoes/seguranca',
  }),

  FAILED_LOGIN_ATTEMPTS: (count: number, ipAddress?: string) => ({
    alertType: 'failed_login_attempts' as const,
    severity: 'warning' as const,
    title: '⚠️ Múltiplas tentativas de login falhadas',
    description: `Detectamos ${count} tentativas de login falhadas${ipAddress ? ` do IP ${ipAddress}` : ''}. Se não foi você, sua conta pode estar sendo atacada.`,
    actionRequired: true,
    actionUrl: '/configuracoes/seguranca',
  }),

  SESSION_EXPIRED: () => ({
    alertType: 'session_expired' as const,
    severity: 'info' as const,
    title: '⏱️ Sessão expirada',
    description: 'Sua sessão expirou por inatividade. Faça login novamente para continuar.',
    actionRequired: false,
  }),

  DATA_EXPORT: () => ({
    alertType: 'data_export' as const,
    severity: 'info' as const,
    title: '📦 Exportação de dados solicitada',
    description: 'Uma exportação de seus dados foi solicitada. Você receberá um email quando estiver pronta.',
    actionRequired: false,
  }),
};

/**
 * Notificar usuário (placeholder para integração futura)
 */
async function notifyUser(
  userId: number,
  alertType: string,
  severity?: string
) {
  // TODO: Implementar notificações push/email
  console.log(`[SECURITY ALERT] User ${userId}: ${alertType} (${severity})`);
}

/**
 * Limpar alertas antigos (mais de 90 dias)
 */
export async function cleanupOldAlerts() {
  const db = await getDb();
  if (!db) return;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // TODO: Adicionar delete quando suportado
  // await db
  //   .delete(schema.securityAlerts)
  //   .where(lt(schema.securityAlerts.createdAt, ninetyDaysAgo));
}
