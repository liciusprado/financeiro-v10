import webpush from "web-push";
import { getDb } from "./db";
import { pushSubscriptions, pushNotifications } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Push Notification Service
 * 
 * Implements Web Push API for sending notifications to PWA users.
 * Supports multiple devices per user and tracks delivery status.
 */

// VAPID keys configuration
// In production, generate keys with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Subscribe a device to push notifications
 */
export async function subscribeToPush(
  userId: number,
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  userAgent?: string
): Promise<{ success: boolean; subscriptionId?: number }> {
  const db = await getDb();
  if (!db) {
    return { success: false };
  }

  try {
    // Check if subscription already exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          active: true,
          lastUsedAt: new Date(),
          userAgent: userAgent || existing[0].userAgent,
        })
        .where(eq(pushSubscriptions.id, existing[0].id));

      return { success: true, subscriptionId: existing[0].id };
    }

    // Insert new subscription
    const result = await db.insert(pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      active: true,
    });

    return { success: true, subscriptionId: Number(result[0].insertId) };
  } catch (error) {
    console.error("[PushService] Error subscribing:", error);
    return { success: false };
  }
}

/**
 * Unsubscribe a device from push notifications
 */
export async function unsubscribeFromPush(endpoint: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(pushSubscriptions)
      .set({ active: false })
      .where(eq(pushSubscriptions.endpoint, endpoint));

    return true;
  } catch (error) {
    console.error("[PushService] Error unsubscribing:", error);
    return false;
  }
}

/**
 * Get all active subscriptions for a user
 */
export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.active, true)));
}

/**
 * Send push notification to a specific subscription
 */
