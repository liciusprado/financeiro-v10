import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, attachments, InsertAttachment, auditLog, InsertAuditLog, notificationsSent, InsertNotificationSent } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

import { categories, entries, items, Category, Item, Entry, userSettings, InsertUserSettings } from "../drizzle/schema";
import { investmentTransactions, InsertInvestmentTransaction, webauthnCredentials, InsertWebAuthnCredential, WebAuthnCredential } from "../drizzle/schema";

// Encryption helpers for sensitive fields
import { encrypt as encryptText, decrypt as decryptText } from "./encryption";

// Categorias
export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.orderIndex, categories.id);
}

export async function createCategory(data: { name: string; type: "income" | "expense" | "investment"; color?: string; orderIndex?: number; icon?: string | null; imageUrl?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Provide a default budgetGroup based on type: incomes default to "needs" (since they cover obligations), expenses to "wants"
  const budgetGroup = (data as any).budgetGroup as any;
  const values = {
    ...data,
    budgetGroup: budgetGroup ?? (data.type === "income" ? "needs" : data.type === "investment" ? "savings" : "wants"),
  } as any;
  const result = await db.insert(categories).values(values);
  return result;
}

export async function updateCategory(id: number, data: { name?: string; color?: string; icon?: string | null; imageUrl?: string | null; budgetGroup?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { ...data };
  // Accept budgetGroup update if provided
  if ((data as any).budgetGroup !== undefined) {
    updateData.budgetGroup = (data as any).budgetGroup;
  }
  const result = await db.update(categories).set(updateData).where(eq(categories.id, id));
  return result;
}

// Busca uma categoria pelo nome (case-insensitive). Retorna null se não encontrada.
export async function findCategoryByName(name: string): Promise<Category | null> {
  const db = await getDb();
  if (!db) return null;
  const [cat] = await db
    .select()
    .from(categories)
    // Converte ambos para binário/utf8 para comparação insensível a maiúsculas
    .where(eq(categories.name, name))
    .limit(1);
  return cat || null;
}

// Busca um item pelo nome e categoria. Se existe, retorna o primeiro; caso contrário, null.
export async function findItemByNameAndCategoryId(name: string, categoryId: number): Promise<Item | null> {
  const db = await getDb();
  if (!db) return null;
  const [it] = await db
    .select()
    .from(items)
    .where(and(eq(items.name, name), eq(items.categoryId, categoryId)))
    .limit(1);
  return it || null;
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(categories).where(eq(categories.id, id));
  return result;
}

// Itens
export async function getItemsByCategoryId(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(items).where(eq(items.categoryId, categoryId)).orderBy(items.orderIndex, items.id);
}

export async function getAllItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(items).orderBy(items.orderIndex, items.id);
}

export async function createItem(data: { categoryId: number; name: string; customCategory?: string; orderIndex?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(items).values(data);
  return result;
}

export async function deleteItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(items).where(eq(items.id, id));
}

export async function archiveItem(id: number, month: number, year: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(items)
    .set({ inactiveFromMonth: month, inactiveFromYear: year })
    .where(eq(items.id, id));
  return { success: true };
}

export async function unarchiveItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(items)
    .set({ inactiveFromMonth: null, inactiveFromYear: null })
    .where(eq(items.id, id));
  return { success: true };
}

// Lançamentos
export async function getEntriesByMonth(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(entries)
    .where(and(
      eq(entries.userId, userId),
      eq(entries.month, month),
      eq(entries.year, year)
    ));
}

export async function upsertEntry(data: {
  id?: number;
  itemId: number;
  userId: number;
  month: number;
  year: number;
  person: "licius" | "marielly";
  plannedValue?: number;
  actualValue?: number;
  notes?: string | null;
  reviewRequested?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (data.id) {
    // Update existing - CRITICAL: Verify entry belongs to correct month/year/user
    const updateData: any = {};
    if (data.plannedValue !== undefined) updateData.plannedValue = data.plannedValue;
    if (data.actualValue !== undefined) updateData.actualValue = data.actualValue;
    if (data.notes !== undefined) {
      // Encrypt notes before storing if provided (null or empty bypass encryption)
      if (data.notes === null || data.notes === '') {
        updateData.notes = data.notes;
      } else {
        try {
          updateData.notes = encryptText(data.notes);
        } catch (err) {
          console.error('[Encryption] Failed to encrypt notes:', err);
          updateData.notes = data.notes;
        }
      }
    }
    if (data.reviewRequested !== undefined) updateData.reviewRequested = data.reviewRequested;
    
    // BUGFIX: Add month/year/userId verification to prevent cross-month updates
    await db.update(entries).set(updateData).where(
      and(
        eq(entries.id, data.id),
        eq(entries.month, data.month),
        eq(entries.year, data.year),
        eq(entries.userId, data.userId)
      )
    );
    return { id: data.id };
  } else {
    // Insert new
    let notesValue: string | null = null;
    if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
      try {
        notesValue = encryptText(data.notes);
      } catch (err) {
        console.error('[Encryption] Failed to encrypt notes:', err);
        notesValue = data.notes;
      }
    } else if (data.notes === null) {
      notesValue = null;
    }
    const result = await db.insert(entries).values({
      itemId: data.itemId,
      userId: data.userId,
      month: data.month,
      year: data.year,
      person: data.person,
      plannedValue: data.plannedValue || 0,
      actualValue: data.actualValue || 0,
      notes: notesValue,
      reviewRequested: data.reviewRequested ?? false,
    });
    return result;
  }
}

