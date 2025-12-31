import { z } from "zod";
import * as db from "./db";
import { getDb } from "./db";
import { classificationHistory, categories } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Advanced AI classifier with continuous learning capabilities.
 *
 * This module implements an intelligent classification system that learns
 * from user behavior. It combines rule-based keywords with machine learning
 * from historical user classifications to provide increasingly accurate
 * suggestions over time.
 */

/**
 * Enhanced keyword mapping with more categories and patterns
 */
const keywordCategories: Record<string, string> = {
  // Alimentação
  "supermercado": "Supermercado",
  "mercado": "Supermercado",
  "grocery": "Supermercado",
  "padaria": "Supermercado",
  "acougue": "Supermercado",
  "hortifruti": "Supermercado",
  "restaurante": "Restaurante",
  "bar": "Restaurante",
  "pizza": "Restaurante",
  "lanchonete": "Restaurante",
  "ifood": "Restaurante",
  "rappi": "Restaurante",
  // Transporte
  "posto": "Transporte",
  "combustivel": "Transporte",
  "uber": "Transporte",
  "99": "Transporte",
  "gasolina": "Transporte",
  "taxi": "Transporte",
  "onibus": "Transporte",
  "metro": "Transporte",
  "estacionamento": "Transporte",
  "pedagio": "Transporte",
  // Moradia
  "aluguel": "Moradia",
  "condominio": "Moradia",
  "energia": "Moradia",
  "luz": "Moradia",
  "agua": "Moradia",
  "gas": "Moradia",
  "internet": "Moradia",
  "telefone": "Moradia",
  // Saúde
  "farmacia": "Saúde",
  "remedio": "Saúde",
  "medico": "Saúde",
  "hospital": "Saúde",
  "clinica": "Saúde",
  "laboratorio": "Saúde",
  "exame": "Saúde",
  "consulta": "Saúde",
  // Lazer
  "cinema": "Lazer",
  "viagem": "Lazer",
  "hotel": "Lazer",
  "passeio": "Lazer",
  "show": "Lazer",
  "teatro": "Lazer",
  "parque": "Lazer",
  // Educação
  "faculdade": "Educação",
  "curso": "Educação",
  "livro": "Educação",
  "escola": "Educação",
  "universidade": "Educação",
  "material escolar": "Educação",
  // Tecnologia
  "streaming": "Tecnologia",
  "netflix": "Tecnologia",
  "spotify": "Tecnologia",
  "amazon": "Tecnologia",
  "apple": "Tecnologia",
  "google": "Tecnologia",
  // Vestuário
  "roupa": "Vestuário",
  "calcado": "Vestuário",
  "sapato": "Vestuário",
  "loja": "Vestuário",
  // Investimento
  "invest": "Investimento",
  "acao": "Investimento",
  "fundo": "Investimento",
  "poupanca": "Investimento",
  "previdencia": "Investimento",
};

/**
 * Learn from user classification and store in history
 */
