import axios from "axios";
import { ENV } from "./_core/env";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
}

/**
 * Credit card transactions are a subset of banking data exposed by the Open Finance
 * network. Each credit card account generates a monthly bill containing many
 * individual transactions. This interface represents a single line item from
 * a credit card bill, including the billed date, description, amount and the
 * underlying merchant category. See Belvo's documentation for details on
 * available fields such as merchant name and MCC code.
 */
export interface CreditCardTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
  cardLastFour?: string;
}

/**
 * Investment transactions reflect buy and sell operations executed on
 * brokerage accounts. They contain details such as instrument identifiers,
 * quantities, gross and net values and the execution date. The Open Finance
 * API exposes these operations via the investment transaction endpoint.
 */
export interface InvestmentTransaction {
  id: string;
  instrument: string;
  quantity: number;
  grossValue: number;
  netValue: number;
  date: string;
  operationType: string;
}

/**
 * Example integration with an open banking provider (e.g. Belvo). This function obtains
 * an access token using the secret ID and password defined in environment variables,
 * then requests transactions for a given link and date range. The exact endpoints and
 * payloads depend on the provider; here we follow the Belvo pattern where you first
 * authenticate at /token, then call /transactions to retrieve data. For additional
 * information, see the provider's documentation. The returned transactions include
 * the date, description and amount, which can be mapped to entries in the budget system.
 */
export async function fetchTransactionsFromBelvo(linkId: string, startDate: string, endDate: string): Promise<Transaction[]> {
  const secretId = ENV.belvoSecretId;
  const secretPassword = ENV.belvoSecretPassword;
  const baseUrl = ENV.belvoApiUrl;
  if (!secretId || !secretPassword) {
    throw new Error("Belvo credentials are not configured. Please set BELVO_SECRET_ID and BELVO_SECRET_PASSWORD in your environment.");
  }
  // Authenticate and get access token
  const authRes = await axios.post(
    `${baseUrl}/api/token/`,
    {},
    {
      auth: {
        username: secretId,
        password: secretPassword,
      },
    }
  );
  const accessToken = authRes.data.access;

  // Fetch transactions for the given linkId and date range
  const txRes = await axios.get(`${baseUrl}/api/transactions/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      link: linkId,
      date_from: startDate,
      date_to: endDate,
    },
  });
  // The response format depends on the provider. For Belvo, the transactions array is
  // contained in the 'results' field. Each transaction includes fields such as 'description',
  // 'amount' and 'created_at'. Map them to a unified format.
  const raw = txRes.data.results ?? txRes.data;
  const transactions: Transaction[] = raw.map((tx: any) => ({
    id: tx.id,
    description: tx.description ?? tx.reference ?? "",
    amount: typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount,
    date: tx.created_at || tx.created_on || tx.date || "",
    category: tx.category || undefined,
  }));
  return transactions;
}

/**
 * Fetch credit card bill transactions for a given link and date range from Belvo's
 * API. Belvo exposes a `/credit_card_bills/` endpoint that returns the bills
 * associated with a link. Each bill contains an array of line items under
 * the `transactions` field. This helper authenticates, requests bills
 * for the provided date range and flattens all line items into a unified
 * list of CreditCardTransaction objects. Note: depending on your Open Finance
 * provider, the exact endpoint and field names may differ.
 */
export async function fetchCreditCardTransactionsFromBelvo(
  linkId: string,
  startDate: string,
  endDate: string
): Promise<CreditCardTransaction[]> {
  const secretId = ENV.belvoSecretId;
  const secretPassword = ENV.belvoSecretPassword;
  const baseUrl = ENV.belvoApiUrl;
  if (!secretId || !secretPassword) {
    throw new Error(
      "Belvo credentials are not configured. Please set BELVO_SECRET_ID and BELVO_SECRET_PASSWORD in your environment."
    );
  }
  // Authenticate to obtain a short‑lived bearer token
  const authRes = await axios.post(
    `${baseUrl}/api/token/`,
    {},
    {
      auth: {
        username: secretId,
        password: secretPassword,
      },
    }
  );
  const accessToken: string = authRes.data.access;
  // Request credit card bills. Belvo returns an array of bills. We filter
  // by date range using `date_from` and `date_to` query parameters. Each bill
  // contains a `transactions` array with the individual purchases.
  const billsRes = await axios.get(`${baseUrl}/api/credit_card_bills/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      link: linkId,
      date_from: startDate,
      date_to: endDate,
    },
  });
  const rawBills = billsRes.data.results ?? billsRes.data;
  const flattened: CreditCardTransaction[] = [];
  rawBills.forEach((bill: any) => {
    const billTransactions = bill.transactions || [];
    billTransactions.forEach((tx: any) => {
      flattened.push({
        id: tx.id || `${bill.id}-${tx.mcc || ''}-${tx.amount}`,
        description: tx.description ?? tx.reference ?? '',
        amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount,
        date: tx.date || bill.date || '',
        category: tx.category ?? tx.mcc ?? undefined,
        cardLastFour: bill.card_last_four || undefined,
      });
    });
  });
  return flattened;
}

