import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, userSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Settings API", () => {
  let testUserId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar usuário de teste
    const result = await db.insert(users).values({
      openId: `test-settings-${Date.now()}`,
      name: "Test User Settings",
      email: "test-settings@example.com",
    });

    testUserId = Number(result[0].insertId);

    // Limpar configurações anteriores
    await db.delete(userSettings).where(eq(userSettings.userId, testUserId));
  });

  it("deve retornar configurações padrão quando usuário não tem configurações", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-settings",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    const settings = await caller.finance.getSettings();

    expect(settings).toBeDefined();
    expect(settings.colorTabs).toBe("#3b82f6");
    expect(settings.colorButtons).toBe("#3b82f6");
    expect(settings.fontSize).toBe(16);
    expect(settings.fontFamily).toBe("Inter");
    expect(settings.chartType).toBe("pie");
  });

  it("deve salvar e recuperar configurações personalizadas", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-settings",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Salvar configurações
    await caller.finance.updateSettings({
      colorTabs: "#ff0000",
      colorButtons: "#00ff00",
      fontSize: 18,
      fontFamily: "Roboto",
      chartType: "bar",
      autoBackupEnabled: true,
    });

    // Recuperar configurações
    const settings = await caller.finance.getSettings();

    expect(settings.colorTabs).toBe("#ff0000");
    expect(settings.colorButtons).toBe("#00ff00");
    expect(settings.fontSize).toBe(18);
    expect(settings.fontFamily).toBe("Roboto");
    expect(settings.chartType).toBe("bar");
    expect(settings.autoBackupEnabled).toBe(true);
  });

  it("deve atualizar apenas campos específicos", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-settings",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Salvar configurações iniciais
    await caller.finance.updateSettings({
      colorTabs: "#ff0000",
      fontSize: 18,
    });

    // Atualizar apenas fontSize
    await caller.finance.updateSettings({
      fontSize: 20,
    });

    // Verificar que colorTabs permaneceu e fontSize foi atualizado
    const settings = await caller.finance.getSettings();

    expect(settings.colorTabs).toBe("#ff0000");
    expect(settings.fontSize).toBe(20);
  });
});
