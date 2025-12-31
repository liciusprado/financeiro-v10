import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";

describe("copyPreviousMonthPlanned", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    caller = appRouter.createCaller({
      user: {
        id: 1, // Use numeric ID
        openId: "test-user",
        name: "Test User",
        email: "test@example.com",
        role: "user",
      },
    });
  });

  it("should copy planned values from previous month", async () => {
    // Arrange: Create test data for November 2025
    const testMonth = 11;
    const testYear = 2025;
    const targetMonth = 12;
    const targetYear = 2025;

    // Get all items
    const items = await caller.finance.listItems({ month: testMonth, year: testYear });
    expect(items.length).toBeGreaterThan(0);

    // Create some entries for November with planned values
    const testItem = items[0];
    await caller.finance.upsertEntry({
      itemId: testItem.id,
      month: testMonth,
      year: testYear,
      person: "licius",
      plannedValue: 100000, // R$ 1.000,00 in centavos
      actualValue: 50000, // R$ 500,00 in centavos
    });

    await caller.finance.upsertEntry({
      itemId: testItem.id,
      month: testMonth,
      year: testYear,
      person: "marielly",
      plannedValue: 200000, // R$ 2.000,00 in centavos
      actualValue: 150000, // R$ 1.500,00 in centavos
    });

    // Act: Copy previous month
    const result = await caller.finance.copyPreviousMonthPlanned({
      month: targetMonth,
      year: targetYear,
    });

    // Assert: Check result
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.copiedCount).toBeGreaterThan(0);

    // Verify that planned values were copied
    const decemberEntries = await caller.finance.getMonthEntries({
      month: targetMonth,
      year: targetYear,
    });

    const liciusEntry = decemberEntries.find(
      (e) => e.itemId === testItem.id && e.person === "licius"
    );
    const mariellyEntry = decemberEntries.find(
      (e) => e.itemId === testItem.id && e.person === "marielly"
    );

    expect(liciusEntry).toBeDefined();
    expect(liciusEntry?.plannedValue).toBe(100000); // Copied from November
    expect(liciusEntry?.actualValue).toBe(0); // Should be 0, not copied

    expect(mariellyEntry).toBeDefined();
    expect(mariellyEntry?.plannedValue).toBe(200000); // Copied from November
    expect(mariellyEntry?.actualValue).toBe(0); // Should be 0, not copied
  });

  it("should handle copying when no previous month data exists", async () => {
    // Act: Try to copy from a month with no data (January 2020)
    const result = await caller.finance.copyPreviousMonthPlanned({
      month: 2,
      year: 2020,
    });

    // Assert: Should succeed but copy 0 entries
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.copiedCount).toBe(0);
  });

  it("should handle January by copying from December of previous year", async () => {
    // Arrange: Create test data for December 2024
    const items = await caller.finance.listItems({ month: 12, year: 2024 });
    const testItem = items[0];

    await caller.finance.upsertEntry({
      itemId: testItem.id,
      month: 12,
      year: 2024,
      person: "licius",
      plannedValue: 300000, // R$ 3.000,00
      actualValue: 0,
    });

    // Act: Copy to January 2025
    const result = await caller.finance.copyPreviousMonthPlanned({
      month: 1,
      year: 2025,
    });

    // Assert: Should copy from December 2024
    expect(result.success).toBe(true);
    expect(result.copiedCount).toBeGreaterThan(0);

    const januaryEntries = await caller.finance.getMonthEntries({
      month: 1,
      year: 2025,
    });

    const liciusEntry = januaryEntries.find(
      (e) => e.itemId === testItem.id && e.person === "licius"
    );

    expect(liciusEntry).toBeDefined();
    expect(liciusEntry?.plannedValue).toBe(300000); // Copied from December 2024
    expect(liciusEntry?.actualValue).toBe(0);
  });
});
