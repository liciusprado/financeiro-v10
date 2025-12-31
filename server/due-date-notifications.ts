import { getDb } from "./db";
import { notificationsSent, items } from "../drizzle/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { broadcastNotification } from "./notificationService";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";

/**
 * Number of days before the due date to trigger a reminder.
 * If the due date is within this window (inclusive), a notification will be sent.
 */
const DAYS_BEFORE_DUE = 3;

/**
 * Check if a notification of a given type was already sent for the specified item/month/year.
 */
async function wasNotificationSent(
  itemId: number,
  month: number,
  year: number,
  notificationType: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await db
    .select()
    .from(notificationsSent)
    .where(
      and(
        eq(notificationsSent.itemId, itemId),
        eq(notificationsSent.month, month),
        eq(notificationsSent.year, year),
        eq(notificationsSent.notificationType, notificationType)
      )
    )
    .limit(1);
  return existing.length > 0;
}

/**
 * Register a sent notification in the database for deduplication.
 */
async function markNotificationSent(
  itemId: number,
  month: number,
  year: number,
  notificationType: string,
  message: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notificationsSent).values({
    itemId,
    month,
    year,
    notificationType,
    message,
  });
}

/**
 * Check due dates for all items in a given month and send reminders.
 * This function should be called once per month, ideally from a cron job or when users
 * open the app. It will iterate over items with a defined `dueDay`, compute the due date
 * for the given month/year, and compare against the current date. If the due date is within
 * the next `DAYS_BEFORE_DUE` days, a notification will be sent via email, WhatsApp and Manus.
 */
export async function checkDueDateNotifications(
  month: number,
  year: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Get all items with a dueDay defined
  const itemsWithDue = await db
    .select()
    .from(items)
    .where(isNotNull(items.dueDay));

  const now = new Date();
  for (const item of itemsWithDue) {
    const dueDay = (item as any).dueDay as number | null;
    if (!dueDay) continue;
    // Compute due date for this month/year
    const dueDate = new Date(year, month - 1, dueDay);
    // Compute difference in days
    const msInDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor((dueDate.getTime() - now.getTime()) / msInDay);
    if (diffDays < 0 || diffDays > DAYS_BEFORE_DUE) {
      continue; // Too early or already passed
    }
    // Build notification type for deduplication
    const notificationType = `due_date`;
    const alreadySent = await wasNotificationSent(
      item.id,
      month,
      year,
      notificationType
    );
    if (alreadySent) {
      continue;
    }
    // Build message
    const subject = "🔔 Lembrete de Vencimento";
    const dueDateStr = dueDate.toLocaleDateString("pt-BR");
    const message = `🔔 *Lembrete de Vencimento*\n\n📁 *Item:* ${item.name}\n📅 *Data de vencimento:* ${dueDateStr}\n\nO vencimento deste item está próximo. Por favor, verifique e pague antes do prazo para evitar multas ou juros.`;
    try {
      // Send via Manus
      await notifyOwner({
        title: subject,
        content: message,
      }).catch((err) => {
        console.warn("[DueDate] Failed to send Manus notification:", err);
      });
      // Determine WhatsApp recipients from environment
      const numbers = ENV.notificationWhatsAppNumbers
        ? ENV.notificationWhatsAppNumbers.split(",")
            .map((n: string) => n.trim())
            .filter(Boolean)
        : [];
      // Send via email and WhatsApp
      await broadcastNotification(subject, message, numbers);
      await markNotificationSent(item.id, month, year, notificationType, message);
      console.log(
        `[DueDate] Notificação de vencimento enviada para item ${item.id} (${item.name})`
      );
    } catch (error) {
      console.error(
        `[DueDate] Erro ao enviar notificação de vencimento para item ${item.id}:`,
        error
      );
    }
  }
}