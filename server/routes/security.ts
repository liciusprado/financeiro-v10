/**
 * Security Routes
 * tRPC routes para 2FA, sessões, audit logs e alertas
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';

// 2FA Service
import {
  generate2FASecret,
  enable2FA,
  disable2FA,
  verify2FACode,
  get2FAStatus,
  regenerateBackupCodes,
} from '../services/twoFactorService';

// Session Service
import {
  getUserSessions,
  terminateSession,
  terminateOtherSessions,
  getSessionStats,
} from '../services/sessionService';

// Audit Service
import {
  getUserAuditLogs,
  getEntityAuditLogs,
  getAuditStats,
} from '../services/auditService';

// Security Alert Service
import {
  getUserAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  dismissAlert,
  getUnreadAlertCount,
} from '../services/securityAlertService';

export const securityRouter = router({
  // ========== 2FA ==========

  /**
   * Gerar secret e QR code para configurar 2FA
   */
  generate2FASecret: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await generate2FASecret(ctx.user.id, ctx.user.email);
      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }),

  /**
   * Habilitar 2FA
   */
  enable2FA: protectedProcedure
    .input(
      z.object({
        secret: z.string(),
        verificationCode: z.string().length(6),
        backupCodes: z.array(z.string()),
        method: z.enum(['totp', 'sms', 'email']).optional(),
        phoneNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await enable2FA({
          userId: ctx.user.id,
          ...input,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  /**
   * Desabilitar 2FA
   */
  disable2FA: protectedProcedure
    .input(
      z.object({
        verificationCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await disable2FA(ctx.user.id, input.verificationCode);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  /**
   * Obter status 2FA
   */
  get2FAStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const status = await get2FAStatus(ctx.user.id);
      return {
        success: true,
        ...status,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }),

  /**
   * Regenerar códigos de backup
   */
  regenerateBackupCodes: protectedProcedure
    .input(
      z.object({
        verificationCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const codes = await regenerateBackupCodes(
          ctx.user.id,
          input.verificationCode
        );
        return {
          success: true,
          backupCodes: codes,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  // ========== SESSIONS ==========

  /**
   * Listar sessões ativas
   */
  getSessions: protectedProcedure.query(async ({ ctx }) => {
    try {
      const sessions = await getUserSessions(ctx.user.id);
      return {
        success: true,
        sessions,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }),

  /**
   * Terminar uma sessão específica
   */
  terminateSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await terminateSession(ctx.user.id, input.sessionId);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
    }),

  /**
   * Terminar todas as outras sessões
   */
  terminateOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // TODO: Pegar session token atual do ctx
      const currentToken = 'current_token'; // Placeholder
      const result = await terminateOtherSessions(ctx.user.id, currentToken);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }),

  /**
   * Estatísticas de sessões
   */
  getSessionStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await getSessionStats(ctx.user.id);
      return {
        success: true,
        ...stats,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }),

  // ========== AUDIT LOGS ==========

  /**
   * Buscar audit logs do usuário
   */
  getAuditLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        actions: z.array(z.string()).optional(),
        status: z.enum(['success', 'failed', 'warning']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const logs = await getUserAuditLogs(ctx.user.id, input);
        return {
          success: true,
          logs,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
    }),

  /**
   * Buscar audit logs de uma entidade
   */
  getEntityAuditLogs: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const logs = await getEntityAuditLogs(
          input.entityType,
          input.entityId,
          input.limit
        );
        return {
          success: true,
          logs,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
    }),

  /**
   * Estatísticas de audit logs
   */
  getAuditStats: protectedProcedure
    .input(
      z.object({
        days: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const stats = await getAuditStats(ctx.user.id, input.days);
        return {
          success: true,
          ...stats,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
    }),

  // ========== SECURITY ALERTS ==========

  /**
   * Buscar alertas de segurança
   */
  getSecurityAlerts: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const alerts = await getUserAlerts(ctx.user.id, input);
        return {
          success: true,
          alerts,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
    }),

  /**
   * Marcar alerta como lido
   */
  markAlertAsRead: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await markAlertAsRead(ctx.user.id, input.alertId);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
    }),

  /**
   * Marcar todos alertas como lidos
   */
  markAllAlertsAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await markAllAlertsAsRead(ctx.user.id);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }),

  /**
   * Dispensar alerta
   */
  dismissAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await dismissAlert(ctx.user.id, input.alertId);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }
    }),

  /**
   * Contagem de alertas não lidos
   */
  getUnreadAlertCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const count = await getUnreadAlertCount(ctx.user.id);
      return {
        success: true,
        ...count,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }),
});