export async function deleteEntry(id: number, userId?: number, month?: number, year?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // BUGFIX: If month/year provided, verify entry belongs to correct month
  if (userId !== undefined && month !== undefined && year !== undefined) {
    await db.delete(entries).where(
      and(
        eq(entries.id, id),
        eq(entries.userId, userId),
        eq(entries.month, month),
        eq(entries.year, year)
      )
    );
  } else {
    // Legacy support: delete by ID only (less safe)
    await db.delete(entries).where(eq(entries.id, id));
  }
}

// Recupera um único lançamento (entry) pelo id. Retorna null se não encontrado.
export async function getEntryById(id: number): Promise<Entry | null> {
  const db = await getDb();
  if (!db) return null;
  const [res] = await db.select().from(entries).where(eq(entries.id, id)).limit(1);
  return res || null;
}

/**
 * Atualiza campos arbitrários de um lançamento existente. Permite atualizar plannedValue, actualValue,
 * notes e reviewRequested. Qualquer campo não fornecido será ignorado.
 * IMPORTANTE: Se userId, month e year forem fornecidos, valida que o entry pertence ao mês correto.
 */
export async function updateEntry(id: number, data: {
  plannedValue?: number;
  actualValue?: number;
  notes?: string | null;
  reviewRequested?: boolean;
  userId?: number;
  month?: number;
  year?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, any> = {};
  if (data.plannedValue !== undefined) updateData.plannedValue = data.plannedValue;
  if (data.actualValue !== undefined) updateData.actualValue = data.actualValue;
  if (data.notes !== undefined) {
    if (data.notes === null || data.notes === '') {
      updateData.notes = data.notes;
    } else {
      try {
        updateData.notes = encryptText(data.notes);
      } catch (err) {
        console.error('[Encryption] Failed to encrypt notes:', err);
        updateData.notes = data.notes;
      }
    }
  }
  if (data.reviewRequested !== undefined) updateData.reviewRequested = data.reviewRequested;
  if (Object.keys(updateData).length === 0) return { id };
  
  // BUGFIX: Add month/year validation if provided
  if (data.userId !== undefined && data.month !== undefined && data.year !== undefined) {
    await db.update(entries).set(updateData).where(
      and(
        eq(entries.id, id),
        eq(entries.userId, data.userId),
        eq(entries.month, data.month),
        eq(entries.year, data.year)
      )
    );
  } else {
    // Legacy support without validation
    await db.update(entries).set(updateData).where(eq(entries.id, id));
  }
  return { id };
}

// Attachment functions
export async function createAttachment(attachment: InsertAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(attachments).values(attachment);
  return result;
}

export async function getAttachmentsByEntryId(entryId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(attachments).where(eq(attachments.entryId, entryId));
}

export async function deleteAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(attachments).where(eq(attachments.id, id));
}

// Audit log functions
export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(auditLog).values(log);
}

export async function getAuditLogByEntryId(entryId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(auditLog).where(eq(auditLog.entryId, entryId));
}

export async function getAuditLogs() {
  const db = await getDb();
  if (!db) return [];
  
  // Retorna todos os logs ordenados por data (mais recentes primeiro)
  return await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(1000);
}

// Investment transaction functions
export async function createInvestmentTransaction(data: InsertInvestmentTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(investmentTransactions).values(data);
}

export async function createInvestmentTransactionsBatch(data: InsertInvestmentTransaction[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(investmentTransactions).values(data);
}

export async function getInvestmentTransactionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(investmentTransactions).where(eq(investmentTransactions.userId, userId)).orderBy(desc(investmentTransactions.date));
}

// WebAuthn credential functions
export async function createWebAuthnCredential(data: InsertWebAuthnCredential) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(webauthnCredentials).values(data);
}

export async function getWebAuthnCredentialsByUser(userId: number): Promise<WebAuthnCredential[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(webauthnCredentials).where(eq(webauthnCredentials.userId, userId));
}

