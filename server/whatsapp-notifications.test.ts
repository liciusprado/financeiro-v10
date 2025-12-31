import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { categories, items, entries, users, notificationsSent } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import * as notificationModule from "./_core/notification";

describe("WhatsApp Notifications for Budget Exceeded", () => {
  let testUserId: number;
  let testUserOpenId: string;
  let testCategoryId: number;
  let testItemId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;

  // Mock da função notifyOwner
  const notifyOwnerMock = vi.spyOn(notificationModule, "notifyOwner");

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar usuário de teste
    testUserOpenId = "test-whatsapp-user-" + Date.now();
    const userResult = await db.insert(users).values({
      openId: testUserOpenId,
      name: "Test WhatsApp User",
      email: "test-whatsapp@example.com",
      role: "user",
    });
    testUserId = Number(userResult[0].insertId);

    caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: testUserOpenId,
        name: "Test WhatsApp User",
        email: "test-whatsapp@example.com",
        role: "user",
        loginMethod: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Criar categoria de teste
    const categoryResult = await db.insert(categories).values({
      name: "Test WhatsApp Category",
      type: "expense",
      userId: testUserId,
    });
    testCategoryId = Number(categoryResult[0].insertId);

    // Criar item de teste
    const itemResult = await db.insert(items).values({
      name: "Test WhatsApp Item",
      categoryId: testCategoryId,
      userId: testUserId,
      customCategory: "Teste Notificação",
    });
    testItemId = Number(itemResult[0].insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    try {
      // Limpar notificações de teste
      await db
        .delete(notificationsSent)
        .where(eq(notificationsSent.itemId, testItemId));

      // Limpar entries de teste
      await db.delete(entries).where(eq(entries.itemId, testItemId));

      // Limpar item de teste
      await db.delete(items).where(eq(items.id, testItemId));

      // Limpar categoria de teste
      await db.delete(categories).where(eq(categories.id, testCategoryId));

      // Limpar usuário de teste
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (error) {
      console.error("Erro ao limpar dados de teste:", error);
    }

    // Restaurar mock
    notifyOwnerMock.mockRestore();
  });

  it("should send notification when actual value exceeds planned by more than 20%", async () => {
    // Configurar mock para retornar sucesso
    notifyOwnerMock.mockResolvedValue(true);

    const month = 12;
    const year = 2025;
    const plannedValue = 100000; // R$ 1.000,00 em centavos
    const actualValue = 130000; // R$ 1.300,00 em centavos (30% acima)

    // Criar entry com valor planejado e valor real que ultrapassa 20%
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month,
      year,
      person: "licius",
      plannedValue,
      actualValue,
    });

    // Aguardar processamento assíncrono
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verificar se notifyOwner foi chamado
    expect(notifyOwnerMock).toHaveBeenCalled();

    // Verificar se a mensagem contém as informações corretas
    const callArgs = notifyOwnerMock.mock.calls[0][0];
    expect(callArgs.title).toContain("Alerta de Orçamento");
    expect(callArgs.content).toContain("Test WhatsApp Item");
    expect(callArgs.content).toContain("Lícius");
    expect(callArgs.content).toContain("R$ 1.000,00");
    expect(callArgs.content).toContain("R$ 1.300,00");

    // Verificar se a notificação foi registrada no banco
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const notifications = await db
      .select()
      .from(notificationsSent)
      .where(
        and(
          eq(notificationsSent.itemId, testItemId),
          eq(notificationsSent.month, month),
          eq(notificationsSent.year, year)
        )
      );

    expect(notifications.length).toBe(1);
    expect(notifications[0].notificationType).toBe("budget_exceeded_licius");
  });

  it("should not send notification when actual value is within 20% of planned", async () => {
    // Limpar mock anterior
    notifyOwnerMock.mockClear();

    const month = 11;
    const year = 2025;
    const plannedValue = 100000; // R$ 1.000,00
    const actualValue = 115000; // R$ 1.150,00 (15% acima - dentro do limite)

    // Criar entry
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month,
      year,
      person: "marielly",
      plannedValue,
      actualValue,
    });

    // Aguardar processamento
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verificar que notifyOwner NÃO foi chamado
    expect(notifyOwnerMock).not.toHaveBeenCalled();
  });

  it("should not send duplicate notifications for the same item/month/person", async () => {
    // Limpar mock anterior
    notifyOwnerMock.mockClear();
    notifyOwnerMock.mockResolvedValue(true);

    const month = 10;
    const year = 2025;
    const plannedValue = 100000;
    const actualValue = 150000; // 50% acima

    // Primeira atualização
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month,
      year,
      person: "licius",
      plannedValue,
      actualValue,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verificar que foi chamado uma vez
    expect(notifyOwnerMock).toHaveBeenCalledTimes(1);

    // Buscar entry para pegar o ID
    const entriesList = await caller.finance.getMonthEntries({ month, year });
    const entry = entriesList.find(
      (e: any) => e.itemId === testItemId && e.person === "licius"
    );
    if (!entry) throw new Error("Entry not found");

    // Segunda atualização com valor ainda maior
    notifyOwnerMock.mockClear();
    await caller.finance.upsertEntry({
      id: entry.id,
      itemId: testItemId,
      month,
      year,
      person: "licius",
      actualValue: 180000, // 80% acima
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verificar que NÃO foi chamado novamente
    expect(notifyOwnerMock).not.toHaveBeenCalled();
  });
});
