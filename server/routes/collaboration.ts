/**
 * Collaboration Routes
 * tRPC routes for groups, permissions, approvals, and chat
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  addEntryComment,
  getEntryComments,
  addApprovalRequest,
  respondToApproval,
  getPendingApprovals,
  logActivity,
  getActivityLogs,
  sendChatMessage,
  getChatMessages,
} from '../collaborationService';

export const collaborationRouter = router({
  // ========== GROUPS ==========

  /**
   * Criar novo grupo/família
   */
  createGroup: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Implementar na collaborationService
      return {
        success: true,
        groupId: 1,
        message: 'Grupo criado!',
      };
    }),

  /**
   * Listar grupos do usuário
   */
  listGroups: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Implementar
    return {
      groups: [],
    };
  }),

  /**
   * Adicionar membro ao grupo
   */
  addMember: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        email: z.string().email(),
        role: z.enum(['admin', 'editor', 'viewer']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Implementar
      return {
        success: true,
        message: 'Convite enviado!',
      };
    }),

  /**
   * Remover membro do grupo
   */
  removeMember: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Implementar
      return {
        success: true,
      };
    }),

  /**
   * Atualizar permissão de membro
   */
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        userId: z.number(),
        role: z.enum(['admin', 'editor', 'viewer']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Implementar
      return {
        success: true,
      };
    }),

  // ========== COMMENTS ==========

  /**
   * Adicionar comentário em transação
   */
  addComment: protectedProcedure
    .input(
      z.object({
        entryId: z.number(),
        comment: z.string().min(1),
        type: z
          .enum(['comment', 'question', 'approval_request', 'approval', 'rejection'])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await addEntryComment({
          entryId: input.entryId,
          userId: ctx.user.id,
          comment: input.comment,
          type: input.type,
        });

        return {
          success: true,
          commentId: result.id,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao adicionar comentário: ' + error.message,
        });
      }
    }),

  /**
   * Listar comentários de uma transação
   */
  getComments: protectedProcedure
    .input(
      z.object({
        entryId: z.number(),
      })
    )
    .query(async ({ input }) => {
      try {
        const comments = await getEntryComments(input.entryId);
        return {
          success: true,
          comments,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar comentários: ' + error.message,
        });
      }
    }),

  // ========== APPROVALS ==========

  /**
   * Solicitar aprovação de despesa
   */
  requestApproval: protectedProcedure
    .input(
      z.object({
        entryId: z.number(),
        amount: z.number(),
        description: z.string().optional(),
        approverId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await addApprovalRequest({
          entryId: input.entryId,
          requestedBy: ctx.user.id,
          amount: input.amount,
          description: input.description,
          approverId: input.approverId,
        });

        return {
          success: true,
          approvalId: result.id,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao solicitar aprovação: ' + error.message,
        });
      }
    }),

  /**
   * Aprovar/Rejeitar solicitação
   */
  respondApproval: protectedProcedure
    .input(
      z.object({
        approvalId: z.number(),
        status: z.enum(['approved', 'rejected']),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await respondToApproval({
          approvalId: input.approvalId,
          approverId: ctx.user.id,
          status: input.status,
          comment: input.comment,
        });

        return {
          success: true,
          message:
            input.status === 'approved'
              ? 'Despesa aprovada!'
              : 'Despesa rejeitada!',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao responder aprovação: ' + error.message,
        });
      }
    }),

  /**
   * Listar aprovações pendentes
   */
  getPendingApprovals: protectedProcedure.query(async ({ ctx }) => {
    try {
      const approvals = await getPendingApprovals(ctx.user.id);
      return {
        success: true,
        approvals,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao buscar aprovações: ' + error.message,
      });
    }
  }),

  // ========== ACTIVITY LOGS ==========

  /**
   * Registrar atividade
   */
  logActivity: protectedProcedure
    .input(
      z.object({
        activityType: z.string(),
        description: z.string(),
        entityType: z.string().optional(),
        entityId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await logActivity({
          userId: ctx.user.id,
          activityType: input.activityType,
          description: input.description,
          entityType: input.entityType,
          entityId: input.entityId,
        });

        return {
          success: true,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao registrar atividade: ' + error.message,
        });
      }
    }),

  /**
   * Buscar log de atividades
   */
  getActivities: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const activities = await getActivityLogs(ctx.user.id, input.limit, input.offset);
        return {
          success: true,
          activities,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar atividades: ' + error.message,
        });
      }
    }),

  // ========== CHAT ==========

  /**
   * Enviar mensagem no chat
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        message: z.string().min(1),
        replyTo: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await sendChatMessage({
          groupId: input.groupId,
          userId: ctx.user.id,
          message: input.message,
          replyTo: input.replyTo,
        });

        return {
          success: true,
          messageId: result.id,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao enviar mensagem: ' + error.message,
        });
      }
    }),

  /**
   * Buscar mensagens do chat
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const messages = await getChatMessages(
          input.groupId,
          input.limit,
          input.offset
        );

        return {
          success: true,
          messages,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar mensagens: ' + error.message,
        });
      }
    }),

  /**
   * Marcar mensagens como lidas
   */
  markMessagesRead: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Implementar
      return {
        success: true,
      };
    }),

  // ========== STATISTICS ==========

  /**
   * Estatísticas de colaboração
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      // TODO: Implementar estatísticas
      return {
        success: true,
        stats: {
          totalGroups: 0,
          totalMembers: 0,
          pendingApprovals: 0,
          unreadMessages: 0,
          recentActivities: 0,
        },
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao buscar estatísticas: ' + error.message,
      });
    }
  }),
});