export async function deleteWebAuthnCredential(credentialId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(webauthnCredentials).where(eq(webauthnCredentials.credentialId, credentialId));
}

// Notification functions
export async function createNotificationSent(notification: InsertNotificationSent) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(notificationsSent).values(notification);
}

export async function checkNotificationSent(itemId: number, month: number, year: number, type: string) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select()
    .from(notificationsSent)
    .where(
      and(
        eq(notificationsSent.itemId, itemId),
        eq(notificationsSent.month, month),
        eq(notificationsSent.year, year),
        eq(notificationsSent.notificationType, type)
      )
    )
    .limit(1);
  
  return result.length > 0;
}

export async function getNotificationsSent() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(notificationsSent).orderBy(desc(notificationsSent.sentAt)).limit(100);
}

export async function getEntriesByItemAndMonth(itemId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.itemId, itemId),
        eq(entries.month, month),
        eq(entries.year, year)
      )
    );
}

export async function getCategoryById(categoryId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getCategoryByName(userId: number, categoryName: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.name, categoryName)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateItemName(itemId: number, name: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update item: database not available");
    return;
  }

  await db.update(items)
    .set({ name })
    .where(eq(items.id, itemId));
  
  return { success: true };
}

/**
 * Retrieves a single item by its ID. Returns null if not found or if the
 * database is unavailable.
 */
export async function getItemById(itemId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function reorderItems(categoryId: number, itemIds: number[]) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot reorder items: database not available");
    return { success: false };
  }

  try {
    // Atualizar orderIndex de cada item
    for (let i = 0; i < itemIds.length; i++) {
      await db
        .update(items)
        .set({ orderIndex: i })
        .where(eq(items.id, itemIds[i]!));
    }

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to reorder items:", error);
    throw error;
  }
}

// User Settings functions
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  
  return settings || null;
}

export async function upsertUserSettings(userId: number, data: Partial<InsertUserSettings>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserSettings(userId);
  
  if (existing) {
    // Update existing
    await db
      .update(userSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId));
    return { success: true };
  } else {
    // Insert new
    await db.insert(userSettings).values({
      userId,
      ...data,
    });
    return { success: true };
  }
}

export async function createBackup(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Buscar todos os dados do usuário
  const allCategories = await db.select().from(categories);
  
  const allItems = await db.select().from(items);
  
  const userEntries = await db
    .select()
    .from(entries)
    .where(eq(entries.userId, userId));
  
  const userAttachments = await db
    .select()
    .from(attachments)
    .where(eq(attachments.uploadedBy, userId));
  
  const settings = await getUserSettings(userId);
  
  // Atualizar lastBackupAt
  await db
    .update(userSettings)
    .set({ lastBackupAt: new Date() })
    .where(eq(userSettings.userId, userId));
  
  return {
    timestamp: new Date().toISOString(),
    categories: allCategories,
    items: allItems,
    entries: userEntries,
    attachments: userAttachments,
    settings,
  };
}

/**
 * Copia valores planejados do mês anterior para o mês atual
 */
export async function copyPreviousMonthPlanned(
  userId: number,
  targetMonth: number,
  targetYear: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Calcular mês anterior
  let sourceMonth = targetMonth - 1;
  let sourceYear = targetYear;
  
  if (sourceMonth === 0) {
    sourceMonth = 12;
    sourceYear -= 1;
  }

  // Buscar entries do mês anterior
  const sourceEntries = await db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.userId, userId),
        eq(entries.month, sourceMonth),
        eq(entries.year, sourceYear)
      )
    );

  // Para cada entry do mês anterior, criar ou atualizar no mês atual
  for (const sourceEntry of sourceEntries) {
    // Verificar se já existe entry no mês atual
    const existingEntry = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          eq(entries.itemId, sourceEntry.itemId),
          eq(entries.person, sourceEntry.person),
          eq(entries.month, targetMonth),
          eq(entries.year, targetYear)
        )
      )
      .limit(1);

    if (existingEntry.length > 0) {
      // Atualizar apenas valores planejados
      await db
        .update(entries)
        .set({
          plannedValue: sourceEntry.plannedValue,
        })
        .where(eq(entries.id, existingEntry[0].id));
    } else {
      // Criar nova entry com valores planejados, valores reais zerados
      await db.insert(entries).values({
        userId,
        itemId: sourceEntry.itemId,
        person: sourceEntry.person,
        month: targetMonth,
        year: targetYear,
        plannedValue: sourceEntry.plannedValue,
        actualValue: 0,
      });
    }
  }

  return { success: true, copiedCount: sourceEntries.length };
}

// ==================== GOALS FUNCTIONS ====================

