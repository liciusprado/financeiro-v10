import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { categories, items, entries, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Item Archiving Functionality", () => {
  let testUserId: number;
  let testUserOpenId: string;
  let testCategoryId: number;
  let testItemId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar usuário de teste
    testUserOpenId = "test-archive-user-" + Date.now();
    const userResult = await db
      .insert(users)
      .values({
        openId: testUserOpenId,
        name: "Test Archive User",
        email: "test-archive@example.com",
        role: "user",
      });
    testUserId = Number(userResult[0].insertId);

    caller = appRouter.createCaller({
      user: {
        openId: testUserOpenId,
        name: "Test Archive User",
        email: "test-archive@example.com",
        role: "user",
      },
    });

    // Criar categoria de teste
    const categoryResult = await db
      .insert(categories)
      .values({
        name: "Test Archive Category",
        type: "expense",
        userId: testUserId,
      });
    testCategoryId = Number(categoryResult[0].insertId);

    // Criar item de teste
    const itemResult = await db
      .insert(items)
      .values({
        name: "Test Archive Item",
        categoryId: testCategoryId,
        userId: testUserId,
      });
    testItemId = Number(itemResult[0].insertId);

    // Criar entradas para vários meses
    const testEntries = [
      { month: 11, year: 2025, person: "Lícius", budgetAmount: 1000, actualAmount: 1000 },
      { month: 12, year: 2025, person: "Lícius", budgetAmount: 1500, actualAmount: 1500 },
      { month: 1, year: 2026, person: "Lícius", budgetAmount: 2000, actualAmount: 2000 },
      { month: 2, year: 2026, person: "Lícius", budgetAmount: 2500, actualAmount: 2500 },
    ];

    for (const entry of testEntries) {
      await db.insert(entries).values({
        itemId: testItemId,
        userId: testUserId,
        month: entry.month,
        year: entry.year,
        person: entry.person,
        budgetAmount: entry.budgetAmount,
        actualAmount: entry.actualAmount,
      });
    }
  });

  afterAll(async () => {
    // Limpar dados de teste
    const db = await getDb();
    if (!db) return;

    try {
      await db.delete(entries).where(eq(entries.itemId, testItemId));
      await db.delete(items).where(eq(items.id, testItemId));
      await db.delete(categories).where(eq(categories.id, testCategoryId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (error) {
      console.error("Erro ao limpar dados de teste:", error);
    }
  });

  it("should archive item starting from specified month/year", async () => {
    // Arquivar item a partir de janeiro/2026
    await caller.finance.archiveItem({
      itemId: testItemId,
      archiveFromMonth: 1,
      archiveFromYear: 2026,
    });

    // Verificar que o item ainda aparece em dezembro/2025
    const itemsDecember2025 = await caller.finance.listItems({
      month: 12,
      year: 2025,
    });
    const foundInDecember = itemsDecember2025.find((i) => i.id === testItemId);
    expect(foundInDecember).toBeDefined();
    expect(foundInDecember?.name).toBe("Test Archive Item");

    // Verificar que o item NÃO aparece em janeiro/2026
    const itemsJanuary2026 = await caller.finance.listItems({
      month: 1,
      year: 2026,
    });
    const foundInJanuary = itemsJanuary2026.find((i) => i.id === testItemId);
    expect(foundInJanuary).toBeUndefined();

    // Verificar que o item NÃO aparece em fevereiro/2026
    const itemsFebruary2026 = await caller.finance.listItems({
      month: 2,
      year: 2026,
    });
    const foundInFebruary = itemsFebruary2026.find((i) => i.id === testItemId);
    expect(foundInFebruary).toBeUndefined();
  });

  it("should unarchive item correctly", async () => {
    // Primeiro arquivar
    await caller.finance.archiveItem({
      itemId: testItemId,
      archiveFromMonth: 1,
      archiveFromYear: 2026,
    });

    // Depois desarquivar
    await caller.finance.unarchiveItem({
      itemId: testItemId,
    });

    // Verificar que o item agora aparece em janeiro/2026
    const itemsJanuary2026 = await caller.finance.listItems({
      month: 1,
      year: 2026,
    });
    const foundInJanuary = itemsJanuary2026.find((i) => i.id === testItemId);
    expect(foundInJanuary).toBeDefined();
    expect(foundInJanuary?.name).toBe("Test Archive Item");

    // Verificar que o item também aparece em fevereiro/2026
    const itemsFebruary2026 = await caller.finance.listItems({
      month: 2,
      year: 2026,
    });
    const foundInFebruary = itemsFebruary2026.find((i) => i.id === testItemId);
    expect(foundInFebruary).toBeDefined();
  });

  it("should handle archiving from past months correctly", async () => {
    // Arquivar a partir de novembro/2025
    await caller.finance.archiveItem({
      itemId: testItemId,
      archiveFromMonth: 11,
      archiveFromYear: 2025,
    });

    // Verificar que o item NÃO aparece em novembro/2025
    const itemsNovember2025 = await caller.finance.listItems({
      month: 11,
      year: 2025,
    });
    const foundInNovember = itemsNovember2025.find((i) => i.id === testItemId);
    expect(foundInNovember).toBeUndefined();

    // Verificar que o item NÃO aparece em dezembro/2025
    const itemsDecember2025 = await caller.finance.listItems({
      month: 12,
      year: 2025,
    });
    const foundInDecember = itemsDecember2025.find((i) => i.id === testItemId);
    expect(foundInDecember).toBeUndefined();

    // Verificar que o item NÃO aparece em janeiro/2026
    const itemsJanuary2026 = await caller.finance.listItems({
      month: 1,
      year: 2026,
    });
    const foundInJanuary = itemsJanuary2026.find((i) => i.id === testItemId);
    expect(foundInJanuary).toBeUndefined();

    // Desarquivar para restaurar estado original
    await caller.finance.unarchiveItem({
      itemId: testItemId,
    });
  });

  it("should handle year boundary correctly", async () => {
    // Arquivar a partir de dezembro/2025
    await caller.finance.archiveItem({
      itemId: testItemId,
      archiveFromMonth: 12,
      archiveFromYear: 2025,
    });

    // Verificar que o item ainda aparece em novembro/2025
    const itemsNovember2025 = await caller.finance.listItems({
      month: 11,
      year: 2025,
    });
    const foundInNovember = itemsNovember2025.find((i) => i.id === testItemId);
    expect(foundInNovember).toBeDefined();

    // Verificar que o item NÃO aparece em dezembro/2025
    const itemsDecember2025 = await caller.finance.listItems({
      month: 12,
      year: 2025,
    });
    const foundInDecember = itemsDecember2025.find((i) => i.id === testItemId);
    expect(foundInDecember).toBeUndefined();

    // Verificar que o item NÃO aparece em janeiro/2026
    const itemsJanuary2026 = await caller.finance.listItems({
      month: 1,
      year: 2026,
    });
    const foundInJanuary = itemsJanuary2026.find((i) => i.id === testItemId);
    expect(foundInJanuary).toBeUndefined();

    // Desarquivar para restaurar estado original
    await caller.finance.unarchiveItem({
      itemId: testItemId,
    });
  });
});
