/**
 * Session Management Service
 * Controla sessões ativas, dispositivos e segurança
 */

import { getDb } from '../db';
import * as schema from '../../drizzle/schema';
import { eq, and, gt, desc } from 'drizzle-orm';
import { logAudit, AUDIT_ACTIONS } from './auditService';
import { createSecurityAlert } from './securityAlertService';
import crypto from 'crypto';

interface CreateSessionData {
  userId: number;
  sessionToken: string;
  refreshToken?: string;
  deviceName?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'other';
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  expiresInHours?: number;
}

/**
 * Criar nova sessão
 */
export async function createSession(data: CreateSessionData) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (data.expiresInHours || 24));

  const [session] = await db
    .insert(schema.userSessions)
    .values({
      userId: data.userId,
      sessionToken: data.sessionToken,
      refreshToken: data.refreshToken,
      deviceName: data.deviceName,
      deviceType: data.deviceType || 'other',
      browser: data.browser,
      os: data.os,
      ipAddress: data.ipAddress,
      location: data.location,
      isActive: true,
      lastActivity: new Date(),
      expiresAt,
    })
    .$returningId();

  // Log audit
  await logAudit({
    userId: data.userId,
    action: AUDIT_ACTIONS.SESSION_CREATED,
    entityType: 'session',
    entityId: session.id,
    ipAddress: data.ipAddress,
    userAgent: `${data.browser} on ${data.os}`,
    metadata: { deviceType: data.deviceType, location: data.location },
  });

  // Verificar se é novo dispositivo/localização
  await checkForNewDevice(data.userId, data.deviceName, data.ipAddress);

  return session;
}

/**
 * Buscar sessões ativas de um usuário
 */
export async function getUserSessions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const sessions = await db
    .select()
    .from(schema.userSessions)
    .where(
      and(
        eq(schema.userSessions.userId, userId),
        eq(schema.userSessions.isActive, true),
        gt(schema.userSessions.expiresAt, new Date())
      )
    )
    .orderBy(desc(schema.userSessions.lastActivity));

  return sessions;
}

/**
 * Atualizar última atividade da sessão
 */
export async function updateSessionActivity(sessionToken: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(schema.userSessions)
    .set({ lastActivity: new Date() })
    .where(eq(schema.userSessions.sessionToken, sessionToken));
}

/**
 * Terminar uma sessão específica
 */
export async function terminateSession(userId: number, sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(schema.userSessions)
    .set({ isActive: false })
    .where(
      and(
        eq(schema.userSessions.id, sessionId),
        eq(schema.userSessions.userId, userId)
      )
    );

  // Log audit
  await logAudit({
    userId,
    action: AUDIT_ACTIONS.SESSION_TERMINATED,
    entityType: 'session',
    entityId: sessionId,
  });

  return { success: true };
}

/**
 * Terminar todas as sessões exceto a atual
 */
export async function terminateOtherSessions(
  userId: number,
  currentSessionToken: string
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db
    .update(schema.userSessions)
    .set({ isActive: false })
    .where(
      and(
        eq(schema.userSessions.userId, userId),
        // TODO: Adicionar NOT condition quando suportado
      )
    );

  // Reativar sessão atual
  await db
    .update(schema.userSessions)
    .set({ isActive: true })
    .where(eq(schema.userSessions.sessionToken, currentSessionToken));

  // Log audit
  await logAudit({
    userId,
    action: 'all_sessions_terminated',
    entityType: 'security',
  });

  return { success: true, message: 'Outras sessões foram encerradas' };
}

/**
 * Limpar sessões expiradas
 */
export async function cleanupExpiredSessions() {
  const db = await getDb();
  if (!db) return;

  await db
    .update(schema.userSessions)
    .set({ isActive: false })
    .where(
      and(
        eq(schema.userSessions.isActive, true),
        // TODO: Adicionar condition para expiresAt < NOW()
      )
    );
}

/**
 * Verificar se é um novo dispositivo
 */
async function checkForNewDevice(
  userId: number,
  deviceName?: string,
  ipAddress?: string
) {
  const db = await getDb();
  if (!db) return;

  // Buscar sessões antigas do usuário
  const previousSessions = await db
    .select()
    .from(schema.userSessions)
    .where(eq(schema.userSessions.userId, userId))
    .limit(10);

  // Verificar se é novo dispositivo
  const isNewDevice =
    deviceName &&
    !previousSessions.some((s) => s.deviceName === deviceName);

  // Verificar se é novo IP
  const isNewIP =
    ipAddress && !previousSessions.some((s) => s.ipAddress === ipAddress);

  if (isNewDevice || isNewIP) {
    await createSecurityAlert({
      userId,
      alertType: 'new_login',
      severity: 'warning',
      title: 'Novo login detectado',
      description: `Login realizado de ${isNewDevice ? 'novo dispositivo' : 'novo local'}: ${deviceName || ipAddress}`,
      ipAddress,
      deviceInfo: deviceName,
      actionRequired: false,
    });
  }
}

/**
 * Obter estatísticas de sessões
 */
export async function getSessionStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const sessions = await getUserSessions(userId);

  const deviceTypes = sessions.reduce((acc, s) => {
    acc[s.deviceType] = (acc[s.deviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const locations = [...new Set(sessions.map((s) => s.location).filter(Boolean))];

  return {
    totalActiveSessions: sessions.length,
    deviceTypes,
    uniqueLocations: locations.length,
    locations,
    oldestSession: sessions[sessions.length - 1]?.createdAt,
    newestSession: sessions[0]?.createdAt,
  };
}

/**
 * Gerar token de sessão seguro
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Gerar refresh token
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Verificar se sessão é válida
 */
export async function validateSession(sessionToken: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [session] = await db
    .select()
    .from(schema.userSessions)
    .where(eq(schema.userSessions.sessionToken, sessionToken))
    .limit(1);

  if (!session) return false;
  if (!session.isActive) return false;
  if (new Date() > new Date(session.expiresAt)) return false;

  // Atualizar última atividade
  await updateSessionActivity(sessionToken);

  return true;
}