export async function learnFromClassification(
  userId: number,
  description: string,
  amount: number,
  categoryId: number,
  source: "manual" | "confirmed" = "manual"
): Promise<void> {
  const database = await getDb();
  if (!database) return;

  const normalizedDesc = description.toLowerCase().trim();

  // Check if this exact pattern already exists
  const existing = await database
    .select()
    .from(classificationHistory)
    .where(
      and(
        eq(classificationHistory.userId, userId),
        eq(classificationHistory.description, normalizedDesc),
        eq(classificationHistory.categoryId, categoryId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update: increment confirmations and confidence
    const current = existing[0];
    const newConfidence = Math.min(100, current.confidence + 10); // Max 100
    const newConfirmations = current.confirmations + 1;

    await database
      .update(classificationHistory)
      .set({
        confidence: newConfidence,
        confirmations: newConfirmations,
        updatedAt: new Date(),
      })
      .where(eq(classificationHistory.id, current.id));
  } else {
    // Insert new classification
    await database.insert(classificationHistory).values({
      userId,
      description: normalizedDesc,
      amount,
      categoryId,
      source,
      confidence: source === "confirmed" ? 60 : 50, // Confirmed suggestions get higher initial confidence
      confirmations: 1,
    });
  }
}

/**
 * Find similar transactions in classification history using fuzzy matching
 */
async function findSimilarClassifications(
  userId: number,
  description: string,
  amount: number
): Promise<Array<{ categoryId: number; categoryName: string; confidence: number; score: number }>> {
  const database = await getDb();
  if (!database) return [];

  const normalizedDesc = description.toLowerCase().trim();
  const words = normalizedDesc.split(/\s+/);

  // Get all user's classification history
  const history = await database
    .select()
    .from(classificationHistory)
    .where(eq(classificationHistory.userId, userId))
    .orderBy(desc(classificationHistory.confidence));

  const matches: Map<number, { confidence: number; score: number; categoryName: string }> = new Map();

  for (const record of history) {
    let score = 0;

    // Exact match (highest score)
    if (record.description === normalizedDesc) {
      score = 100;
    } else {
      // Word-based similarity
      const recordWords = record.description.split(/\s+/);
      const commonWords = words.filter(w => recordWords.includes(w));
      const wordScore = (commonWords.length / Math.max(words.length, recordWords.length)) * 80;

      // Amount similarity (within 30% range)
      const amountDiff = Math.abs(amount - record.amount) / Math.max(Math.abs(amount), Math.abs(record.amount));
      const amountScore = amountDiff < 0.3 ? 20 : 0;

      score = wordScore + amountScore;
    }

    // Only consider matches with score > 30
    if (score > 30) {
      const existing = matches.get(record.categoryId);
      if (!existing || score > existing.score) {
        // Get category name
        const category = await db.getCategoryById(record.categoryId);
        if (category) {
          matches.set(record.categoryId, {
            confidence: record.confidence,
            score: Math.round(score),
            categoryName: category.name,
          });
        }
      }
    }
  }

  // Convert to array and sort by combined score (score * confidence)
  return Array.from(matches.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.categoryName,
      confidence: data.confidence,
      score: data.score,
      combinedScore: (data.score * data.confidence) / 100,
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 3); // Top 3 suggestions
}

/**
 * Enhanced classification with machine learning from user history
 * Returns multiple suggestions with confidence scores
 */
export async function classifyTransactionAdvanced(
  userId: number,
  description: string,
  amount: number,
  providedCategory?: string
): Promise<Array<{ categoryName: string; categoryType: "income" | "expense" | "investment"; confidence: number }>> {
  // If user provided category explicitly, return it with 100% confidence
  if (providedCategory && providedCategory.trim().length > 0) {
    const normalized = providedCategory.trim();
    let type: "income" | "expense" | "investment" = amount > 0 ? "income" : "expense";
    if (/invest/i.test(normalized)) type = "investment";
    return [{ categoryName: normalized, categoryType: type, confidence: 100 }];
  }

  const suggestions: Array<{ categoryName: string; categoryType: "income" | "expense" | "investment"; confidence: number }> = [];

  // 1. Check machine learning from user history (highest priority)
  const historicalMatches = await findSimilarClassifications(userId, description, amount);
  for (const match of historicalMatches) {
    const category = await db.getCategoryById(match.categoryId);
    if (category) {
      suggestions.push({
        categoryName: category.name,
        categoryType: category.type,
        confidence: Math.round((match.confidence * match.score) / 100),
      });
    }
  }

  // 2. Check keyword-based rules (medium priority)
  const lowerDesc = description.toLowerCase();
  for (const keyword of Object.keys(keywordCategories)) {
    if (lowerDesc.includes(keyword)) {
      const name = keywordCategories[keyword];
      let type: "income" | "expense" | "investment" = "expense";
      if (/invest/i.test(name)) type = "investment";
      if (amount > 0) type = "income";

      // Check if this suggestion already exists
      const exists = suggestions.find(s => s.categoryName === name);
      if (!exists) {
        suggestions.push({
          categoryName: name,
          categoryType: type,
          confidence: 70, // Keyword-based gets 70% confidence
        });
      }
    }
  }

  // 3. Default fallback (lowest priority)
  if (suggestions.length === 0) {
    if (amount > 0) {
      suggestions.push({ categoryName: "Receita", categoryType: "income", confidence: 50 });
    } else {
      const type: "expense" | "investment" = /invest/i.test(description) ? "investment" : "expense";
      const defaultName = type === "investment" ? "Investimento" : "Despesa";
      suggestions.push({ categoryName: defaultName, categoryType: type, confidence: 50 });
    }
  }

  // Return top 3 suggestions sorted by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Backward compatible wrapper for simple classification
 */
export function classifyTransaction(
  description: string,
  amount: number,
  providedCategory?: string
): { categoryName: string; categoryType: "income" | "expense" | "investment" } {
  // Use keyword-based classification for backward compatibility
  if (providedCategory && providedCategory.trim().length > 0) {
    const normalized = providedCategory.trim();
    let type: "income" | "expense" | "investment" = amount > 0 ? "income" : "expense";
    if (/invest/i.test(normalized)) type = "investment";
    return { categoryName: normalized, categoryType: type };
  }

  const lowerDesc = description.toLowerCase();
  for (const keyword of Object.keys(keywordCategories)) {
    if (lowerDesc.includes(keyword)) {
      const name = keywordCategories[keyword];
      let type: "income" | "expense" | "investment" = "expense";
      if (/invest/i.test(name)) type = "investment";
      if (amount > 0) type = "income";
      return { categoryName: name, categoryType: type };
    }
  }

  if (amount > 0) {
    return { categoryName: "Receita", categoryType: "income" };
  }
  const type: "expense" | "investment" = /invest/i.test(description) ? "investment" : "expense";
  const defaultName = type === "investment" ? "Investimento" : "Despesa";
  return { categoryName: defaultName, categoryType: type };
}

/**
 * Get classification statistics for a user
 */
export async function getClassificationStats(userId: number): Promise<{
  totalClassifications: number;
  highConfidenceCount: number; // confidence >= 80
  topCategories: Array<{ categoryName: string; count: number }>;
}> {
  const database = await getDb();
  if (!database) {
    return { totalClassifications: 0, highConfidenceCount: 0, topCategories: [] };
  }

  const allHistory = await database
    .select()
    .from(classificationHistory)
    .where(eq(classificationHistory.userId, userId));

  const highConfidence = allHistory.filter(h => h.confidence >= 80);

  // Count by category
  const categoryCounts: Map<number, number> = new Map();
  for (const record of allHistory) {
    const current = categoryCounts.get(record.categoryId) || 0;
    categoryCounts.set(record.categoryId, current + record.confirmations);
  }

  // Get top 5 categories
  const topCategoriesData = await Promise.all(
    Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(async ([categoryId, count]) => {
        const category = await db.getCategoryById(categoryId);
        return {
          categoryName: category?.name || "Desconhecida",
          count,
        };
      })
  );

  return {
    totalClassifications: allHistory.length,
    highConfidenceCount: highConfidence.length,
    topCategories: topCategoriesData,
  };
}

/**
 * Detects if a transaction is anomalous based on historical spending
 */
export async function detectAnomaly(
  userId: number,
  categoryId: number,
  amount: number,
  month: number,
  year: number,
  options?: { threshold?: number; minSamples?: number }
): Promise<{ isAnomalous: boolean; average: number }> {
  const threshold = options?.threshold ?? 2;
  const minSamples = options?.minSamples ?? 3;
  const history: number[] = [];
  let m = month;
  let y = year;

  for (let i = 0; i < 6; i++) {
    m--;
    if (m < 1) {
      m = 12;
      y--;
    }
    const entries = await db.getEntriesByMonth(userId, m, y);
    for (const e of entries) {
      try {
        const item = await db.getItemById(e.itemId);
        if (!item) continue;
        const category = await db.getCategoryById(item.categoryId);
        if (!category) continue;
        if (category.id === categoryId && e.actualValue) {
          history.push(Number(e.actualValue));
        }
      } catch {
        continue;
      }
    }
  }

  if (history.length < minSamples) {
    return { isAnomalous: false, average: 0 };
  }

  const avg = history.reduce((acc, val) => acc + val, 0) / history.length;
  return { isAnomalous: amount > avg * threshold, average: avg };
}

/**
 * Forecast cash flow
 */
export async function forecastCashFlow(
  userId: number,
  nMonths: number
): Promise<{ month: number; year: number; predictedBalance: number }[]> {
  const now = new Date();
  const hist: number[] = [];
  let m = now.getMonth() + 1;
  let y = now.getFullYear();

  for (let i = 0; i < nMonths; i++) {
    const entries = await db.getEntriesByMonth(userId, m, y);
    let income = 0;
    let expense = 0;
    for (const e of entries) {
      const item = await db.getItemById(e.itemId);
      if (!item) continue;
      const category = await db.getCategoryById(item.categoryId);
      if (!category) continue;
      if (category.type === "income") income += Number(e.actualValue || 0);
      else if (category.type === "expense" || category.type === "investment")
        expense += Number(e.actualValue || 0);
    }
    hist.push(income - expense);
    m--;
    if (m < 1) {
      m = 12;
      y--;
    }
  }

  if (hist.length === 0) {
    return [];
  }

  const average = hist.reduce((acc, val) => acc + val, 0) / hist.length;
  const forecasts: { month: number; year: number; predictedBalance: number }[] = [];
  let nextMonth = now.getMonth() + 2;
  let nextYear = now.getFullYear();

  for (let i = 0; i < nMonths; i++) {
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    forecasts.push({ month: nextMonth, year: nextYear, predictedBalance: Math.round(average) });
    nextMonth++;
  }

  return forecasts;
}

/**
 * Generate recommendations
 */
export async function generateRecommendations(userId: number): Promise<string[]> {
  const recommendations: string[] = [];
  const now = new Date();
  const monthsToCheck = 3;
  const categoryTotals: Record<number, { total: number; count: number }> = {};
  let m = now.getMonth() + 1;
  let y = now.getFullYear();

  for (let i = 0; i < monthsToCheck; i++) {
    const entries = await db.getEntriesByMonth(userId, m, y);
    for (const e of entries) {
      try {
        const item = await db.getItemById(e.itemId);
        if (!item) continue;
        const category = await db.getCategoryById(item.categoryId);
        if (!category) continue;
        const catId = category.id;
        if (!categoryTotals[catId]) {
          categoryTotals[catId] = { total: 0, count: 0 };
        }
        categoryTotals[catId].total += Number(e.actualValue || 0);
        categoryTotals[catId].count += 1;
      } catch {
        continue;
      }
    }
    m--;
    if (m < 1) {
      m = 12;
      y--;
    }
  }

  const averages: Record<number, number> = {};
  for (const catId of Object.keys(categoryTotals)) {
    const { total, count } = categoryTotals[Number(catId)];
    if (count > 0) {
      averages[Number(catId)] = total / count;
    }
  }

  const entriesLatest = await db.getEntriesByMonth(userId, now.getMonth() + 1, now.getFullYear());
  for (const e of entriesLatest) {
    try {
      const item = await db.getItemById(e.itemId);
      if (!item) continue;
      const category = await db.getCategoryById(item.categoryId);
      if (!category) continue;
      const catId = category.id;
      const avg = averages[catId] ?? 0;
      const amount = Number(e.actualValue || 0);
      if (avg > 0 && amount > 2 * avg) {
        const catName = category.name || "Categoria";
        recommendations.push(
          `O gasto em "${catName}" neste mês (R$ ${(amount / 100).toFixed(2)}) excede o dobro da média histórica. Considere revisar esta categoria.`
        );
      }
    } catch {
      continue;
    }
  }

  const forecast = await forecastCashFlow(userId, 3);
  if (forecast.length > 0 && forecast[0].predictedBalance < 0) {
    recommendations.push(
      `Prevemos que o saldo do próximo mês pode ficar negativo (R$ ${(forecast[0].predictedBalance / 100).toFixed(2)}). Considere reduzir gastos ou aumentar receitas.`
    );
  }

  return recommendations;
}

// Zod schemas
export const classifyInputSchema = z.object({
  description: z.string(),
  amount: z.number(),
  category: z.string().optional(),
});

export const classifyOutputSchema = z.object({
  categoryName: z.string(),
  categoryType: z.enum(["income", "expense", "investment"]),
});

export const classifyAdvancedOutputSchema = z.array(
  z.object({
    categoryName: z.string(),
    categoryType: z.enum(["income", "expense", "investment"]),
    confidence: z.number().min(0).max(100),
  })
);

export const forecastInputSchema = z.object({ months: z.number().min(1).max(12).default(3) });
export const forecastOutputSchema = z.array(
  z.object({ month: z.number(), year: z.number(), predictedBalance: z.number() })
);

export const recommendationsOutputSchema = z.array(z.string());