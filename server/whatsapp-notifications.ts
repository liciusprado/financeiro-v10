import { getDb } from "./db";
import { notificationsSent, items, entries } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

/**
 * Números de WhatsApp para receber notificações
 */
const WHATSAPP_NUMBERS = ["5562985051201", "5562985908516"];

/**
 * Threshold de ultrapassagem para disparar notificação (20%)
 */
const THRESHOLD_PERCENTAGE = 20;

/**
 * Verifica se uma notificação já foi enviada para um item em um mês específico
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
 * Registra que uma notificação foi enviada
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
 * Calcula o percentual de ultrapassagem da meta
 */
function calculateExceededPercentage(planned: number, actual: number): number {
  if (planned === 0) return 0;
  const difference = actual - planned;
  return (difference / planned) * 100;
}

/**
 * Formata valor em centavos para reais
 */
function formatCurrency(cents: number): string {
  const value = (cents / 100).toFixed(2);
  const [intPart, decPart] = value.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${formattedInt},${decPart}`;
}

/**
 * Verifica se o gasto ultrapassou a meta e envia notificação se necessário
 */
export async function checkAndNotifyBudgetExceeded(
  itemId: number,
  month: number,
  year: number,
  person: "licius" | "marielly"
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Buscar informações do item
  const [item] = await db.select().from(items).where(eq(items.id, itemId));
  if (!item) return;

  // Buscar entry do mês
  const [entry] = await db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.itemId, itemId),
        eq(entries.month, month),
        eq(entries.year, year),
        eq(entries.person, person)
      )
    );

  if (!entry) return;

  const planned = entry.plannedValue;
  const actual = entry.actualValue;

  // Verificar se ultrapassou o threshold
  const exceededPercentage = calculateExceededPercentage(planned, actual);

  if (exceededPercentage <= THRESHOLD_PERCENTAGE) {
    return; // Não ultrapassou o limite
  }

  // Verificar se já foi enviada notificação
  const notificationType = `budget_exceeded_${person}`;
  const alreadySent = await wasNotificationSent(
    itemId,
    month,
    year,
    notificationType
  );

  if (alreadySent) {
    return; // Já foi notificado
  }

  // Montar mensagem
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const personName = person === "licius" ? "Lícius" : "Marielly";
  const difference = actual - planned;

  const message = `🚨 *ALERTA DE ORÇAMENTO ULTRAPASSADO* 🚨

📊 *Item:* ${item.name}
📁 *Categoria:* ${item.customCategory || "Sem categoria"}
👤 *Pessoa:* ${personName}
📅 *Período:* ${monthNames[month - 1]}/${year}

💰 *Valores:*
• Meta Planejada: ${formatCurrency(planned)}
• Valor Real: ${formatCurrency(actual)}
• Diferença: ${formatCurrency(difference)} (${exceededPercentage.toFixed(1)}% acima da meta)

⚠️ O gasto ultrapassou ${THRESHOLD_PERCENTAGE}% da meta planejada!`;

  // Enviar notificação
  try {
    const success = await notifyOwner({
      title: "⚠️ Alerta de Orçamento Ultrapassado",
      content: message,
    });

    if (success) {
      // Marcar como enviada
      await markNotificationSent(itemId, month, year, notificationType, message);
      console.log(
        `[WhatsApp] Notificação enviada para item ${itemId} (${item.name}) - ${personName}`
      );
    } else {
      console.error(
        `[WhatsApp] Falha ao enviar notificação para item ${itemId}`
      );
    }
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar notificação:", error);
  }
}

/**
 * Verifica todos os itens de um mês e envia notificações necessárias
 */
export async function checkAllItemsForMonth(
  month: number,
  year: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Buscar todas as entries do mês
  const allEntries = await db
    .select()
    .from(entries)
    .where(and(eq(entries.month, month), eq(entries.year, year)));

  // Verificar cada entry
  for (const entry of allEntries) {
    await checkAndNotifyBudgetExceeded(
      entry.itemId,
      entry.month,
      entry.year,
      entry.person
    );
  }
}
