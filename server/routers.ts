import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { checkAndNotifyBudgetExceeded } from "./whatsapp-notifications";
import { items } from "../drizzle/schema";
// Types for investment transactions
import type { InsertInvestmentTransaction } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { fetchTransactionsFromBelvo, fetchCreditCardTransactionsFromBelvo, fetchInvestmentTransactionsFromBelvo } from "./bankIntegration";
// Import helpers for two-factor notifications
import { sendNotificationToPerson, broadcastNotification } from "./notificationService";
// TOTP support
import { authenticator } from 'otplib';
import { encrypt as encryptText, decrypt as decryptText } from './encryption';
import crypto from 'crypto';
// Backup router
import { backupRouter } from "./routes/backup";
// Project router
import { projectRouter } from "./routes/project";
// Custom Alert router
import { customAlertRouter } from "./routes/customAlert";
// Dashboard router
import { dashboardRouter } from "./routes/dashboard";
// Currency router
import { currencyRouter } from "./routes/currency";
// Open Banking router
import { openBankingRouter } from "./routes/openBanking";
// Collaboration router
import { collaborationRouter } from "./routes/collaboration";
// Security router
import { securityRouter } from "./routes/security";
// Credit Cards & Installments routers
import { creditCardsRouter, installmentsRouter } from "./routes/creditCardsInstallments";
// Investments & Loans routers
import { investmentsRouter, loansRouter } from "./routes/investmentsLoans";
// Bill Splitting & Recurring routers
import { billSplittingRouter, recurringRouter } from "./routes/billSplittingRecurring";
// Reports & Analytics routers
import { exportRouter, analyticsRouter, simulationRouter } from "./routes/reportsAnalytics";

// AI classifier and recommendation helpers
import {
  classifyTransaction as aiClassifyTransaction,
  detectAnomaly as aiDetectAnomaly,
  forecastCashFlow as aiForecastCashFlow,
  generateRecommendations as aiGenerateRecommendations,
  classifyInputSchema,
  classifyOutputSchema,
  forecastInputSchema,
  forecastOutputSchema,
  recommendationsOutputSchema,
} from './aiClassifier';