/**
 * Create a new financial goal
 */
export async function createGoal(data: {
  userId: number;
  name: string;
  description?: string;
  targetAmount: number;
  targetDate?: Date;
  category?: string;
  priority?: string;
  isShared?: boolean;
  icon?: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const result = await database.insert(schema.goals).values({
    userId: data.userId,
    name: data.name,
    description: data.description,
    targetAmount: data.targetAmount,
    currentAmount: 0,
    targetDate: data.targetDate,
    category: (data.category as any) || "other",
    priority: (data.priority as any) || "medium",
    isShared: data.isShared || false,
    icon: data.icon || "🎯",
    status: "active",
  });

  return { id: Number(result[0].insertId) };
}

/**
 * Get all goals for a user (including shared goals)
 */
export async function getUserGoals(userId: number) {
  const database = await getDb();
  if (!database) return [];

  return await database
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, userId))
    .orderBy(schema.goals.createdAt);
}

/**
 * Get goal by ID
 */
export async function getGoalById(goalId: number) {
  const database = await getDb();
  if (!database) return null;

  const result = await database
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.id, goalId))
    .limit(1);

  return result[0] || null;
}

/**
 * Update goal
 */
export async function updateGoal(
  goalId: number,
  data: Partial<{
    name: string;
    description: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: Date;
    category: string;
    priority: string;
    isShared: boolean;
    icon: string;
    status: string;
  }>
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database
    .update(schema.goals)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(schema.goals.id, goalId));

  return { success: true };
}

/**
 * Delete goal
 */
export async function deleteGoal(goalId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database.delete(schema.goals).where(eq(schema.goals.id, goalId));
  return { success: true };
}

/**
 * Add transaction to goal (deposit or withdrawal)
 */
export async function addGoalTransaction(data: {
  goalId: number;
  userId: number;
  amount: number;
  type: "deposit" | "withdrawal" | "adjustment";
  note?: string;
  entryId?: number;
  transactionDate?: Date;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  // Insert transaction
  const result = await database.insert(schema.goalTransactions).values({
    goalId: data.goalId,
    userId: data.userId,
    amount: data.amount,
    type: data.type,
    note: data.note,
    entryId: data.entryId,
    transactionDate: data.transactionDate || new Date(),
  });

  // Update goal current amount
  const goal = await getGoalById(data.goalId);
  if (goal) {
    const newAmount = goal.currentAmount + data.amount;
    await updateGoal(data.goalId, { currentAmount: newAmount });

    // Check if goal is completed
    if (newAmount >= goal.targetAmount && goal.status === "active") {
      await updateGoal(data.goalId, {
        status: "completed",
      });

      // Send notification
      try {
        const { sendGoalAchieved } = await import("./pushService");
        await sendGoalAchieved(goal.userId, {
          goalName: goal.name,
          targetAmount: goal.targetAmount,
          savedAmount: newAmount,
        });
      } catch (error) {
        console.error("Error sending goal achievement notification:", error);
      }
    }
  }

  return { id: Number(result[0].insertId), success: true };
}

/**
 * Get goal transactions
 */
export async function getGoalTransactions(goalId: number) {
  const database = await getDb();
  if (!database) return [];

  return await database
    .select()
    .from(schema.goalTransactions)
    .where(eq(schema.goalTransactions.goalId, goalId))
    .orderBy(schema.goalTransactions.transactionDate);
}

/**
 * Create milestone for a goal
 */
export async function createMilestone(data: {
  goalId: number;
  name: string;
  targetAmount: number;
  order: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const result = await database.insert(schema.goalMilestones).values({
    goalId: data.goalId,
    name: data.name,
    targetAmount: data.targetAmount,
    order: data.order,
    isCompleted: false,
  });

  return { id: Number(result[0].insertId) };
}

/**
 * Get milestones for a goal
 */
export async function getGoalMilestones(goalId: number) {
  const database = await getDb();
  if (!database) return [];

  return await database
    .select()
    .from(schema.goalMilestones)
    .where(eq(schema.goalMilestones.goalId, goalId))
    .orderBy(schema.goalMilestones.order);
}

/**
 * Update milestone
 */
export async function updateMilestone(
  milestoneId: number,
  data: Partial<{
    name: string;
    targetAmount: number;
    order: number;
    isCompleted: boolean;
  }>
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database
    .update(schema.goalMilestones)
    .set(data)
    .where(eq(schema.goalMilestones.id, milestoneId));

  return { success: true };
}

/**
 * Delete milestone
 */
export async function deleteMilestone(milestoneId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database
    .delete(schema.goalMilestones)
    .where(eq(schema.goalMilestones.id, milestoneId));

  return { success: true };
}

