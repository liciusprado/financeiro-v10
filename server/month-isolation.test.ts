import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, categories, items } from "../drizzle/schema";

describe("Month Isolation", () => {
  let testUserId: number;
  let testCategoryId: number;
  let testItemId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar usuário de teste
    const userResult = await db.insert(users).values({
      openId: `test-month-${Date.now()}`,
      name: "Test User Month",
      email: "test-month@example.com",
    });

    testUserId = Number(userResult[0].insertId);

    // Criar categoria de teste
    const categoryResult = await db.insert(categories).values({
      name: "Test Category Month",
      type: "income",
      color: "#000000",
    });

    testCategoryId = Number(categoryResult[0].insertId);

    // Criar item de teste
    const itemResult = await db.insert(items).values({
      name: "Test Item Month",
      categoryId: testCategoryId,
    });

    testItemId = Number(itemResult[0].insertId);
  });

  it("deve isolar valores entre meses diferentes", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-month",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Criar entry para dezembro/2025
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month: 12,
      year: 2025,
      person: "licius",
      plannedValue: 100000, // R$ 1.000,00
      actualValue: 150000,  // R$ 1.500,00
    });

    // Criar entry para novembro/2025 (mesmo item, mesma pessoa, mês diferente)
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month: 11,
      year: 2025,
      person: "licius",
      plannedValue: 200000, // R$ 2.000,00
      actualValue: 250000,  // R$ 2.500,00
    });

    // Buscar entries de dezembro
    const decemberEntries = await caller.finance.getMonthEntries({
      month: 12,
      year: 2025,
    });

    // Buscar entries de novembro
    const novemberEntries = await caller.finance.getMonthEntries({
      month: 11,
      year: 2025,
    });

    // Verificar que dezembro tem os valores corretos
    const decemberEntry = decemberEntries.find(
      (e) => e.itemId === testItemId && e.person === "licius"
    );
    expect(decemberEntry).toBeDefined();
    expect(decemberEntry?.plannedValue).toBe(100000);
    expect(decemberEntry?.actualValue).toBe(150000);

    // Verificar que novembro tem os valores corretos (diferentes de dezembro)
    const novemberEntry = novemberEntries.find(
      (e) => e.itemId === testItemId && e.person === "licius"
    );
    expect(novemberEntry).toBeDefined();
    expect(novemberEntry?.plannedValue).toBe(200000);
    expect(novemberEntry?.actualValue).toBe(250000);

    // Confirmar que são entries diferentes
    expect(decemberEntry?.id).not.toBe(novemberEntry?.id);
  });

  it("deve permitir atualizar valor em um mês sem afetar outro mês", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-month",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Criar entry para dezembro/2025
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month: 12,
      year: 2025,
      person: "licius",
      actualValue: 100000, // R$ 1.000,00
    });

    // Criar entry para novembro/2025
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month: 11,
      year: 2025,
      person: "licius",
      actualValue: 200000, // R$ 2.000,00
    });

    // Buscar entry de dezembro para obter o ID
    const decemberEntriesBefore = await caller.finance.getMonthEntries({
      month: 12,
      year: 2025,
    });

    const decemberEntryBefore = decemberEntriesBefore.find(
      (e) => e.itemId === testItemId && e.person === "licius"
    );

    // Atualizar valor de dezembro (passando o ID)
    await caller.finance.upsertEntry({
      id: decemberEntryBefore?.id,
      itemId: testItemId,
      month: 12,
      year: 2025,
      person: "licius",
      actualValue: 500000, // R$ 5.000,00
    });

    // Buscar entries
    const decemberEntries = await caller.finance.getMonthEntries({
      month: 12,
      year: 2025,
    });

    const novemberEntries = await caller.finance.getMonthEntries({
      month: 11,
      year: 2025,
    });

    // Verificar que dezembro foi atualizado
    const decemberEntry = decemberEntries.find(
      (e) => e.itemId === testItemId && e.person === "licius"
    );
    expect(decemberEntry?.actualValue).toBe(500000);

    // Verificar que novembro NÃO foi afetado
    const novemberEntry = novemberEntries.find(
      (e) => e.itemId === testItemId && e.person === "licius"
    );
    expect(novemberEntry?.actualValue).toBe(200000); // Valor original
  });

  it("deve permitir deletar entry de um mês sem afetar outro mês", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-month",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Criar entry para dezembro/2025
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month: 12,
      year: 2025,
      person: "licius",
      actualValue: 100000,
    });

    // Criar entry para novembro/2025
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month: 11,
      year: 2025,
      person: "licius",
      actualValue: 200000,
    });

    // Buscar entries antes da exclusão
    const decemberEntriesBefore = await caller.finance.getMonthEntries({
      month: 12,
      year: 2025,
    });

    const decemberEntry = decemberEntriesBefore.find(
      (e) => e.itemId === testItemId && e.person === "licius"
    );

    // Deletar entry de dezembro
    await caller.finance.deleteEntry({
      id: decemberEntry!.id,
      month: 12,
      year: 2025,
    });

    // Verificar que dezembro não tem mais a entry
    const decemberEntriesAfter = await caller.finance.getMonthEntries({
      month: 12,
      year: 2025,
    });

    const decemberEntryAfter = decemberEntriesAfter.find(
      (e) => e.itemId === testItemId && e.person === "licius"
    );

    expect(decemberEntryAfter).toBeUndefined();

    // Verificar que novembro AINDA tem a entry (não foi afetado)
    const novemberEntries = await caller.finance.getMonthEntries({
      month: 11,
      year: 2025,
    });

    const novemberEntry = novemberEntries.find(
      (e) => e.itemId === testItemId && e.person === "licius"
    );

    expect(novemberEntry).toBeDefined();
    expect(novemberEntry?.actualValue).toBe(200000);
  });

  it("deve isolar entries entre anos diferentes", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-month",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Criar entry para janeiro/2025
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month: 1,
      year: 2025,
      person: "marielly",
      plannedValue: 300000,
      actualValue: 350000,
    });

    // Criar entry para janeiro/2024 (mesmo mês, ano diferente)
    await caller.finance.upsertEntry({
      itemId: testItemId,
      month: 1,
      year: 2024,
      person: "marielly",
      plannedValue: 400000,
      actualValue: 450000,
    });

    // Buscar entries de cada ano
    const entries2025 = await caller.finance.getMonthEntries({
      month: 1,
      year: 2025,
    });

    const entries2024 = await caller.finance.getMonthEntries({
      month: 1,
      year: 2024,
    });

    // Verificar isolamento
    const entry2025 = entries2025.find(
      (e) => e.itemId === testItemId && e.person === "marielly"
    );
    expect(entry2025?.plannedValue).toBe(300000);
    expect(entry2025?.actualValue).toBe(350000);

    const entry2024 = entries2024.find(
      (e) => e.itemId === testItemId && e.person === "marielly"
    );
    expect(entry2024?.plannedValue).toBe(400000);
    expect(entry2024?.actualValue).toBe(450000);

    // Confirmar IDs diferentes
    expect(entry2025?.id).not.toBe(entry2024?.id);
  });

  it("deve criar entries independentes para mesma pessoa em meses diferentes", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-month",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Criar 12 entries (uma para cada mês de 2025)
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    for (const month of months) {
      await caller.finance.upsertEntry({
        itemId: testItemId,
        month,
        year: 2025,
        person: "licius",
        plannedValue: month * 10000, // Valores diferentes para cada mês
        actualValue: month * 15000,
      });
    }

    // Verificar que cada mês tem seu próprio valor
    for (const month of months) {
      const entries = await caller.finance.getMonthEntries({
        month,
        year: 2025,
      });

      const entry = entries.find(
        (e) => e.itemId === testItemId && e.person === "licius"
      );

      expect(entry).toBeDefined();
      expect(entry?.plannedValue).toBe(month * 10000);
      expect(entry?.actualValue).toBe(month * 15000);
    }
  });
});