async function sendToSubscription(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[PushService] VAPID keys not configured");
    return { success: false, error: "VAPID keys not configured" };
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return { success: true };
  } catch (error: any) {
    console.error("[PushService] Error sending notification:", error);

    // Handle subscription errors (expired, invalid, etc)
    if (error.statusCode === 404 || error.statusCode === 410) {
      // Subscription expired or invalid - mark as inactive
      const db = await getDb();
      if (db) {
        await db
          .update(pushSubscriptions)
          .set({ active: false })
          .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
      }
    }

    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to all user's devices
 */
export async function sendPushToUser(
  userId: number,
  payload: NotificationPayload,
  type: "budget_alert" | "due_date_reminder" | "monthly_summary" | "goal_achieved" | "anomaly_detected" | "backup_complete" | "general" = "general"
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await getUserSubscriptions(userId);
  if (subscriptions.length === 0) {
    console.log(`[PushService] No active subscriptions for user ${userId}`);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const result = await sendToSubscription(
      {
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
      payload
    );

    // Log notification
    const status = result.success ? "sent" : "failed";
    await db.insert(pushNotifications).values({
      userId,
      subscriptionId: sub.id,
      title: payload.title,
      body: payload.body,
      type,
      data: payload.data ? JSON.stringify(payload.data) : null,
      status,
      errorMessage: result.error || null,
    });

    if (result.success) {
      sent++;
      // Update last used timestamp
      await db
        .update(pushSubscriptions)
        .set({ lastUsedAt: new Date() })
        .where(eq(pushSubscriptions.id, sub.id));
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send budget alert notification
 */
export async function sendBudgetAlert(
  userId: number,
  data: {
    categoryName: string;
    planned: number;
    actual: number;
    percentage: number;
  }
): Promise<void> {
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  await sendPushToUser(
    userId,
    {
      title: "⚠️ Meta Ultrapassada",
      body: `${data.categoryName}: gastou ${formatCurrency(data.actual)} de ${formatCurrency(data.planned)} (${data.percentage}%)`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: `budget-alert-${data.categoryName}`,
      data: {
        type: "budget_alert",
        categoryName: data.categoryName,
        url: "/",
      },
      actions: [
        {
          action: "view",
          title: "Ver Detalhes",
        },
      ],
      requireInteraction: true,
    },
    "budget_alert"
  );
}

/**
 * Send due date reminder notification
 */
export async function sendDueDateReminder(
  userId: number,
  data: {
    itemName: string;
    categoryName: string;
    amount: number;
    daysUntilDue: number;
  }
): Promise<void> {
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const daysText = data.daysUntilDue === 1 ? "amanhã" : `em ${data.daysUntilDue} dias`;

  await sendPushToUser(
    userId,
    {
      title: "📅 Lembrete de Vencimento",
      body: `${data.itemName} (${data.categoryName}) - ${formatCurrency(data.amount)} vence ${daysText}`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: `due-date-${data.itemName}`,
      data: {
        type: "due_date_reminder",
        itemName: data.itemName,
        url: "/",
      },
      actions: [
        {
          action: "view",
          title: "Ver Dashboard",
        },
      ],
    },
    "due_date_reminder"
  );
}

/**
 * Send monthly summary notification
 */
export async function sendMonthlySummary(
  userId: number,
  data: {
    month: string;
    income: number;
    expenses: number;
    balance: number;
  }
): Promise<void> {
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const balanceEmoji = data.balance >= 0 ? "💰" : "📉";

  await sendPushToUser(
    userId,
    {
      title: `${balanceEmoji} Resumo de ${data.month}`,
      body: `Receitas: ${formatCurrency(data.income)} | Despesas: ${formatCurrency(data.expenses)} | Saldo: ${formatCurrency(data.balance)}`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: `monthly-summary-${data.month}`,
      data: {
        type: "monthly_summary",
        month: data.month,
        url: "/graficos",
      },
      actions: [
        {
          action: "view-charts",
          title: "Ver Gráficos",
        },
      ],
    },
    "monthly_summary"
  );
}

/**
 * Send goal achieved notification
 */
export async function sendGoalAchieved(
  userId: number,
  data: {
    goalName: string;
    targetAmount: number;
    savedAmount: number;
  }
): Promise<void> {
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  await sendPushToUser(
    userId,
    {
      title: "🎉 Meta Atingida!",
      body: `Parabéns! Você alcançou a meta "${data.goalName}" - ${formatCurrency(data.savedAmount)} de ${formatCurrency(data.targetAmount)}`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: `goal-achieved-${data.goalName}`,
      data: {
        type: "goal_achieved",
        goalName: data.goalName,
        url: "/metas",
      },
      actions: [
        {
          action: "view-goals",
          title: "Ver Metas",
        },
      ],
      requireInteraction: true,
    },
    "goal_achieved"
  );
}

/**
 * Send anomaly detected notification
 */
export async function sendAnomalyAlert(
  userId: number,
  data: {
    categoryName: string;
    amount: number;
    average: number;
    percentage: number;
  }
): Promise<void> {
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  await sendPushToUser(
    userId,
    {
      title: "🔍 Gasto Atípico Detectado",
      body: `${data.categoryName}: ${formatCurrency(data.amount)} (${data.percentage}% acima da média de ${formatCurrency(data.average)})`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: `anomaly-${data.categoryName}`,
      data: {
        type: "anomaly_detected",
        categoryName: data.categoryName,
        url: "/analitico",
      },
      actions: [
        {
          action: "view-analytics",
          title: "Ver Análises",
        },
      ],
    },
    "anomaly_detected"
  );
}

/**
 * Send backup complete notification
 */
export async function sendBackupComplete(userId: number): Promise<void> {
  await sendPushToUser(
    userId,
    {
      title: "✅ Backup Concluído",
      body: "Seus dados foram salvos com sucesso",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: "backup-complete",
      data: {
        type: "backup_complete",
        url: "/configuracoes",
      },
    },
    "backup_complete"
  );
}

/**
 * Get notification history for a user
 */
export async function getUserNotifications(
  userId: number,
  limit: number = 50
): Promise<Array<{
  id: number;
  title: string;
  body: string;
  type: string;
  sentAt: Date;
  readAt: Date | null;
  status: string;
}>> {
  const db = await getDb();
  if (!db) return [];

  const notifications = await db
    .select()
    .from(pushNotifications)
    .where(eq(pushNotifications.userId, userId))
    .orderBy(pushNotifications.sentAt)
    .limit(limit);

  return notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    sentAt: n.sentAt,
    readAt: n.readAt,
    status: n.status,
  }));
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(pushNotifications)
      .set({ status: "read", readAt: new Date() })
      .where(eq(pushNotifications.id, notificationId));
    return true;
  } catch (error) {
    console.error("[PushService] Error marking notification as read:", error);
    return false;
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
