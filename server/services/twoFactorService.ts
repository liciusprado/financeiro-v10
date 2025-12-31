/**
 * Two-Factor Authentication Service
 * Implementação completa de 2FA com TOTP (Google Authenticator)
 */

import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { getDb } from './db';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { logAudit } from './auditService';

/**
 * Gerar secret e QR Code para configurar 2FA
 */
export async function generate2FASecret(userId: number, email: string) {
  const secret = speakeasy.generateSecret({
    name: `Planejamento Financeiro (${email})`,
    issuer: 'Planejamento Financeiro',
  });

  // Gerar QR Code como data URL
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  // Gerar códigos de backup (10 códigos de 8 dígitos)
  const backupCodes = Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
    backupCodes,
  };
}

/**
 * Habilitar 2FA para usuário
 */
export async function enable2FA(data: {
  userId: number;
  secret: string;
  verificationCode: string;
  backupCodes: string[];
  method?: 'totp' | 'sms' | 'email';
  phoneNumber?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Verificar código antes de habilitar
  const isValid = speakeasy.totp.verify({
    secret: data.secret,
    encoding: 'base32',
    token: data.verificationCode,
    window: 2, // Permite 2 códigos antes/depois (60 segundos de margem)
  });

  if (!isValid) {
    throw new Error('Código de verificação inválido');
  }

  // Salvar configuração 2FA
  await db
    .insert(schema.twoFactorAuth)
    .values({
      userId: data.userId,
      isEnabled: true,
      secret: data.secret,
      backupCodes: JSON.stringify(data.backupCodes),
      method: data.method || 'totp',
      phoneNumber: data.phoneNumber,
      verifiedAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        isEnabled: true,
        secret: data.secret,
        backupCodes: JSON.stringify(data.backupCodes),
        method: data.method || 'totp',
        verifiedAt: new Date(),
      },
    });

  // Audit log
  await logAudit({
    userId: data.userId,
    action: '2fa_enabled',
    entityType: 'security',
    status: 'success',
  });

  return {
    success: true,
    message: '2FA habilitado com sucesso!',
  };
}

/**
 * Desabilitar 2FA
 */
export async function disable2FA(userId: number, verificationCode: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Buscar config atual
  const [config] = await db
    .select()
    .from(schema.twoFactorAuth)
    .where(eq(schema.twoFactorAuth.userId, userId))
    .limit(1);

  if (!config) {
    throw new Error('2FA não está habilitado');
  }

  // Verificar código
  const isValid = speakeasy.totp.verify({
    secret: config.secret,
    encoding: 'base32',
    token: verificationCode,
    window: 2,
  });

  if (!isValid) {
    throw new Error('Código de verificação inválido');
  }

  // Desabilitar
  await db
    .update(schema.twoFactorAuth)
    .set({ isEnabled: false })
    .where(eq(schema.twoFactorAuth.userId, userId));

  // Audit log
  await logAudit({
    userId,
    action: '2fa_disabled',
    entityType: 'security',
    status: 'success',
  });

  return {
    success: true,
    message: '2FA desabilitado',
  };
}

/**
 * Verificar código 2FA
 */
export async function verify2FACode(userId: number, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [config] = await db
    .select()
    .from(schema.twoFactorAuth)
    .where(eq(schema.twoFactorAuth.userId, userId))
    .limit(1);

  if (!config || !config.isEnabled) {
    return true; // 2FA não está habilitado, permitir
  }

  // Verificar código TOTP
  const isValidTOTP = speakeasy.totp.verify({
    secret: config.secret,
    encoding: 'base32',
    token: code,
    window: 2,
  });

  if (isValidTOTP) {
    return true;
  }

  // Verificar código de backup
  const backupCodes = JSON.parse(config.backupCodes || '[]') as string[];
  const codeIndex = backupCodes.indexOf(code.toUpperCase());

  if (codeIndex !== -1) {
    // Remover código usado
    backupCodes.splice(codeIndex, 1);
    await db
      .update(schema.twoFactorAuth)
      .set({ backupCodes: JSON.stringify(backupCodes) })
      .where(eq(schema.twoFactorAuth.userId, userId));

    return true;
  }

  return false;
}

/**
 * Verificar se usuário tem 2FA habilitado
 */
export async function has2FAEnabled(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [config] = await db
    .select()
    .from(schema.twoFactorAuth)
    .where(eq(schema.twoFactorAuth.userId, userId))
    .limit(1);

  return config?.isEnabled || false;
}

/**
 * Gerar novos códigos de backup
 */
export async function regenerateBackupCodes(
  userId: number,
  verificationCode: string
): Promise<string[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Verificar código primeiro
  const isValid = await verify2FACode(userId, verificationCode);
  if (!isValid) {
    throw new Error('Código inválido');
  }

  // Gerar novos códigos
  const newBackupCodes = Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );

  await db
    .update(schema.twoFactorAuth)
    .set({ backupCodes: JSON.stringify(newBackupCodes) })
    .where(eq(schema.twoFactorAuth.userId, userId));

  // Audit log
  await logAudit({
    userId,
    action: 'backup_codes_regenerated',
    entityType: 'security',
    status: 'success',
  });

  return newBackupCodes;
}

/**
 * Obter status 2FA do usuário
 */
export async function get2FAStatus(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [config] = await db
    .select()
    .from(schema.twoFactorAuth)
    .where(eq(schema.twoFactorAuth.userId, userId))
    .limit(1);

  if (!config) {
    return {
      enabled: false,
      method: null,
      verifiedAt: null,
      backupCodesRemaining: 0,
    };
  }

  const backupCodes = JSON.parse(config.backupCodes || '[]') as string[];

  return {
    enabled: config.isEnabled,
    method: config.method,
    verifiedAt: config.verifiedAt,
    backupCodesRemaining: backupCodes.length,
  };
}