/**
 * Fetch investment portfolio positions and transaction details from Belvo. This
 * function returns an array of InvestmentTransaction objects representing the
 * buy and sell operations performed by the user over a date range. Belvo's
 * investment endpoints include `/investments/` for current holdings and
 * `/investment_transactions/` for operations. We only use transactions here
 * because they reflect cash flows; positions can be fetched separately if
 * needed for portfolio reporting.
 */
export async function fetchInvestmentTransactionsFromBelvo(
  linkId: string,
  startDate: string,
  endDate: string
): Promise<InvestmentTransaction[]> {
  const secretId = ENV.belvoSecretId;
  const secretPassword = ENV.belvoSecretPassword;
  const baseUrl = ENV.belvoApiUrl;
  if (!secretId || !secretPassword) {
    throw new Error(
      "Belvo credentials are not configured. Please set BELVO_SECRET_ID and BELVO_SECRET_PASSWORD in your environment."
    );
  }
  const authRes = await axios.post(
    `${baseUrl}/api/token/`,
    {},
    {
      auth: {
        username: secretId,
        password: secretPassword,
      },
    }
  );
  const accessToken: string = authRes.data.access;
  // Retrieve investment transactions for the link within the specified date range
  const invRes = await axios.get(`${baseUrl}/api/investment_transactions/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      link: linkId,
      date_from: startDate,
      date_to: endDate,
    },
  });
  const raw = invRes.data.results ?? invRes.data;
  const transactions: InvestmentTransaction[] = raw.map((tx: any) => ({
    id: tx.id,
    instrument: tx.instrument ?? tx.ticker ?? '',
    quantity: typeof tx.quantity === 'string' ? parseFloat(tx.quantity) : tx.quantity ?? 0,
    grossValue: typeof tx.gross_amount === 'string' ? parseFloat(tx.gross_amount) : tx.gross_amount ?? 0,
    netValue: typeof tx.net_amount === 'string' ? parseFloat(tx.net_amount) : tx.net_amount ?? 0,
    date: tx.date || tx.created_at || '',
    operationType: tx.type ?? tx.operation_type ?? '',
  }));
  return transactions;
}

// ==================== ADVANCED INTEGRATION ====================

import { getDb } from "./db";
import * as schema from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { classifyTransactionAdvanced } from "./aiClassifier";

/**
 * Create or update a bank connection
 */
export async function saveBankConnection(data: {
  userId: number;
  linkId: string;
  institutionName: string;
  institutionCode?: string;
  accountType: string;
  accountHolder?: string;
  lastFour?: string;
}): Promise<{ id: number; success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(schema.bankConnections)
    .where(eq(schema.bankConnections.linkId, data.linkId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.bankConnections)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(schema.bankConnections.id, existing[0].id));
    return { id: existing[0].id, success: true };
  }

  const result = await db.insert(schema.bankConnections).values({
    userId: data.userId,
    linkId: data.linkId,
    institutionName: data.institutionName,
    institutionCode: data.institutionCode,
    accountType: data.accountType as any,
    accountHolder: data.accountHolder,
    lastFour: data.lastFour,
    status: "active",
    autoSync: true,
    syncFrequency: 24,
  });

  return { id: Number(result[0].insertId), success: true };
}

/**
 * Get user's bank connections
 */
export async function getUserBankConnections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(schema.bankConnections)
    .where(eq(schema.bankConnections.userId, userId))
    .orderBy(schema.bankConnections.createdAt);
}

/**
 * Sync transactions from a bank connection
 */
export async function syncBankTransactions(
  userId: number,
  connectionId: number,
  startDate: Date,
  endDate: Date
): Promise<{
  success: boolean;
  batchId: string;
  fetched: number;
  imported: number;
  duplicates: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = Date.now();
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const errors: string[] = [];

  try {
    const connection = await db
      .select()
      .from(schema.bankConnections)
      .where(eq(schema.bankConnections.id, connectionId))
      .limit(1);

    if (connection.length === 0) throw new Error("Connection not found");
    const conn = connection[0];

    let transactions: Transaction[] = [];
    
    if (conn.accountType === "credit_card") {
      const ccTx = await fetchCreditCardTransactionsFromBelvo(
        conn.linkId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );
      transactions = ccTx.map((tx) => ({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        category: tx.category,
      }));
    } else {
      transactions = await fetchTransactionsFromBelvo(
        conn.linkId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0]
      );
    }

    let imported = 0;
    let duplicates = 0;

    for (const tx of transactions) {
      const existing = await db
        .select()
        .from(schema.importedTransactions)
        .where(
          and(
            eq(schema.importedTransactions.userId, userId),
            eq(schema.importedTransactions.externalId, tx.id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        duplicates++;
        continue;
      }

      const amountCents = Math.round(tx.amount * 100);
      let suggestedCategoryId: number | undefined;
      let confidenceScore: number | undefined;

      try {
        const suggestions = await classifyTransactionAdvanced(
          userId,
          tx.description,
          amountCents
        );
        if (suggestions.length > 0) {
          const { getCategoryByName } = await import("./db");
          const category = await getCategoryByName(userId, suggestions[0].categoryName);
          if (category) {
            suggestedCategoryId = category.id;
            confidenceScore = suggestions[0].confidence;
          }
        }
      } catch (error) {
        console.error("AI classification error:", error);
      }

      await db.insert(schema.importedTransactions).values({
        userId,
        connectionId,
        externalId: tx.id,
        description: tx.description,
        amount: amountCents,
        transactionDate: new Date(tx.date),
        bankCategory: tx.category,
        status: "pending",
        suggestedCategoryId,
        confidenceScore,
        batchId,
      });

      imported++;
    }

    await db
      .update(schema.bankConnections)
      .set({ lastSyncAt: new Date(), status: "active", errorMessage: null })
      .where(eq(schema.bankConnections.id, connectionId));

    await db.insert(schema.syncHistory).values({
      userId,
      connectionId,
      batchId,
      startDate,
      endDate,
      transactionsFetched: transactions.length,
      transactionsImported: imported,
      duplicatesSkipped: duplicates,
      status: "success",
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      batchId,
      fetched: transactions.length,
      imported,
      duplicates,
      errors,
    };
  } catch (error: any) {
    await db.insert(schema.syncHistory).values({
      userId,
      connectionId,
      batchId,
      startDate,
      endDate,
      transactionsFetched: 0,
      transactionsImported: 0,
      duplicatesSkipped: 0,
      status: "failed",
      errorMessage: error.message,
      duration: Date.now() - startTime,
    });

    return {
      success: false,
      batchId,
      fetched: 0,
      imported: 0,
      duplicates: 0,
      errors: [error.message],
    };
  }
}

export async function getPendingTransactions(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(schema.importedTransactions)
    .where(
      and(
        eq(schema.importedTransactions.userId, userId),
        eq(schema.importedTransactions.status, "pending")
      )
    )
    .orderBy(schema.importedTransactions.transactionDate)
    .limit(limit);
}

export async function importTransactionToBudget(
  transactionId: number,
  categoryId: number,
  itemId?: number
): Promise<{ success: boolean; entryId?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { upsertEntry, getCategoryById, createItem, learnFromClassification } = await import("./db");

  const txResult = await db
    .select()
    .from(schema.importedTransactions)
    .where(eq(schema.importedTransactions.id, transactionId))
    .limit(1);

  if (txResult.length === 0) throw new Error("Transaction not found");
  const tx = txResult[0];

  const category = await getCategoryById(categoryId);
  if (!category) throw new Error("Category not found");

  let finalItemId = itemId;
  if (!finalItemId) {
    const result = await createItem({
      userId: tx.userId,
      name: tx.description.substring(0, 100),
      categoryId,
    });
    finalItemId = result.id;
  }

  const txDate = new Date(tx.transactionDate);
  const entry = await upsertEntry({
    userId: tx.userId,
    itemId: finalItemId,
    month: txDate.getMonth() + 1,
    year: txDate.getFullYear(),
    person: "ambos",
    plannedValue: 0,
    actualValue: tx.amount,
  });

  await db
    .update(schema.importedTransactions)
    .set({ status: "imported", matchedEntryId: entry.id, processedAt: new Date() })
    .where(eq(schema.importedTransactions.id, transactionId));

  try {
    await learnFromClassification(tx.userId, tx.description, tx.amount, categoryId, "confirmed");
  } catch (error) {
    console.error("Learning error:", error);
  }

  return { success: true, entryId: entry.id };
}

export async function ignoreTransaction(transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(schema.importedTransactions)
    .set({ status: "ignored", processedAt: new Date() })
    .where(eq(schema.importedTransactions.id, transactionId));
  return { success: true };
}

export async function getSyncHistory(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(schema.syncHistory)
    .where(eq(schema.syncHistory.userId, userId))
    .orderBy(schema.syncHistory.syncedAt)
    .limit(limit);
}

export async function disconnectBankConnection(connectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(schema.bankConnections)
    .set({ status: "disconnected", autoSync: false })
    .where(eq(schema.bankConnections.id, connectionId));
  return { success: true };
}