// In-memory storage for WebAuthn challenges. Keys are userIds (for registration)
// or a unique identifier for the login flow. Values store the challenge and the
// type of operation (registration or login). In a real production setting
// this data should be stored in a session or persistent store to prevent
// replay attacks and to support horizontal scaling.
const webAuthnChallenges: Map<number | string, { type: 'registration' | 'login'; challenge: string }> = new Map();

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    /**
     * Begins WebAuthn registration for the current user. Generates a random
     * challenge and returns WebAuthn registration options to the client. The
     * challenge is stored temporarily in memory. Clients should pass the
     * returned options to `navigator.credentials.create` on the browser. This
     * endpoint is protected so it requires the user to be authenticated via
     * Manus before registering a biometric credential.
     */
    beginWebAuthnRegistration: protectedProcedure
      .input(z.object({ label: z.string().optional() }).optional())
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        // Generate a random challenge (base64url encoded)
        const challengeBuffer = crypto.randomBytes(32);
        const challenge = challengeBuffer.toString('base64url');
        // Store the challenge for this user
        webAuthnChallenges.set(userId, { type: 'registration', challenge });
        // Assemble the registration options. The RP ID is derived from the
        // domain of your application. The RP name appears in the authenticator
        // UI. The user handle must be unique per user and should be encoded as
        // a string. We cast the numeric user ID to a string for this purpose.
        const rpId = process.env.WEBAUTHN_RPID || ctx.req.hostname;
        const rpName = 'Planejamento Financeiro';
        const userHandle = Buffer.from(String(userId)).toString('base64url');
        const label = input?.label || ctx.user.name || ctx.user.email || '';
        return {
          rp: { id: rpId, name: rpName },
          user: { id: userHandle, name: label, displayName: label },
          challenge,
          pubKeyCredParams: [ { type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 } ],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60000,
        } as const;
      }),

    /**
     * Completes WebAuthn registration. The client should pass the credential
     * identifier and public key returned by `navigator.credentials.create`. The
     * server does not currently verify the attestation due to the complexity
     * of WebAuthn parsing. Instead, it blindly stores the credential. In a
     * production environment you should verify the attestation statement and
     * ensure the origin and rpId are correct.
     */
    completeWebAuthnRegistration: protectedProcedure
      .input(z.object({ credentialId: z.string(), publicKey: z.string(), signCount: z.number().optional(), label: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        // Remove the stored challenge
        webAuthnChallenges.delete(userId);
        // Persist the credential in the database
        await db.createWebAuthnCredential({
          userId: userId,
          credentialId: input.credentialId,
          publicKey: input.publicKey,
          signCount: input.signCount ?? 0,
          label: input.label ?? null,
        });
        // Mark WebAuthn enabled in user settings
        await db.upsertUserSettings(userId, { webAuthnEnabled: true } as any);
        return { success: true } as const;
      }),

    /**
     * Begins WebAuthn login for a user. Accepts a userId and returns a
     * challenge and the list of registered credentials associated with the
     * account. The client should call `navigator.credentials.get` with these
     * options. Because the user may not be authenticated at this point, this
     * endpoint is public. In a real application you would identify the user by
     * their email or username before calling this endpoint.
     */
    beginWebAuthnLogin: publicProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const { userId } = input;
        // Generate a challenge for login
        const challenge = crypto.randomBytes(32).toString('base64url');
        // Store the challenge keyed by a composite key of userId-login
        webAuthnChallenges.set(`${userId}-login`, { type: 'login', challenge });
        // Fetch credentials for the user
        const creds = await db.getWebAuthnCredentialsByUser(userId);
        const allowCredentials = creds.map((cred) => ({ id: cred.credentialId, type: 'public-key' }));
        return { challenge, allowCredentials, timeout: 60000, userVerification: 'required' } as const;
      }),

    /**
     * Completes WebAuthn login. The client must provide the userId and the
     * credentialId used. This implementation does not verify the signature
     * against the stored public key due to the complexity of WebAuthn. It
     * simply removes the challenge and returns success. In a production
     * environment you must verify the assertion by using a WebAuthn library.
     */
    completeWebAuthnLogin: publicProcedure
      .input(z.object({ userId: z.number(), credentialId: z.string() }))
      .mutation(async ({ input }) => {
        const key = `${input.userId}-login`;
        webAuthnChallenges.delete(key);
        // Optionally update the signCount or perform other checks
        return { success: true } as const;
      }),

    /**
     * Disables WebAuthn for the current user. Deletes all stored credentials and
     * sets the webAuthnEnabled flag to false in user settings. This operation
     * requires authentication.
     */
    disableWebAuthn: protectedProcedure
      .mutation(async ({ ctx }) => {
        const userId = ctx.user.id;
        // Delete all credentials for user
        const creds = await db.getWebAuthnCredentialsByUser(userId);
        for (const cred of creds) {
          await db.deleteWebAuthnCredential(cred.credentialId);
        }
        // Mark disabled in settings
        await db.upsertUserSettings(userId, { webAuthnEnabled: false } as any);
        return { success: true } as const;
      }),
  }),

  finance: router({
    // Categorias
    listCategories: protectedProcedure.query(async () => {
      return db.getAllCategories();
    }),
    
    createCategory: protectedProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["income", "expense", "investment"]),
        color: z.string().optional(),
        orderIndex: z.number().optional(),
        icon: z.string().optional(),
        imageUrl: z.string().optional(),
        budgetGroup: z.enum(["fixed", "variable", "nonMonthly", "needs", "wants", "savings"]).optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createCategory(input);
      }),
    
    updateCategory: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1),
        color: z.string().optional(),
        icon: z.string().optional(),
        imageUrl: z.string().optional(),
        budgetGroup: z.enum(["fixed", "variable", "nonMonthly", "needs", "wants", "savings"]).optional(),
      }))
      .mutation(async ({ input }) => {
        return db.updateCategory(input.id, {
          name: input.name,
          color: input.color,
          icon: input.icon ?? null,
          imageUrl: input.imageUrl ?? null,
          budgetGroup: input.budgetGroup,
        });
      }),
    
    deleteCategory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Verificar se há itens usando esta categoria
        const itemsInCategory = await db.getItemsByCategoryId(input.id);
        if (itemsInCategory.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Não é possível deletar esta categoria pois existem ${itemsInCategory.length} item(ns) vinculado(s) a ela.`,
          });
        }
        return db.deleteCategory(input.id);
      }),
    
    // Itens
    listItems: protectedProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .query(async ({ input }) => {
        const allItems = await db.getAllItems();
        // Filtrar itens inativos baseado no mês selecionado
        return allItems.filter(item => {
          if (!item.inactiveFromMonth || !item.inactiveFromYear) {
            return true; // Item ativo
          }
          // Comparar mês/ano: item é visível se selectedMonth < inactiveFromMonth
          const selectedDate = input.year * 12 + input.month;
          const inactiveDate = item.inactiveFromYear * 12 + item.inactiveFromMonth;
          return selectedDate < inactiveDate;
        });
      }),
    
    createItem: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string(),
        customCategory: z.string().optional(),
        orderIndex: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createItem(input);
      }),
    
    deleteItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteItem(input.id);
      }),

    archiveItem: protectedProcedure
      .input(z.object({
        id: z.number(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.archiveItem(input.id, input.month, input.year);
      }),

    unarchiveItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.unarchiveItem(input.id);
      }),

    reorderItems: protectedProcedure
      .input(
        z.object({
          categoryId: z.number(),
          itemIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input }) => {
        return db.reorderItems(input.categoryId, input.itemIds);
      }),

    /**
     * Importa uma lista de lançamentos a partir de um arquivo CSV processado no front-end.
     * Cada linha do CSV deve conter: data (YYYY-MM-DD), description, amount, category (opcional),
     * person ("licius" ou "marielly"). O campo amount deve estar em reais (positivo para receitas
     * e negativo para despesas/investimentos). Se a categoria não existir, ela será criada
     * automaticamente com base no sinal do valor (receitas => income, despesas negativas => expense,
     * investimentos negativos => investment). Para cada lançamento, é criado um item com o nome
     * da descrição caso ainda não exista um item com o mesmo nome na categoria. Em seguida, um entry
     * é inserido com o valor absoluto em centavos como actualValue. O plannedValue é definido como 0.
     */
    importCSVEntries: protectedProcedure
      .input(
        z.object({
          entries: z.array(
            z.object({
              date: z.string(),
              description: z.string(),
              amount: z.number(),
              category: z.string().optional(),
              person: z.enum(["licius", "marielly"]).optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        let createdCount = 0;

        for (const row of input.entries) {
          try {
            // Parse data
            const { date, description, amount } = row;
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
              continue; // skip invalid date
            }
            const month = parsedDate.getMonth() + 1;
            const year = parsedDate.getFullYear();
            // Determine person (default to 'licius' if missing)
            const person: "licius" | "marielly" = row.person ?? "licius";
            // Use AI classifier to determine category name and type
            const { categoryName, categoryType } = aiClassifyTransaction(
              description,
              amount,
              row.category
            );
            // Find or create the category
            let category = await db.findCategoryByName(categoryName);
            if (!category) {
              await db.createCategory({ name: categoryName, type: categoryType });
              category = await db.findCategoryByName(categoryName);
            }
            if (!category) continue;
            // Determine or create item
            const itemName = description.trim() || "Transação";
            let item = await db.findItemByNameAndCategoryId(itemName, category.id as number);
            if (!item) {
              await db.createItem({ categoryId: category.id as number, name: itemName });
              item = await db.findItemByNameAndCategoryId(itemName, category.id as number);
            }
            if (!item) continue;
            // Determine value in cents
            const actualValue = Math.round(Math.abs(amount) * 100);
            // Create entry
            await db.upsertEntry({
              itemId: (item.id as number),
              userId,
              month,
              year,
              person,
              plannedValue: 0,
              actualValue,
            });
            createdCount++;
            // Detect anomalies: if transaction is an expense and exceeds historical average
            if (categoryType !== "income") {
              try {
                const anomaly = await aiDetectAnomaly(userId, category.id as number, actualValue, month, year, { threshold: 2, minSamples: 3 });
                if (anomaly.isAnomalous && anomaly.average > 0) {
                  // Notify both partners of unusual spending
                  const subject = `Gasto atípico em ${categoryName}`;
                  const amountReal = (actualValue / 100).toFixed(2);
                  const avgReal = (anomaly.average / 100).toFixed(2);
                  const message = `Foi registrado um gasto de R$ ${amountReal} na categoria "${categoryName}", que excede mais de duas vezes a média histórica de R$ ${avgReal}. Verifique este lançamento.`;
                  // send notifications to both users individually
                  await sendNotificationToPerson("licius", subject, message);
                  await sendNotificationToPerson("marielly", subject, message);
                }
              } catch (err) {
                console.error("[AI] Erro ao detectar anomalia:", err);
              }
            }
          } catch (error) {
            console.error("[ImportCSV] Falha ao importar linha", row, error);
            continue;
          }
        }
        return { createdCount };
      }),

    /**
     * Import credit card transactions from an Open Finance provider. The front‑end
     * must provide a valid `linkId` (obtained via Belvo's consent flow), a
     * date range and the person for which the transactions belong (Lícius or
     * Marielly). This mutation fetches all credit card bills in the range,
     * flattens them into individual transactions, and for each transaction:
     *   1. Determines or creates a category based on the transaction category or
     *      description (defaulting to expense);
     *   2. Creates an item named after the merchant/description if one does not
     *      already exist in that category;
     *   3. Inserts a new entry with the absolute value as actualValue. The
     *      month and year are derived from the transaction date, plannedValue is
     *      set to 0 and notes are left blank.
     */
    importCreditCardTransactions: protectedProcedure
      .input(
        z.object({
          linkId: z.string().min(1),
          startDate: z.string(),
          endDate: z.string(),
          person: z.enum(["licius", "marielly"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        // Fetch credit card transactions from the provider
        const creditTxs = await fetchCreditCardTransactionsFromBelvo(
          input.linkId,
          input.startDate,
          input.endDate
        );
        let imported = 0;
        for (const tx of creditTxs) {
          try {
            // Parse date into month/year
            const parsedDate = new Date(tx.date);
            if (isNaN(parsedDate.getTime())) continue;
            const month = parsedDate.getMonth() + 1;
            const year = parsedDate.getFullYear();
            // Use AI classifier to derive category name and type
            const { categoryName, categoryType } = aiClassifyTransaction(
              tx.description || '',
              tx.amount,
              tx.category
            );
            let category = await db.findCategoryByName(categoryName);
            if (!category) {
              await db.createCategory({
                name: categoryName,
                type: categoryType,
                color: undefined,
                orderIndex: undefined,
                icon: undefined,
                imageUrl: undefined,
              });
              category = await db.findCategoryByName(categoryName);
            }
            if (!category) continue;
            // Determine or create item based on transaction description
            const itemName = tx.description || "Compra";
            let item = await db.findItemByNameAndCategoryId(itemName, category.id);
            if (!item) {
              await db.createItem({ categoryId: category.id, name: itemName });
              item = await db.findItemByNameAndCategoryId(itemName, category.id);
            }
            if (!item) continue;
            // Insert entry: value in centavos; negative amounts for expenses/investments
            const valueCents = Math.round(Math.abs(tx.amount) * 100);
            await db.upsertEntry({
              itemId: item.id,
              userId: userId,
              month: month,
              year: year,
              person: input.person,
              plannedValue: 0,
              actualValue: valueCents,
              notes: null,
              reviewRequested: false,
            });
            imported++;
            // Detect anomalies for expenses/investments
            if (categoryType !== "income") {
              try {
                const anomaly = await aiDetectAnomaly(userId, category.id, valueCents, month, year, { threshold: 2, minSamples: 3 });
                if (anomaly.isAnomalous && anomaly.average > 0) {
                  const subject = `Gasto atípico em ${categoryName}`;
                  const amountReal = (valueCents / 100).toFixed(2);
                  const avgReal = (anomaly.average / 100).toFixed(2);
                  const message = `Foi registrado um gasto de R$ ${amountReal} na categoria "${categoryName}", que excede mais de duas vezes a média histórica de R$ ${avgReal}. Verifique este lançamento.`;
                  await sendNotificationToPerson("licius", subject, message);
                  await sendNotificationToPerson("marielly", subject, message);
                }
              } catch (err) {
                console.error("[AI] Erro ao detectar anomalia:", err);
              }
            }
          } catch (err) {
            console.error("[Import CC] Error processing transaction", err);
            continue;
          }
        }
        return { imported };
      }),

    /**
     * Import investment transactions from an Open Finance provider. The client
     * provides the linkId and date range. This mutation retrieves the
     * investment operations via the provider, then stores them in the
     * investment_transactions table. These records are not added to the
     * monthly entries because investment operations affect net worth rather
     * than monthly budget totals. Instead they can be displayed in a
     * dedicated report.
     */
    importInvestmentTransactions: protectedProcedure
      .input(
        z.object({
          linkId: z.string().min(1),
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const invTxs = await fetchInvestmentTransactionsFromBelvo(
          input.linkId,
          input.startDate,
          input.endDate
        );
        const toInsert: InsertInvestmentTransaction[] = invTxs.map((tx) => ({
          userId: userId,
          externalId: tx.id,
          linkId: input.linkId,
          date: tx.date,
          instrument: tx.instrument,
          quantity: String(tx.quantity),
          grossValue: String(tx.grossValue),
          netValue: String(tx.netValue),
          operationType: tx.operationType,
        }));
        await db.createInvestmentTransactionsBatch(toInsert);
        return { imported: invTxs.length };
      }),

    /**
     * Importa transações a partir de um provedor de Open Banking (por exemplo, Belvo). O cliente deve
     * fornecer o identificador do link (linkId) e o intervalo de datas no formato YYYY-MM-DD. Todas
     * as transações recuperadas são classificadas de acordo com o sinal do valor (receita vs. despesa).
     * O parâmetro person determina a quem pertence cada lançamento ("licius" ou "marielly").
     */
    importBankTransactions: protectedProcedure
      .input(
        z.object({
          linkId: z.string(),
          startDate: z.string(),
          endDate: z.string(),
          person: z.enum(["licius", "marielly"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const { linkId, startDate, endDate, person } = input;
        // Fetch transactions from the provider. Any error will propagate to the client.
        const transactions = await fetchTransactionsFromBelvo(linkId, startDate, endDate);
        let importedCount = 0;
        for (const tx of transactions) {
          try {
            const parsedDate = new Date(tx.date);
            if (isNaN(parsedDate.getTime())) continue;
            const month = parsedDate.getMonth() + 1;
            const year = parsedDate.getFullYear();
            const amount = tx.amount;
            // Use AI classifier to determine category
            const { categoryName, categoryType } = aiClassifyTransaction(
              tx.description || '',
              amount,
              tx.category
            );
            let category = await db.findCategoryByName(categoryName);
            if (!category) {
              await db.createCategory({ name: categoryName, type: categoryType });
              category = await db.findCategoryByName(categoryName);
            }
            if (!category) continue;
            const itemName = tx.description?.trim() || "Transação";
            let item = await db.findItemByNameAndCategoryId(itemName, category.id as number);
            if (!item) {
              await db.createItem({ categoryId: category.id as number, name: itemName });
              item = await db.findItemByNameAndCategoryId(itemName, category.id as number);
            }
            if (!item) continue;
            const actualValue = Math.round(Math.abs(amount) * 100);
            await db.upsertEntry({
              itemId: (item.id as number),
              userId,
              month,
              year,
              person,
              plannedValue: 0,
              actualValue,
            });
            importedCount++;
            // Anomaly detection for expenses/investments
            if (categoryType !== "income") {
              try {
                const anomaly = await aiDetectAnomaly(userId, category.id as number, actualValue, month, year, { threshold: 2, minSamples: 3 });
                if (anomaly.isAnomalous && anomaly.average > 0) {
                  const subject = `Gasto atípico em ${categoryName}`;
                  const amountReal = (actualValue / 100).toFixed(2);
                  const avgReal = (anomaly.average / 100).toFixed(2);
                  const message = `Foi registrado um gasto de R$ ${amountReal} na categoria "${categoryName}", que excede mais de duas vezes a média histórica de R$ ${avgReal}. Verifique este lançamento.`;
                  await sendNotificationToPerson("licius", subject, message);
                  await sendNotificationToPerson("marielly", subject, message);
                }
              } catch (err) {
                console.error("[AI] Erro ao detectar anomalia:", err);
              }
            }
          } catch (error) {
            console.error("[ImportBank] Erro ao importar transação", tx, error);
            continue;
          }
        }
        return { importedCount };
      }),

    updateItemName: protectedProcedure
      .input(z.object({ 
        itemId: z.number(), 
        name: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        return db.updateItemName(input.itemId, input.name);
      }),
    
    // Lançamentos
    getMonthEntries: protectedProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        let entries = await db.getEntriesByMonth(ctx.user.id, input.month, input.year);
        // Decrypt notes for each entry if encrypted. Invalid ciphertext is returned as is.
        try {
          const { decrypt: decryptText } = await import("./encryption");
          entries = entries.map((entry: any) => {
            if (entry.notes) {
              try {
                entry.notes = decryptText(entry.notes as any);
              } catch {
                // Keep original if decryption fails
              }
            }
              return entry;
          });
        } catch (err) {
          console.error('[Encryption] Failed to load decrypt module:', err);
        }
        // Trigger due date notifications asynchronously (do not block the response)
        try {
          // Dynamically import to avoid circular dependency at load time
          const mod = await import("./due-date-notifications");
          mod
            .checkDueDateNotifications(input.month, input.year)
            .catch((err: any) => {
              console.error(
                "[DueDate] Erro ao verificar notificações de vencimento:",
                err
              );
            });
        } catch (error) {
          console.error(
            "[DueDate] Erro ao importar módulo de notificações de vencimento:",
            error
          );
        }
        return entries;
      }),
    
    upsertEntry: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        itemId: z.number(),
        month: z.number(),
        year: z.number(),
        person: z.enum(["licius", "marielly"]),
        plannedValue: z.number().optional(),
        actualValue: z.number().optional(),
        notes: z.string().nullable().optional(),
        reviewRequested: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Buscar entry existente para auditoria
        let oldEntry = null;
        if (input.id) {
          const entries = await db.getEntriesByMonth(ctx.user.id, input.month, input.year);
          oldEntry = entries.find((e: any) => e.id === input.id);
        }
        
        const result = await db.upsertEntry({ ...input, userId: ctx.user.id });
        
        // Registrar auditoria
        const entryId = 'id' in result ? result.id : null;
        if (oldEntry && entryId) {
          const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
          
          if (input.plannedValue !== undefined && oldEntry.plannedValue !== input.plannedValue) {
            changes.push({
              field: `plannedValue_${input.person}`,
              oldValue: String(oldEntry.plannedValue || 0),
              newValue: String(input.plannedValue),
            });
          }
          
          if (input.actualValue !== undefined && oldEntry.actualValue !== input.actualValue) {
            changes.push({
              field: `actualValue_${input.person}`,
              oldValue: String(oldEntry.actualValue || 0),
              newValue: String(input.actualValue),
            });
          }
          
          // Criar logs de auditoria
          for (const change of changes) {
            await db.createAuditLog({
              entryId: entryId,
              userId: ctx.user.id,
              action: "update",
              fieldChanged: change.field,
              oldValue: change.oldValue,
              newValue: change.newValue,
            });
          }
        } else if (entryId && !oldEntry) {
          // Novo entry criado
          await db.createAuditLog({
            entryId: entryId,
            userId: ctx.user.id,
            action: "create",
            fieldChanged: null,
            oldValue: null,
            newValue: null,
          });
        }
        
        // Verificar se precisa enviar notificação de ultrapassagem de orçamento
        if (input.actualValue !== undefined && input.actualValue > 0) {
          // Executar verificação de forma assíncrona sem bloquear a resposta
          checkAndNotifyBudgetExceeded(
            input.itemId,
            input.month,
            input.year,
            input.person
          ).catch((error) => {
            console.error("[WhatsApp] Erro ao verificar notificação:", error);
          });
        }
        
        return result;
      }),
    
    deleteEntry: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // BUGFIX: Pass month/year to ensure deletion only affects correct month
        return db.deleteEntry(input.id, ctx.user.id, input.month, input.year);
      }),

    /**
     * Uses AI heuristics to classify a transaction description and amount into
     * a category name and type. This endpoint can be called by the
     * front‑end when importing or editing transactions to suggest a
     * category automatically. If a category is provided, it is returned
     * unchanged with a type inferred from the amount.
     */
    classifyTransaction: protectedProcedure
      .input(classifyInputSchema)
      .output(classifyOutputSchema)
      .query(async ({ input }) => {
        const { description, amount, category } = input;
        return aiClassifyTransaction(description, amount, category);
      }),

    /**
     * Advanced AI classification with multiple suggestions and confidence scores.
     * Returns up to 3 category suggestions sorted by confidence, learning from
     * user's historical classification patterns.
     */
    classifyTransactionAdvanced: protectedProcedure
      .input(classifyInputSchema)
      .output(
        z.array(
          z.object({
            categoryName: z.string(),
            categoryType: z.enum(["income", "expense", "investment"]),
            confidence: z.number().min(0).max(100),
          })
        )
      )
      .query(async ({ ctx, input }) => {
        const { description, amount, category } = input;
        const { classifyTransactionAdvanced } = await import("./aiClassifier");
        return classifyTransactionAdvanced(ctx.user.id, description, amount, category);
      }),

    /**
     * Learn from user classification. Called when user manually selects or
     * confirms a category for a transaction. The AI will remember this choice
     * and improve future suggestions.
     */
    learnClassification: protectedProcedure
      .input(
        z.object({
          description: z.string(),
          amount: z.number(),
          categoryId: z.number(),
          source: z.enum(["manual", "confirmed"]).default("manual"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { learnFromClassification } = await import("./aiClassifier");
        await learnFromClassification(
          ctx.user.id,
          input.description,
          input.amount,
          input.categoryId,
          input.source
        );
        return { success: true };
      }),

    /**
     * Get classification statistics for current user.
     * Shows how much the AI has learned from user behavior.
     */
    getClassificationStats: protectedProcedure.query(async ({ ctx }) => {
      const { getClassificationStats } = await import("./aiClassifier");
      return getClassificationStats(ctx.user.id);
    }),

    /**
     * Forecasts the net cash flow (income minus expenses) for the next
     * several months by averaging historical balances. Useful for planning
     * ahead and identifying potential shortfalls. The `months` parameter
     * controls how many months to forecast; defaults to 3.
     */
    forecastCashFlow: protectedProcedure
      .input(forecastInputSchema)
      .output(forecastOutputSchema)
      .query(async ({ ctx, input }) => {
        const months = input.months ?? 3;
        return aiForecastCashFlow(ctx.user.id, months);
      }),

    /**
     * Generates a list of proactive recommendations based on recent
     * spending patterns. Recommendations may include warnings about
     * unusually high spending in a category or negative cash flow
     * predictions. This endpoint is intended to be called from the
     * dashboard or settings to inform users of opportunities to improve
     * their finances.
     */
    getRecommendations: protectedProcedure
      .output(recommendationsOutputSchema)
      .query(async ({ ctx }) => {
        return aiGenerateRecommendations(ctx.user.id);
      }),

    /**
     * Solicita revisão de um lançamento. Atualiza o campo 'notes' (comentário) e marca
     * 'reviewRequested' como true. Em seguida, envia uma notificação para o outro parceiro
     * informando que deve revisar o lançamento. O cliente pode fornecer um comentário opcional
     * na nota.
     */
    requestReview: protectedProcedure
      .input(
        z.object({
          entryId: z.number(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Buscar o lançamento
        const entry = await db.getEntryById(input.entryId);
        if (!entry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
        }
        // Atualizar nota e flag de revisão
        await db.updateEntry(entry.id, {
          notes: input.notes ?? null,
          reviewRequested: true,
        });
        // Determinar parceiro (alvo da notificação). Se o lançamento pertence a Lícius, avisar Marielly e vice‑versa.
        const targetPerson = entry.person === "licius" ? "marielly" : "licius";
        // Buscar detalhes do item e categoria para melhorar a mensagem
        const allItems = await db.getAllItems();
        const allCategories = await db.getAllCategories();
        const item = allItems.find((it) => it.id === entry.itemId);
        const category = item ? allCategories.find((c) => c.id === item.categoryId) : undefined;
        const itemName = item?.name || "Item";
        const categoryName = category?.name || "Categoria";
        // Construir mensagem
        const subject = `Solicitação de revisão: ${itemName}`;
        let body = `${ctx.user.name || "Seu parceiro"} solicitou revisão do lançamento "${itemName}" na categoria "${categoryName}".`;
        if (input.notes && input.notes.trim().length > 0) {
          body += `\n\nComentário: ${input.notes.trim()}`;
        }
        // Enviar notificação ao parceiro
        try {
          const mod = await import("./notificationService");
          await mod.sendNotificationToPerson(
            targetPerson as "licius" | "marielly",
            subject,
            body
          );
        } catch (error) {
          console.error("[RequestReview] Erro ao enviar notificação:", error);
        }
        return { success: true } as const;
      }),

    /**
     * 2FA: Envia um código de verificação por e‑mail/WhatsApp ao parceiro selecionado.
     * O código é um número aleatório de 6 dígitos e expira em 10 minutos. O hash do código
     * e a data de expiração são armazenados em userSettings. O campo twoFactorEnabled
     * deve estar true para que o código seja necessário na próxima autenticação.
     */
    requestTwoFactorCode: protectedProcedure
      .input(z.object({ person: z.enum(["licius", "marielly"]) }))
      .mutation(async ({ ctx, input }) => {
        // Verificar se 2FA está habilitado para o usuário
        const settings = await db.getUserSettings(ctx.user.id);
        if (!settings || !settings.twoFactorEnabled) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Two‑factor authentication is not enabled." });
        }
        // Gerar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const hash = crypto.createHash('sha256').update(code).digest('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
        // Atualizar user settings
        await db.upsertUserSettings(ctx.user.id, {
          twoFactorCodeHash: hash,
          twoFactorExpiresAt: expiresAt,
        } as any);
        // Enviar código ao parceiro via e‑mail/WhatsApp
        const subject = "Seu código de verificação";
        const message = `Seu código de verificação é ${code}. Ele expira em 10 minutos.`;
        try {
          await sendNotificationToPerson(input.person, subject, message);
        } catch (error) {
          console.error('[2FA] Failed to send code:', error);
        }
        return { success: true } as const;
      }),

    /**
     * 2FA: Verifica o código fornecido pelo usuário. Se o código for correto e não estiver expirado,
     * limpa o código salvo e retorna success=true. Caso contrário, lança um erro. Após a verificação,
     * o usuário já está autenticado na sessão, então essa chamada apenas conclui o fluxo 2FA.
     */
    verifyTwoFactorCode: protectedProcedure
      .input(z.object({ code: z.string().min(4) }))
      .mutation(async ({ ctx, input }) => {
        const settings = await db.getUserSettings(ctx.user.id);
        if (!settings || !settings.twoFactorEnabled || !settings.twoFactorCodeHash || !settings.twoFactorExpiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No pending verification found." });
        }
        const now = new Date();
        if (settings.twoFactorExpiresAt < now) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Verification code expired." });
        }
        const inputHash = crypto.createHash('sha256').update(input.code).digest('hex');
        if (inputHash !== settings.twoFactorCodeHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid verification code." });
        }
        // Clear code hash and expiration
        await db.upsertUserSettings(ctx.user.id, {
          twoFactorCodeHash: null as any,
          twoFactorExpiresAt: null as any,
        });
        return { success: true } as const;
      }),

    /**
     * Configura a autenticação por aplicativo (TOTP) para o usuário atual. Gera
     * um segredo base32 e o armazena criptografado nas configurações do usuário.
     * Retorna o segredo e uma URL otpauth que pode ser utilizada para
     * configurar Google Authenticator ou apps compatíveis. Esta chamada também
     * habilita o twoFactorEnabled na conta e limpa quaisquer códigos SMS
     * pendentes.
     */
    setupTwoFactorApp: protectedProcedure
      .mutation(async ({ ctx }) => {
        const user = ctx.user;
        // Gerar novo segredo TOTP
        const secret = authenticator.generateSecret();
        // Criptografar segredo antes de armazenar
        let encryptedSecret: string;
        try {
          encryptedSecret = encryptText(secret);
        } catch (err) {
          console.error('[2FA] Failed to encrypt TOTP secret:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to set up two‑factor authentication.' });
        }
        // Atualizar configurações do usuário
        await db.upsertUserSettings(user.id, {
          twoFactorSecret: encryptedSecret as any,
          twoFactorEnabled: true,
          twoFactorCodeHash: null as any,
          twoFactorExpiresAt: null as any,
        });
        // Construir otpauth URL (issuer é o nome do aplicativo)
        const label = user.name || user.email || `User${user.id}`;
        const otpauthUrl = authenticator.keyuri(label, 'PlanejamentoFinanceiro', secret);
        return { secret, otpauthUrl } as const;
      }),

    /**
     * Verifica um código TOTP fornecido pelo usuário. Utiliza o segredo
     * armazenado em userSettings para validar o código. Não expira como SMS,
     * mas verifica de acordo com a janela de tolerância padrão (30s). Lança
     * erro se o segredo não estiver configurado ou se o código for inválido.
     */
    verifyTwoFactorAppCode: protectedProcedure
      .input(z.object({ code: z.string().min(4) }))
      .mutation(async ({ ctx, input }) => {
        const settings = await db.getUserSettings(ctx.user.id);
        if (!settings || !settings.twoFactorSecret || !settings.twoFactorEnabled) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Two‑factor authentication via app is not configured.' });
        }
        // Descriptografar segredo
        let secret: string;
        try {
          secret = decryptText(settings.twoFactorSecret as any);
        } catch (err) {
          console.error('[2FA] Failed to decrypt TOTP secret:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to verify code.' });
        }
        // Validar código utilizando otplib
        const isValid = authenticator.check(input.code, secret);
        if (!isValid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid verification code.' });
        }
        return { success: true } as const;
      }),

    /**
     * Desativa a autenticação em duas etapas (2FA) e remove o segredo TOTP.
     * Também limpa quaisquer códigos pendentes e define twoFactorEnabled como
     * false.
     */
    disableTwoFactorApp: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.upsertUserSettings(ctx.user.id, {
          twoFactorEnabled: false,
          twoFactorSecret: null as any,
          twoFactorCodeHash: null as any,
          twoFactorExpiresAt: null as any,
        });
        return { success: true } as const;
      }),
    
    // Obter dados para gráficos (últimos 6 meses)
    getChartData: protectedProcedure
      .input(z.object({
        months: z.number().default(6),
      }))
      .query(async ({ ctx, input }) => {
        const now = new Date();
        const data = [];
        
        for (let i = input.months - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();
          
          const entries = await db.getEntriesByMonth(ctx.user.id, month, year);
          const items = await db.getAllItems();
          const categories = await db.getAllCategories();
          
          let income = 0;
          let expense = 0;
          let investment = 0;
          
          entries.forEach((entry) => {
            const item = items.find((i) => i.id === entry.itemId);
            if (!item) return;
            const category = categories.find((c) => c.id === item.categoryId);
            if (!category) return;
            
            const value = entry.actualValue || 0;
            
            if (category.type === "income") income += value;
            else if (category.type === "expense") expense += value;
            else if (category.type === "investment") investment += value;
          });
          
          data.push({
            month: date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
            income,
            expense,
            investment,
            balance: income - expense - investment,
          });
        }
        
        return data;
      }),

    /**
     * Retorna a soma das despesas por pessoa ao longo dos últimos N meses. Usa apenas lançamentos
     * com categoria do tipo "expense" (despesa). O resultado é um array de objetos com nome
     * ("Lícius" ou "Marielly") e valor em centavos. Este endpoint pode ser usado para
     * desenhar um gráfico de distribuição de despesas por pessoa.
     */
    getExpenseDistributionByPerson: protectedProcedure
      .input(
        z.object({
          months: z.number().default(6),
        })
      )
      .query(async ({ ctx, input }) => {
        const now = new Date();
        let licius = 0;
        let marielly = 0;
        for (let i = input.months - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();
          const entries = await db.getEntriesByMonth(ctx.user.id, month, year);
          const items = await db.getAllItems();
          const categories = await db.getAllCategories();
          entries.forEach((entry) => {
            const item = items.find((it) => it.id === entry.itemId);
            if (!item) return;
            const category = categories.find((c) => c.id === item.categoryId);
            if (!category) return;
            if (category.type !== "expense") return;
            const value = entry.actualValue || 0;
            if (entry.person === "licius") licius += value;
            else if (entry.person === "marielly") marielly += value;
          });
        }
        return [
          { name: "Lícius", value: licius },
          { name: "Marielly", value: marielly },
        ];
      }),

    /**
     * Comparação Ano sobre Ano (Year-over-Year)
     * Compara o mesmo mês em anos diferentes para identificar crescimento/redução
     */
    getYearOverYearComparison: protectedProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        years: z.number().min(2).max(5).default(2), // Quantos anos comparar
      }))
      .query(async ({ ctx, input }) => {
        const currentYear = new Date().getFullYear();
        const data = [];

        for (let i = 0; i < input.years; i++) {
          const year = currentYear - i;
          const entries = await db.getEntriesByMonth(ctx.user.id, input.month, year);
          const items = await db.getAllItems();
          const categories = await db.getAllCategories();

          let income = 0;
          let expense = 0;
          let investment = 0;

          entries.forEach((entry) => {
            const item = items.find((it) => it.id === entry.itemId);
            if (!item) return;
            const category = categories.find((c) => c.id === item.categoryId);
            if (!category) return;

            const value = entry.actualValue || 0;

            if (category.type === "income") income += value;
            else if (category.type === "expense") expense += value;
            else if (category.type === "investment") investment += value;
          });

          data.push({
            year: year.toString(),
            month: new Date(year, input.month - 1).toLocaleDateString("pt-BR", { month: "long" }),
            income,
            expense,
            investment,
            balance: income - expense - investment,
          });
        }

        return data.reverse(); // Mais antigo primeiro
      }),

    /**
     * Média Móvel (Moving Average)
     * Calcula a média dos últimos N meses para suavizar tendências
     */
    getMovingAverage: protectedProcedure
      .input(z.object({
        months: z.number().min(3).max(12).default(6),
        window: z.enum(["3", "6", "12"]).default("3"), // Janela da média móvel
      }))
      .query(async ({ ctx, input }) => {
        const now = new Date();
        const windowSize = parseInt(input.window);
        const rawData = [];

        // Coletar dados brutos
        for (let i = input.months - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();

          const entries = await db.getEntriesByMonth(ctx.user.id, month, year);
          const items = await db.getAllItems();
          const categories = await db.getAllCategories();

          let income = 0;
          let expense = 0;
          let balance = 0;

          entries.forEach((entry) => {
            const item = items.find((it) => it.id === entry.itemId);
            if (!item) return;
            const category = categories.find((c) => c.id === item.categoryId);
            if (!category) return;

            const value = entry.actualValue || 0;

            if (category.type === "income") income += value;
            else if (category.type === "expense") expense += value;
          });

          balance = income - expense;

          rawData.push({
            month: date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
            income,
            expense,
            balance,
          });
        }

        // Calcular médias móveis
        const movingAverageData = rawData.map((item, index) => {
          const startIndex = Math.max(0, index - windowSize + 1);
          const slice = rawData.slice(startIndex, index + 1);

          const avgIncome = slice.reduce((sum, d) => sum + d.income, 0) / slice.length;
          const avgExpense = slice.reduce((sum, d) => sum + d.expense, 0) / slice.length;
          const avgBalance = slice.reduce((sum, d) => sum + d.balance, 0) / slice.length;

          return {
            month: item.month,
            income: item.income,
            expense: item.expense,
            balance: item.balance,
            avgIncome: Math.round(avgIncome),
            avgExpense: Math.round(avgExpense),
            avgBalance: Math.round(avgBalance),
          };
        });

        return movingAverageData;
      }),

    /**
     * Previsões Financeiras
     * Projeta receitas e despesas baseado em médias históricas
     */
    getFinancialForecast: protectedProcedure
      .input(z.object({
        historicalMonths: z.number().min(3).max(12).default(6),
        forecastMonths: z.number().min(1).max(6).default(3),
      }))
      .query(async ({ ctx, input }) => {
        const now = new Date();
        const historicalData = [];

        // Coletar dados históricos
        for (let i = input.historicalMonths - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();

          const entries = await db.getEntriesByMonth(ctx.user.id, month, year);
          const items = await db.getAllItems();
          const categories = await db.getAllCategories();

          let income = 0;
          let expense = 0;

          entries.forEach((entry) => {
            const item = items.find((it) => it.id === entry.itemId);
            if (!item) return;
            const category = categories.find((c) => c.id === item.categoryId);
            if (!category) return;

            const value = entry.actualValue || 0;

            if (category.type === "income") income += value;
            else if (category.type === "expense") expense += value;
          });

          historicalData.push({ income, expense, balance: income - expense });
        }

        // Calcular médias
        const avgIncome = historicalData.reduce((sum, d) => sum + d.income, 0) / historicalData.length;
        const avgExpense = historicalData.reduce((sum, d) => sum + d.expense, 0) / historicalData.length;
        const avgBalance = avgIncome - avgExpense;

        // Calcular crescimento linear (se houver tendência)
        const incomeGrowth = historicalData.length > 1
          ? (historicalData[historicalData.length - 1].income - historicalData[0].income) / historicalData.length
          : 0;
        const expenseGrowth = historicalData.length > 1
          ? (historicalData[historicalData.length - 1].expense - historicalData[0].expense) / historicalData.length
          : 0;

        // Gerar previsões
        const forecasts = [];
        for (let i = 1; i <= input.forecastMonths; i++) {
          const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
          const projectedIncome = Math.round(avgIncome + incomeGrowth * i);
          const projectedExpense = Math.round(avgExpense + expenseGrowth * i);

          forecasts.push({
            month: futureDate.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
            projectedIncome,
            projectedExpense,
            projectedBalance: projectedIncome - projectedExpense,
            type: "forecast" as const,
          });
        }

        return {
          historical: historicalData.map((d, i) => {
            const date = new Date(now.getFullYear(), now.getMonth() - input.historicalMonths + i + 1, 1);
            return {
              month: date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
              income: d.income,
              expense: d.expense,
              balance: d.balance,
              type: "historical" as const,
            };
          }),
          forecasts,
          averages: {
            avgIncome: Math.round(avgIncome),
            avgExpense: Math.round(avgExpense),
            avgBalance: Math.round(avgBalance),
          },
        };
      }),

    /**
     * Alertas Inteligentes
     * Identifica variações significativas (>15%) em relação ao mês anterior
     */
    getSmartAlerts: protectedProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
        threshold: z.number().min(5).max(50).default(15), // % de variação
      }))
      .query(async ({ ctx, input }) => {
        // Mês atual
        const currentEntries = await db.getEntriesByMonth(ctx.user.id, input.month, input.year);

        // Mês anterior
        let prevMonth = input.month - 1;
        let prevYear = input.year;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        const prevEntries = await db.getEntriesByMonth(ctx.user.id, prevMonth, prevYear);

        const items = await db.getAllItems();
        const categories = await db.getAllCategories();

        // Calcular totais por categoria
        const currentByCategory = new Map<number, number>();
        const prevByCategory = new Map<number, number>();

        currentEntries.forEach((entry) => {
          const item = items.find((it) => it.id === entry.itemId);
          if (!item) return;
          const categoryId = item.categoryId;
          const current = currentByCategory.get(categoryId) || 0;
          currentByCategory.set(categoryId, current + (entry.actualValue || 0));
        });

        prevEntries.forEach((entry) => {
          const item = items.find((it) => it.id === entry.itemId);
          if (!item) return;
          const categoryId = item.categoryId;
          const current = prevByCategory.get(categoryId) || 0;
          prevByCategory.set(categoryId, current + (entry.actualValue || 0));
        });

        // Identificar alertas
        const alerts = [];
        for (const [categoryId, currentValue] of currentByCategory) {
          const prevValue = prevByCategory.get(categoryId) || 0;
          if (prevValue === 0) continue; // Evitar divisão por zero

          const variation = ((currentValue - prevValue) / prevValue) * 100;

          if (Math.abs(variation) >= input.threshold) {
            const category = categories.find((c) => c.id === categoryId);
            if (!category) continue;

            alerts.push({
              categoryId,
              categoryName: category.name,
              categoryType: category.type,
              currentValue,
              previousValue: prevValue,
              variation: Math.round(variation * 10) / 10, // 1 casa decimal
              type: variation > 0 ? "increase" : "decrease",
              severity: Math.abs(variation) > 30 ? "high" : Math.abs(variation) > 20 ? "medium" : "low",
            });
          }
        }

        // Ordenar por variação absoluta
        alerts.sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation));

        return alerts;
      }),

    /**
     * Análise por Categoria
     * Mostra quais categorias mais aumentaram ou diminuíram nos últimos meses
     */
    getCategoryAnalysis: protectedProcedure
      .input(z.object({
        months: z.number().min(3).max(12).default(6),
      }))
      .query(async ({ ctx, input }) => {
        const now = new Date();
        const categoryTotals = new Map<number, { name: string; type: string; values: number[] }>();

        for (let i = input.months - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();

          const entries = await db.getEntriesByMonth(ctx.user.id, month, year);
          const items = await db.getAllItems();
          const categories = await db.getAllCategories();

          entries.forEach((entry) => {
            const item = items.find((it) => it.id === entry.itemId);
            if (!item) return;
            const category = categories.find((c) => c.id === item.categoryId);
            if (!category) return;

            if (!categoryTotals.has(category.id)) {
              categoryTotals.set(category.id, {
                name: category.name,
                type: category.type,
                values: new Array(input.months).fill(0),
              });
            }

            const data = categoryTotals.get(category.id)!;
            data.values[input.months - 1 - i] += entry.actualValue || 0;
          });
        }

        // Calcular tendências
        const analysis = Array.from(categoryTotals.entries()).map(([categoryId, data]) => {
          const firstHalf = data.values.slice(0, Math.floor(data.values.length / 2));
          const secondHalf = data.values.slice(Math.floor(data.values.length / 2));

          const avgFirst = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
          const avgSecond = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

          const trend = avgFirst === 0 ? 0 : ((avgSecond - avgFirst) / avgFirst) * 100;

          return {
            categoryId,
            categoryName: data.name,
            categoryType: data.type,
            values: data.values,
            total: data.values.reduce((sum, v) => sum + v, 0),
            average: Math.round(data.values.reduce((sum, v) => sum + v, 0) / data.values.length),
            trend: Math.round(trend * 10) / 10,
            trendDirection: trend > 5 ? "up" : trend < -5 ? "down" : "stable",
          };
        });

        // Ordenar por total (maiores gastos/receitas primeiro)
        analysis.sort((a, b) => b.total - a.total);

        return analysis;
      }),

    /**
     * Detecção de Sazonalidade
     * Identifica padrões recorrentes em meses específicos
     */
    getSeasonalityAnalysis: protectedProcedure
      .input(z.object({
        years: z.number().min(1).max(3).default(2),
      }))
      .query(async ({ ctx, input }) => {
        const currentYear = new Date().getFullYear();
        const monthlyAverages = new Array(12).fill(0).map(() => ({ income: 0, expense: 0, count: 0 }));

        // Coletar dados de múltiplos anos
        for (let yearOffset = 0; yearOffset < input.years; yearOffset++) {
          const year = currentYear - yearOffset;

          for (let month = 1; month <= 12; month++) {
            const entries = await db.getEntriesByMonth(ctx.user.id, month, year);
            const items = await db.getAllItems();
            const categories = await db.getAllCategories();

            let income = 0;
            let expense = 0;

            entries.forEach((entry) => {
              const item = items.find((it) => it.id === entry.itemId);
              if (!item) return;
              const category = categories.find((c) => c.id === item.categoryId);
              if (!category) return;

              const value = entry.actualValue || 0;

              if (category.type === "income") income += value;
              else if (category.type === "expense") expense += value;
            });

            if (income > 0 || expense > 0) {
              monthlyAverages[month - 1].income += income;
              monthlyAverages[month - 1].expense += expense;
              monthlyAverages[month - 1].count += 1;
            }
          }
        }

        // Calcular médias e identificar padrões
        const seasonality = monthlyAverages.map((data, index) => {
          const avgIncome = data.count > 0 ? Math.round(data.income / data.count) : 0;
          const avgExpense = data.count > 0 ? Math.round(data.expense / data.count) : 0;

          return {
            month: new Date(2024, index).toLocaleDateString("pt-BR", { month: "long" }),
            monthNumber: index + 1,
            avgIncome,
            avgExpense,
            avgBalance: avgIncome - avgExpense,
            dataPoints: data.count,
          };
        });

        // Identificar meses de pico
        const avgExpenseOverall = seasonality.reduce((sum, m) => sum + m.avgExpense, 0) / 12;
        const peakMonths = seasonality
          .filter((m) => m.avgExpense > avgExpenseOverall * 1.15) // 15% acima da média
          .map((m) => m.month);

        return {
          seasonality,
          insights: {
            peakExpenseMonths: peakMonths,
            avgMonthlyExpense: Math.round(avgExpenseOverall),
          },
        };
      }),
    
    // Obter alertas de orçamento (itens onde real > meta)
    getBudgetAlerts: protectedProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const entries = await db.getEntriesByMonth(ctx.user.id, input.month, input.year);
        const items = await db.getAllItems();
        const categories = await db.getAllCategories();
        
        const alerts: Array<{
          itemId: number;
          itemName: string;
          categoryName: string;
          person: string;
          planned: number;
          actual: number;
          difference: number;
        }> = [];
        
        entries.forEach((entry) => {
          const item = items.find((i) => i.id === entry.itemId);
          if (!item) return;
          const category = categories.find((c) => c.id === item.categoryId);
          if (!category) return;
          
          // Apenas alertar para despesas
          if (category.type !== "expense") return;
          
          // Verificar se o real ultrapassou a meta
          if (entry.actualValue > entry.plannedValue && entry.plannedValue > 0) {
            alerts.push({
              itemId: item.id,
              itemName: item.name,
              categoryName: category.name,
              person: entry.person === "licius" ? "Lícius" : "Marielly",
              planned: entry.plannedValue,
              actual: entry.actualValue,
              difference: entry.actualValue - entry.plannedValue,
            });
          }
        });
        
        return alerts;
      }),
    
    // Obter dados anuais para metas e progresso
    getAnnualData: protectedProcedure
      .input(z.object({
        year: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const monthlyData = [];
        
        for (let month = 1; month <= 12; month++) {
          const entries = await db.getEntriesByMonth(ctx.user.id, month, input.year);
          const items = await db.getAllItems();
          const categories = await db.getAllCategories();
          
          let plannedIncome = 0;
          let actualIncome = 0;
          let plannedExpense = 0;
          let actualExpense = 0;
          let plannedInvestment = 0;
          let actualInvestment = 0;
          
          entries.forEach((entry) => {
            const item = items.find((i) => i.id === entry.itemId);
            if (!item) return;
            const category = categories.find((c) => c.id === item.categoryId);
            if (!category) return;
            
            if (category.type === "income") {
              plannedIncome += entry.plannedValue || 0;
              actualIncome += entry.actualValue || 0;
            } else if (category.type === "expense") {
              plannedExpense += entry.plannedValue || 0;
              actualExpense += entry.actualValue || 0;
            } else if (category.type === "investment") {
              plannedInvestment += entry.plannedValue || 0;
              actualInvestment += entry.actualValue || 0;
            }
          });
          
          monthlyData.push({
            month,
            monthName: new Date(input.year, month - 1).toLocaleDateString("pt-BR", { month: "long" }),
            plannedIncome,
            actualIncome,
            plannedExpense,
            actualExpense,
            plannedInvestment,
            actualInvestment,
            plannedBalance: plannedIncome - plannedExpense - plannedInvestment,
            actualBalance: actualIncome - actualExpense - actualInvestment,
          });
        }
        
        // Calcular totais anuais
        const totals = monthlyData.reduce(
          (acc, curr) => ({
            plannedIncome: acc.plannedIncome + curr.plannedIncome,
            actualIncome: acc.actualIncome + curr.actualIncome,
            plannedExpense: acc.plannedExpense + curr.plannedExpense,
            actualExpense: acc.actualExpense + curr.actualExpense,
            plannedInvestment: acc.plannedInvestment + curr.plannedInvestment,
            actualInvestment: acc.actualInvestment + curr.actualInvestment,
          }),
          { plannedIncome: 0, actualIncome: 0, plannedExpense: 0, actualExpense: 0, plannedInvestment: 0, actualInvestment: 0 }
        );
        
        return {
          monthlyData,
          totals,
          averages: {
            income: totals.actualIncome / 12,
            expense: totals.actualExpense / 12,
            investment: totals.actualInvestment / 12,
          },
        };
      }),
    
    // Duplicar lançamentos de um mês para outro
    duplicateMonth: protectedProcedure
      .input(z.object({
        sourceMonth: z.number().min(1).max(12),
        sourceYear: z.number(),
        targetMonth: z.number().min(1).max(12),
        targetYear: z.number(),
        copyActualValues: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const sourceEntries = await db.getEntriesByMonth(
          ctx.user.id,
          input.sourceMonth,
          input.sourceYear
        );
        
        // Criar novos lançamentos no mês destino
        for (const entry of sourceEntries) {
          await db.upsertEntry({
            itemId: entry.itemId,
            month: input.targetMonth,
            year: input.targetYear,
            person: entry.person,
            plannedValue: entry.plannedValue,
            actualValue: input.copyActualValues ? entry.actualValue : 0,
            userId: ctx.user.id,
          });
        }
        
        return { success: true, count: sourceEntries.length };
      }),
    
    // Upload de anexos
    uploadAttachment: protectedProcedure
      .input(z.object({
        entryId: z.number(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileKey: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createAttachment({
          entryId: input.entryId,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          uploadedBy: ctx.user.id,
        });
        return { success: true };
      }),
    
    getAttachments: protectedProcedure
      .input(z.object({ entryId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAttachmentsByEntryId(input.entryId);
      }),
    
    updateItem: protectedProcedure
      .input(z.object({ 
        itemId: z.number(), 
        name: z.string().min(1),
        customCategory: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        await database.update(items)
          .set({ 
            name: input.name,
            customCategory: input.customCategory || null,
          })
          .where(eq(items.id, input.itemId));

        // Return the updated item
        const [updatedItem] = await database.select().from(items).where(eq(items.id, input.itemId));
        return updatedItem;
      }),

    reorderItem: protectedProcedure
      .input(z.object({ 
        itemId: z.number(), 
        categoryId: z.number(),
        newOrderIndex: z.number(),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Atualizar orderIndex do item
        await database.update(items)
          .set({ orderIndex: input.newOrderIndex })
          .where(eq(items.id, input.itemId));

        return { success: true };
      }),
    
    // Dashboard comparativo
    // Notificações WhatsApp
    checkAndSendNotifications: protectedProcedure
      .input(
        z.object({
          month: z.number(),
          year: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { month, year } = input;
        const allItems = await db.getAllItems();
        const notificationsSent = [];

        for (const item of allItems) {
          // Buscar entries do item no mês
          const entries = await db.getEntriesByItemAndMonth(item.id, month, year);
          
          let totalPlanned = 0;
          let totalActual = 0;
          
          for (const entry of entries) {
            totalPlanned += (entry.plannedValue || 0);
            totalActual += (entry.actualValue || 0);
          }

          // Verificar se ultrapassou 20% da meta
          if (totalPlanned > 0) {
            const threshold = totalPlanned * 1.2; // 120% da meta
            
            if (totalActual > threshold) {
              // Verificar se já foi enviada notificação
              const alreadySent = await db.checkNotificationSent(
                item.id,
                month,
                year,
                'budget_exceeded'
              );

              if (!alreadySent) {
                const category = await db.getCategoryById(item.categoryId);
                const percentExceeded = ((totalActual - totalPlanned) / totalPlanned * 100).toFixed(1);
                
                const message = `🚨 ALERTA DE ORÇAMENTO\n\n` +
                  `Item: ${item.name}\n` +
                  `Categoria: ${category?.name || 'N/A'}\n` +
                  `Meta Planejada: R$ ${(totalPlanned / 100).toFixed(2)}\n` +
                  `Gasto Real: R$ ${(totalActual / 100).toFixed(2)}\n` +
                  `Ultrapassagem: ${percentExceeded}%\n` +
                  `Mês/Ano: ${month}/${year}`;

                // Enviar notificação (usando sistema do Manus)
                try {
                  const { notifyOwner } = await import('./_core/notification');
                  await notifyOwner({
                    title: `Alerta: ${item.name} ultrapassou a meta`,
                    content: message,
                  });

                  // Registrar notificação enviada
                  await db.createNotificationSent({
                    itemId: item.id,
                    month,
                    year,
                    notificationType: 'budget_exceeded',
                    message,
                  });

                  notificationsSent.push({
                    item: item.name,
                    category: category?.name,
                    percentExceeded,
                  });
                } catch (error) {
                  console.error('Erro ao enviar notificação:', error);
                }
              }
            }
          }
        }

        return {
          success: true,
          notificationsSent: notificationsSent.length,
          details: notificationsSent,
        };
      }),

    getNotificationHistory: protectedProcedure.query(async () => {
      const notifications = await db.getNotificationsSent();
      return notifications;
    }),

    // Análise Financeira com IA
    generateAIAnalysis: protectedProcedure
      .input(
        z.object({
          month: z.number(),
          year: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { month, year } = input;
        
        // Coletar dados do mês
        const categories = await db.getAllCategories();
        const items = await db.getAllItems();
        const entries = await db.getEntriesByMonth(ctx.user.id, month, year);
        
        // Calcular totais
        let totalIncome = 0;
        let totalExpense = 0;
        let totalInvestment = 0;
        let totalPlannedIncome = 0;
        let totalPlannedExpense = 0;
        
        const categoryData: Record<string, { planned: number; actual: number; type: string }> = {};
        
        for (const category of categories) {
          const categoryItems = items.filter(i => i.categoryId === category.id);
          let catPlanned = 0;
          let catActual = 0;
          
          for (const item of categoryItems) {
            const itemEntries = entries.filter(e => e.itemId === item.id);
            for (const entry of itemEntries) {
              catPlanned += (entry.plannedValue || 0);
              catActual += (entry.actualValue || 0);
            }
          }
          
          categoryData[category.name] = {
            planned: catPlanned,
            actual: catActual,
            type: category.type,
          };
          
          if (category.type === 'income') {
            totalIncome += catActual;
            totalPlannedIncome += catPlanned;
          } else if (category.type === 'expense') {
            totalExpense += catActual;
            totalPlannedExpense += catPlanned;
          } else if (category.type === 'investment') {
            totalInvestment += catActual;
          }
        }
        
        const balance = totalIncome - totalExpense - totalInvestment;
        
        // Preparar dados para IA
        const financialData = {
          mes: month,
          ano: year,
          receitas: {
            planejado: totalPlannedIncome / 100,
            real: totalIncome / 100,
          },
          despesas: {
            planejado: totalPlannedExpense / 100,
            real: totalExpense / 100,
          },
          investimentos: totalInvestment / 100,
          saldo: balance / 100,
          categorias: Object.entries(categoryData).map(([nome, dados]) => ({
            nome,
            tipo: dados.type,
            planejado: dados.planned / 100,
            real: dados.actual / 100,
            variacao: dados.planned > 0 ? ((dados.actual - dados.planned) / dados.planned * 100).toFixed(1) : 0,
          })),
        };
        
        // Chamar IA para análise
        const { invokeLLM } = await import('./_core/llm');
        
        const prompt = `Você é um consultor financeiro especializado. Analise os dados financeiros abaixo e forneça um parecer detalhado.

DADOS FINANCEIROS - ${month}/${year}:
${JSON.stringify(financialData, null, 2)}

Por favor, forneça:
1. **Resumo Executivo**: Visão geral da saúde financeira
2. **Análise de Receitas**: Avaliação das entradas vs planejado
3. **Análise de Despesas**: Identificação de gastos excessivos ou economias
4. **Análise de Investimentos**: Avaliação da capacidade de poupança
5. **Pontos de Atenção**: Categorias que ultrapassaram o planejado
6. **Recomendações**: Sugestões práticas para melhorar a saúde financeira

Formate a resposta em Markdown com seções claras e bem estruturadas.`;
        
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'Você é um consultor financeiro experiente e didático.' },
            { role: 'user', content: prompt },
          ],
        });
        
        const analysis = response.choices[0]?.message?.content || 'Erro ao gerar análise.';
        
        return {
          success: true,
          analysis,
          data: financialData,
        };
      }),

    getAuditLogs: protectedProcedure
      .input(
        z.object({
          entryId: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        // Por enquanto retorna todos os logs (implementar filtros depois)
        const logs = await db.getAuditLogs();
        return logs;
      }),

    getComparativeData: protectedProcedure
      .input(z.object({
        currentMonth: z.number(),
        currentYear: z.number(),
        monthsToCompare: z.number().default(6),
      }))
      .query(async ({ ctx, input }) => {
        const months = [];
        let month = input.currentMonth;
        let year = input.currentYear;
        
        // Coletar dados dos últimos N meses
        for (let i = 0; i < input.monthsToCompare; i++) {
          const entries = await db.getEntriesByMonth(ctx.user.id, month, year);
          const items = await db.getAllItems();
          
          let income = 0;
          let expense = 0;
          let investment = 0;
          
          for (const entry of entries) {
            const item = items.find((it: any) => it.id === entry.itemId);
            if (!item) continue;
            
            const categories = await db.getAllCategories();
            const category = categories.find((c: any) => c.id === item.categoryId);
            if (!category) continue;
            
            const value = entry.actualValue || 0;
            
            if (category.type === "income") income += value;
            else if (category.type === "expense") expense += value;
            else if (category.type === "investment") investment += value;
          }
          
          months.push({
            month,
            year,
            income,
            expense,
            investment,
            balance: income - expense - investment,
          });
          
          // Mês anterior
          month--;
          if (month < 1) {
            month = 12;
            year--;
          }
        }
        
        // Calcular variações
        const comparisons = [];
        for (let i = 0; i < months.length - 1; i++) {
          const current = months[i];
          const previous = months[i + 1];
          
          comparisons.push({
            month: current.month,
            year: current.year,
            incomeChange: previous.income > 0 ? ((current.income - previous.income) / previous.income) * 100 : 0,
            expenseChange: previous.expense > 0 ? ((current.expense - previous.expense) / previous.expense) * 100 : 0,
            investmentChange: previous.investment > 0 ? ((current.investment - previous.investment) / previous.investment) * 100 : 0,
          });
        }
        
        return {
          months: months.reverse(),
          comparisons: comparisons.reverse(),
        };
      }),

    // Backup automático
    createBackup: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        // Coletar todos os dados financeiros
        const items = await db.getAllItems();
        const categories = await db.getAllCategories();
        
        // Coletar entradas dos últimos 12 meses
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        const entries = [];
        let month = currentMonth;
        let year = currentYear;
        
        for (let i = 0; i < 12; i++) {
          const monthEntries = await db.getEntriesByMonth(ctx.user.id, month, year);
          entries.push(...monthEntries);
          
          month--;
          if (month < 1) {
            month = 12;
            year--;
          }
        }
        
        // Montar objeto de backup
        const backupData = {
          version: '1.0',
          timestamp: new Date().toISOString(),
          userId: ctx.user.id,
          userName: ctx.user.name,
          data: {
            categories,
            items,
            entries,
          },
        };
        
        // Gerar nome do arquivo com timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup-${ctx.user.id}-${timestamp}.json`;
        const fileKey = `backups/${ctx.user.id}/${fileName}`;
        
        // Fazer upload para S3
        const { storagePut } = await import('./storage');
        const backupJson = JSON.stringify(backupData, null, 2);
        const result = await storagePut(fileKey, backupJson, 'application/json');
        
        return {
          success: true,
          fileName,
          fileUrl: result.url,
          timestamp: backupData.timestamp,
          itemsCount: items.length,
          categoriesCount: categories.length,
          entriesCount: entries.length,
        };
      } catch (error: any) {
        console.error('Erro ao criar backup:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao criar backup: ' + error.message,
        });
      }
    }),

    // ========== PUSH NOTIFICATIONS ==========

    /**
     * Get VAPID public key for push notifications setup
     */
    getVapidPublicKey: publicProcedure.query(async () => {
      const { getVapidPublicKey } = await import("./pushService");
      return { publicKey: getVapidPublicKey() };
    }),

    /**
     * Subscribe to push notifications
     */
    subscribeToPush: protectedProcedure
      .input(
        z.object({
          endpoint: z.string(),
          keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
          }),
          userAgent: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { subscribeToPush } = await import("./pushService");
        return subscribeToPush(ctx.user.id, input, input.userAgent);
      }),

    /**
     * Unsubscribe from push notifications
     */
    unsubscribeFromPush: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        const { unsubscribeFromPush } = await import("./pushService");
        const success = await unsubscribeFromPush(input.endpoint);
        return { success };
      }),

    /**
     * Get user's push subscriptions
     */
    getPushSubscriptions: protectedProcedure.query(async ({ ctx }) => {
      const { getUserSubscriptions } = await import("./pushService");
      return getUserSubscriptions(ctx.user.id);
    }),

    /**
     * Send test push notification
     */
    sendTestPush: protectedProcedure.mutation(async ({ ctx }) => {
      const { sendPushToUser } = await import("./pushService");
      const result = await sendPushToUser(
        ctx.user.id,
        {
          title: "🔔 Notificação de Teste",
          body: "As notificações push estão funcionando perfeitamente!",
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          tag: "test-notification",
          data: {
            type: "test",
            url: "/",
          },
        },
        "general"
      );
      return result;
    }),

    /**
     * Get notification history
     */
    getNotificationHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        const { getUserNotifications } = await import("./pushService");
        return getUserNotifications(ctx.user.id, input.limit);
      }),

    /**
     * Mark notification as read
     */
    markNotificationRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        const { markNotificationAsRead } = await import("./pushService");
        const success = await markNotificationAsRead(input.notificationId);
        return { success };
      }),

    // ========== GOALS (METAS) ==========

    /**
     * Create a new financial goal
     */
    createGoal: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          description: z.string().optional(),
          targetAmount: z.number().positive(),
          targetDate: z.date().optional(),
          category: z.enum(["emergency", "travel", "purchase", "education", "retirement", "investment", "debt", "other"]).default("other"),
          priority: z.enum(["low", "medium", "high"]).default("medium"),
          isShared: z.boolean().default(false),
          icon: z.string().max(10).default("🎯"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.createGoal({
          userId: ctx.user.id,
          ...input,
        });
      }),

    /**
     * Get all user goals
     */
    getUserGoals: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserGoals(ctx.user.id);
    }),

    /**
     * Get goal by ID
     */
    getGoalById: protectedProcedure
      .input(z.object({ goalId: z.number() }))
      .query(async ({ input }) => {
        return db.getGoalById(input.goalId);
      }),

    /**
     * Update goal
     */
    updateGoal: protectedProcedure
      .input(
        z.object({
          goalId: z.number(),
          name: z.string().min(1).max(200).optional(),
          description: z.string().optional(),
          targetAmount: z.number().positive().optional(),
          targetDate: z.date().optional(),
          category: z.enum(["emergency", "travel", "purchase", "education", "retirement", "investment", "debt", "other"]).optional(),
          priority: z.enum(["low", "medium", "high"]).optional(),
          isShared: z.boolean().optional(),
          icon: z.string().max(10).optional(),
          status: z.enum(["active", "completed", "paused", "cancelled"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { goalId, ...data } = input;
        return db.updateGoal(goalId, data);
      }),

    /**
     * Delete goal
     */
    deleteGoal: protectedProcedure
      .input(z.object({ goalId: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteGoal(input.goalId);
      }),

    /**
     * Add transaction to goal (deposit/withdrawal)
     */
    addGoalTransaction: protectedProcedure
      .input(
        z.object({
          goalId: z.number(),
          amount: z.number(),
          type: z.enum(["deposit", "withdrawal", "adjustment"]),
          note: z.string().optional(),
          entryId: z.number().optional(),
          transactionDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.addGoalTransaction({
          userId: ctx.user.id,
          ...input,
        });
      }),

    /**
     * Get goal transactions
     */
    getGoalTransactions: protectedProcedure
      .input(z.object({ goalId: z.number() }))
      .query(async ({ input }) => {
        return db.getGoalTransactions(input.goalId);
      }),

    /**
     * Create milestone for a goal
     */
    createMilestone: protectedProcedure
      .input(
        z.object({
          goalId: z.number(),
          name: z.string().min(1).max(200),
          targetAmount: z.number().positive(),
          order: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        return db.createMilestone(input);
      }),

    /**
     * Get milestones for a goal
     */
    getGoalMilestones: protectedProcedure
      .input(z.object({ goalId: z.number() }))
      .query(async ({ input }) => {
        return db.getGoalMilestones(input.goalId);
      }),

    /**
     * Update milestone
     */
    updateMilestone: protectedProcedure
      .input(
        z.object({
          milestoneId: z.number(),
          name: z.string().min(1).max(200).optional(),
          targetAmount: z.number().positive().optional(),
          order: z.number().optional(),
          isCompleted: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { milestoneId, ...data } = input;
        return db.updateMilestone(milestoneId, data);
      }),

    /**
     * Delete milestone
     */
    deleteMilestone: protectedProcedure
      .input(z.object({ milestoneId: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteMilestone(input.milestoneId);
      }),

    /**
     * Get goals statistics and insights
     */
    getGoalsStats: protectedProcedure.query(async ({ ctx }) => {
      const goals = await db.getUserGoals(ctx.user.id);

      const totalGoals = goals.length;
      const activeGoals = goals.filter((g) => g.status === "active").length;
      const completedGoals = goals.filter((g) => g.status === "completed").length;

      const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
      const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
      const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

      // Calculate monthly savings needed for active goals
      const monthlySavingsNeeded = goals
        .filter((g) => g.status === "active" && g.targetDate)
        .reduce((sum, g) => {
          const remaining = g.targetAmount - g.currentAmount;
          if (remaining <= 0 || !g.targetDate) return sum;

          const now = new Date();
          const target = new Date(g.targetDate);
          const monthsRemaining = Math.max(
            1,
            (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
          );

          return sum + remaining / monthsRemaining;
        }, 0);

      return {
        totalGoals,
        activeGoals,
        completedGoals,
        totalTarget,
        totalSaved,
        overallProgress: Math.round(overallProgress * 10) / 10,
        monthlySavingsNeeded: Math.round(monthlySavingsNeeded),
      };
    }),

    // ========== AI INSIGHTS ==========

    /**
     * Generate AI-powered financial insights
     */
    generateFinancialInsights: protectedProcedure.query(async ({ ctx }) => {
      const { generateFinancialInsights } = await import("./aiInsights");
      return generateFinancialInsights(ctx.user.id);
    }),
    
    // Settings
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getUserSettings(ctx.user.id);
      // Provide default settings if none exist. Include budgetMethod default "categories".
      return settings || {
        colorTabs: "#3b82f6",
        colorButtons: "#3b82f6",
        colorText: "#ffffff",
        colorBackground: "#0f172a",
        fontSize: 16,
        fontFamily: "Inter",
        chartType: "pie" as const,
        chartShowLabels: true,
        chartShowValues: true,
        autoBackupEnabled: false,
        autoBackupFrequency: "weekly" as const,
        budgetMethod: "categories" as const,
        twoFactorEnabled: false,
        webAuthnEnabled: false,
      };
    }),
    
    updateSettings: protectedProcedure
      .input(z.object({
        colorTabs: z.string().optional(),
        colorButtons: z.string().optional(),
        colorText: z.string().optional(),
        colorBackground: z.string().optional(),
        fontSize: z.number().optional(),
        fontFamily: z.string().optional(),
        chartType: z.enum(["pie", "bar", "doughnut"]).optional(),
        chartShowLabels: z.boolean().optional(),
        chartShowValues: z.boolean().optional(),
        autoBackupEnabled: z.boolean().optional(),
        autoBackupFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
        // Allow updating the budgeting method. Optional so unchanged settings remain unaffected.
        budgetMethod: z.enum(["categories", "groups", "50-30-20", "envelopes"]).optional(),
        twoFactorEnabled: z.boolean().optional(),
        webAuthnEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertUserSettings(ctx.user.id, input);
      }),
    
    // Copy previous month
    copyPreviousMonthPlanned: protectedProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.copyPreviousMonthPlanned(ctx.user.id, input.month, input.year);
      }),
  }),
  
  // Backup router
  backup: backupRouter,
  
  // Project router
  project: projectRouter,
  
  // Custom Alert router
  customAlert: customAlertRouter,
  
  // Dashboard router
  dashboard: dashboardRouter,
  
  // Currency router
  currency: currencyRouter,
  
  // Open Banking router
  openBanking: openBankingRouter,
  
  // Collaboration router
  collaboration: collaborationRouter,
  
  // Security router
  security: securityRouter,
  
  // Credit Cards & Installments routers (FASE 4.1)
  creditCards: creditCardsRouter,
  installments: installmentsRouter,
  
  // Investments & Loans routers (FASE 4.2)
  investments: investmentsRouter,
  loans: loansRouter,
  
  // Bill Splitting & Recurring routers (FASE 4.3)
  billSplitting: billSplittingRouter,
  recurring: recurringRouter,
  
  // Reports & Analytics routers (FASE 4.4)
  export: exportRouter,
  analytics: analyticsRouter,
  simulation: simulationRouter,
});

export type AppRouter = typeof appRouter;
