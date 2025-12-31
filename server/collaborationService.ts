import { getDb } from "./db";
import { eq, and, or, desc } from "drizzle-orm";
import * as schema from "../drizzle/schema";

/**
 * Collaboration Service
 * 
 * Enables partner communication, approvals, and activity tracking
 * for shared financial management.
 */

/**
 * Add comment to an entry
 */
export async function addEntryComment(data: {
  entryId: number;
  userId: number;
  comment: string;
  type?: "comment" | "question" | "approval_request" | "approval" | "rejection";
}): Promise<{ id: number; success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(schema.entryComments).values({
    entryId: data.entryId,
    userId: data.userId,
    comment: data.comment,
    type: (data.type as any) || "comment",
    isRead: false,
  });

  // Log activity
  await logActivity({
    userId: data.userId,
    activityType: "comment_added",
    entryId: data.entryId,
    description: `Adicionou comentário: "${data.comment.substring(0, 50)}${data.comment.length > 50 ? "..." : ""}"`,
  });

  // Send notification to partner if push enabled
  try {
    await notifyPartner(data.userId, {
      type: "comment_added",
      entryId: data.entryId,
      message: `Novo comentário: ${data.comment}`,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }

  return { id: Number(result[0].insertId), success: true };
}

/**
 * Get comments for an entry
 */
export async function getEntryComments(entryId: number) {
  const db = await getDb();
  if (!db) return [];

  const comments = await db
    .select()
    .from(schema.entryComments)
    .where(eq(schema.entryComments.entryId, entryId))
    .orderBy(schema.entryComments.createdAt);

  // Join with users to get names
  const users = await db.select().from(schema.users);

  return comments.map((comment) => ({
    ...comment,
    userName: users.find((u) => u.id === comment.userId)?.name || "Desconhecido",
  }));
}

/**
 * Mark comment as read
 */
export async function markCommentRead(commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(schema.entryComments)
    .set({ isRead: true })
    .where(eq(schema.entryComments.id, commentId));

  return { success: true };
}

/**
 * Create approval request
 */
export async function createApprovalRequest(data: {
  entryId: number;
  requesterId: number;
  approverId: number;
  amount: number;
  reason?: string;
}): Promise<{ id: number; success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(schema.approvalRequests).values({
    entryId: data.entryId,
    requesterId: data.requesterId,
    approverId: data.approverId,
    amount: data.amount,
    reason: data.reason,
    status: "pending",
  });

  const approvalId = Number(result[0].insertId);

  // Log activity
  await logActivity({
    userId: data.requesterId,
    activityType: "approval_requested",
    entryId: data.entryId,
    approvalId,
    description: `Solicitou aprovação para gasto de ${formatCurrency(data.amount)}`,
    metadata: JSON.stringify({ reason: data.reason }),
  });

  // Mark entry as review requested
  await db
    .update(schema.entries)
    .set({ reviewRequested: true })
    .where(eq(schema.entries.id, data.entryId));

  // Send WhatsApp notification
  try {
    await notifyPartner(data.requesterId, {
      type: "approval_request",
      entryId: data.entryId,
      approvalId,
      message: `Solicitação de aprovação: ${formatCurrency(data.amount)}. Motivo: ${data.reason || "Não informado"}`,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }

  return { id: approvalId, success: true };
}

/**
 * Respond to approval request
 */
export async function respondToApproval(data: {
  approvalId: number;
  userId: number;
  status: "approved" | "rejected";
  notes?: string;
}): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get approval request
  const approval = await db
    .select()
    .from(schema.approvalRequests)
    .where(eq(schema.approvalRequests.id, data.approvalId))
    .limit(1);

  if (approval.length === 0) {
    throw new Error("Approval request not found");
  }

  const request = approval[0];

  // Update approval
  await db
    .update(schema.approvalRequests)
    .set({
      status: data.status,
      approverNotes: data.notes,
      respondedAt: new Date(),
    })
    .where(eq(schema.approvalRequests.id, data.approvalId));

  // Update entry
  if (data.status === "approved") {
    await db
      .update(schema.entries)
      .set({ reviewRequested: false })
      .where(eq(schema.entries.id, request.entryId));
  }

  // Log activity
  await logActivity({
    userId: data.userId,
    activityType: data.status === "approved" ? "approval_granted" : "approval_rejected",
    entryId: request.entryId,
    approvalId: data.approvalId,
    description: `${data.status === "approved" ? "Aprovou" : "Rejeitou"} solicitação de ${formatCurrency(request.amount)}`,
    metadata: JSON.stringify({ notes: data.notes }),
  });

  // Notify requester
  try {
    await notifyPartner(data.userId, {
      type: data.status === "approved" ? "approval_granted" : "approval_rejected",
      entryId: request.entryId,
      approvalId: data.approvalId,
      message: `Sua solicitação de ${formatCurrency(request.amount)} foi ${data.status === "approved" ? "aprovada" : "rejeitada"}. ${data.notes || ""}`,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }

  return { success: true };
}

/**
 * Get pending approvals for a user
 */
export async function getPendingApprovals(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const approvals = await db
    .select()
    .from(schema.approvalRequests)
    .where(
      and(
        eq(schema.approvalRequests.approverId, userId),
        eq(schema.approvalRequests.status, "pending")
      )
    )
    .orderBy(desc(schema.approvalRequests.createdAt));

  // Join with entries, items, categories, users
  const entries = await db.select().from(schema.entries);
  const items = await db.select().from(schema.items);
  const categories = await db.select().from(schema.categories);
  const users = await db.select().from(schema.users);

  return approvals.map((approval) => {
    const entry = entries.find((e) => e.id === approval.entryId);
    const item = entry ? items.find((i) => i.id === entry.itemId) : null;
    const category = item ? categories.find((c) => c.id === item.categoryId) : null;
    const requester = users.find((u) => u.id === approval.requesterId);

    return {
      ...approval,
      entryDetails: {
        month: entry?.month,
        year: entry?.year,
        itemName: item?.name,
        categoryName: category?.name,
      },
      requesterName: requester?.name || "Desconhecido",
    };
  });
}

/**
 * Get all approval requests (history)
 */
export async function getApprovalHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const approvals = await db
    .select()
    .from(schema.approvalRequests)
    .where(
      or(
        eq(schema.approvalRequests.requesterId, userId),
        eq(schema.approvalRequests.approverId, userId)
      )
    )
    .orderBy(desc(schema.approvalRequests.createdAt))
    .limit(limit);

  return approvals;
}

/**
 * Get/Create collaboration settings
 */
export async function getCollaborationSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;

  let settings = await db
    .select()
    .from(schema.collaborationSettings)
    .where(eq(schema.collaborationSettings.userId, userId))
    .limit(1);

  if (settings.length === 0) {
    // Create default settings
    await db.insert(schema.collaborationSettings).values({
      userId,
      approvalThreshold: 50000, // R$ 500
      whatsappNotifications: true,
      pushNotifications: true,
      requireApprovalForNewItems: false,
    });

    settings = await db
      .select()
      .from(schema.collaborationSettings)
      .where(eq(schema.collaborationSettings.userId, userId))
      .limit(1);
  }

  return settings[0];
}

/**
 * Update collaboration settings
 */
export async function updateCollaborationSettings(
  userId: number,
  updates: Partial<{
    approvalThreshold: number;
    whatsappNotifications: boolean;
    pushNotifications: boolean;
    requireApprovalForNewItems: boolean;
    partnerId: number;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(schema.collaborationSettings)
    .set(updates)
    .where(eq(schema.collaborationSettings.userId, userId));

  // Log threshold change if applicable
  if (updates.approvalThreshold !== undefined) {
    await logActivity({
      userId,
      activityType: "threshold_changed",
      description: `Alterou limite de aprovação para ${formatCurrency(updates.approvalThreshold)}`,
      metadata: JSON.stringify({ newThreshold: updates.approvalThreshold }),
    });
  }

  return { success: true };
}

/**
 * Get activity log
 */
export async function getActivityLog(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const activities = await db
    .select()
    .from(schema.collaborationActivity)
    .where(eq(schema.collaborationActivity.userId, userId))
    .orderBy(desc(schema.collaborationActivity.createdAt))
    .limit(limit);

  return activities;
}

/**
 * Log activity (internal helper)
 */
async function logActivity(data: {
  userId: number;
  activityType: string;
  entryId?: number;
  approvalId?: number;
  description: string;
  metadata?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(schema.collaborationActivity).values({
    userId: data.userId,
    activityType: data.activityType as any,
    entryId: data.entryId,
    approvalId: data.approvalId,
    description: data.description,
    metadata: data.metadata,
  });
}

/**
 * Notify partner (via push/WhatsApp)
 */
async function notifyPartner(
  userId: number,
  notification: {
    type: string;
    entryId?: number;
    approvalId?: number;
    message: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  // Get user's settings
  const settings = await getCollaborationSettings(userId);
  if (!settings || !settings.partnerId) return;

  const partnerId = settings.partnerId;

  // Get partner's settings
  const partnerSettings = await getCollaborationSettings(partnerId);
  if (!partnerSettings) return;

  // Send push notification if enabled
  if (partnerSettings.pushNotifications) {
    try {
      const { sendPushToUser } = await import("./pushService");
      await sendPushToUser(
        partnerId,
        {
          title: getNotificationTitle(notification.type),
          body: notification.message,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          tag: `collaboration-${notification.type}-${notification.entryId || notification.approvalId}`,
          data: {
            type: notification.type,
            entryId: notification.entryId,
            approvalId: notification.approvalId,
            url: "/",
          },
        },
        "general"
      );
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }

  // Send WhatsApp notification if enabled
  if (partnerSettings.whatsappNotifications) {
    try {
      const { sendWhatsAppNotification } = await import("./whatsapp-notifications");
      const partner = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, partnerId))
        .limit(1);

      if (partner.length > 0 && partner[0].email) {
        await sendWhatsAppNotification(
          partner[0].email,
          getNotificationTitle(notification.type),
          notification.message
        );
      }
    } catch (error) {
      console.error("Error sending WhatsApp notification:", error);
    }
  }
}

/**
 * Check if entry needs approval
 */
export async function checkApprovalNeeded(userId: number, amount: number): Promise<boolean> {
  const settings = await getCollaborationSettings(userId);
  if (!settings || !settings.partnerId) return false;

  return amount >= settings.approvalThreshold;
}

/**
 * Request review for an entry
 */
export async function requestEntryReview(entryId: number, userId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Mark entry as review requested
  await db
    .update(schema.entries)
    .set({ reviewRequested: true })
    .where(eq(schema.entries.id, entryId));

  // Add comment
  await addEntryComment({
    entryId,
    userId,
    comment: reason || "Solicitou revisão deste lançamento",
    type: "question",
  });

  // Log activity
  await logActivity({
    userId,
    activityType: "review_requested",
    entryId,
    description: "Solicitou revisão do lançamento",
  });

  return { success: true };
}

/**
 * Get unread comments count for user
 */
export async function getUnreadCommentsCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Get all entries where user is NOT the commenter
  const comments = await db
    .select()
    .from(schema.entryComments)
    .where(
      and(
        eq(schema.entryComments.isRead, false)
        // TODO: Filter to only entries belonging to user's partner
      )
    );

  return comments.length;
}

/**
 * Helper functions
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    comment_added: "💬 Novo Comentário",
    approval_request: "📝 Solicitação de Aprovação",
    approval_granted: "✅ Aprovação Concedida",
    approval_rejected: "❌ Aprovação Negada",
    review_requested: "👀 Revisão Solicitada",
  };
  return titles[type] || "📬 Nova Notificação";
}
