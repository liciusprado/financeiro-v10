import { getDb } from "./db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { callLLM } from "./_core/llm";

/**
 * AI-Powered Financial Insights Service
 * 
 * Generates personalized financial insights using LLM analysis
 * of user's spending patterns, savings rate, and budget adherence.
 */

export interface FinancialInsight {
  id: string;
  type: "alert" | "achievement" | "suggestion" | "trend" | "comparison";
  category: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "success" | "danger";
  impact: "low" | "medium" | "high";
  actionable: boolean;
  action?: string;
  data?: Record<string, any>;
  createdAt: Date;
}

/**
 * Calculate financial metrics for a user
 */
async function calculateUserMetrics(userId: number, months: number = 3) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Get last N months data
  const monthsData = [];
  for (let i = 0; i < months; i++) {
    let month = currentMonth - i;
    let year = currentYear;
    if (month < 1) {
      month += 12;
      year -= 1;
    }

    const entries = await db
      .select()
      .from(schema.entries)
      .where(
        and(
          eq(schema.entries.userId, userId),
          eq(schema.entries.month, month),
          eq(schema.entries.year, year)
        )
      );

    const items = await db
      .select()
      .from(schema.items)
      .where(eq(schema.items.userId, userId));

    const categories = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.userId, userId));

    // Calculate totals by category
    const categoryTotals: Record<string, { planned: number; actual: number; name: string; type: string }> = {};

    for (const entry of entries) {
      const item = items.find((i) => i.id === entry.itemId);
      if (!item) continue;

      const category = categories.find((c) => c.id === item.categoryId);
      if (!category) continue;

      const key = `${category.id}-${category.name}`;
      if (!categoryTotals[key]) {
        categoryTotals[key] = {
          planned: 0,
          actual: 0,
          name: category.name,
          type: category.type,
        };
      }

      categoryTotals[key].planned += entry.plannedValue || 0;
      categoryTotals[key].actual += entry.actualValue || 0;
    }

    monthsData.push({
      month,
      year,
      entries: entries.length,
      categoryTotals,
    });
  }

  return monthsData;
}

/**
 * Analyze spending patterns
 */
async function analyzeSpendingPatterns(userId: number): Promise<FinancialInsight[]> {
  const insights: FinancialInsight[] = [];
  const monthsData = await calculateUserMetrics(userId, 3);

  if (monthsData.length < 2) return insights;

  const current = monthsData[0];
  const previous = monthsData[1];

  // Compare categories month-over-month
  for (const [key, currentData] of Object.entries(current.categoryTotals)) {
    const previousData = previous.categoryTotals[key];
    if (!previousData) continue;

    const currentSpent = currentData.actual;
    const previousSpent = previousData.actual;

    if (currentSpent === 0 && previousSpent === 0) continue;

    const change = ((currentSpent - previousSpent) / (previousSpent || 1)) * 100;

    // Alert: Significant increase
    if (change > 25 && currentSpent > 5000) {
      insights.push({
        id: `spending-increase-${key}`,
        type: "alert",
        category: currentData.name,
        title: "Gasto Aumentou Significativamente",
        message: `Você gastou ${Math.abs(Math.round(change))}% a mais em ${currentData.name} este mês (${formatCurrency(currentSpent)} vs ${formatCurrency(previousSpent)})`,
        severity: "warning",
        impact: "high",
        actionable: true,
        action: "review_spending",
        data: {
          category: currentData.name,
          currentMonth: currentSpent,
          previousMonth: previousSpent,
          changePercent: Math.round(change),
        },
        createdAt: new Date(),
      });
    }

    // Achievement: Significant decrease
    if (change < -20 && previousSpent > 5000) {
      insights.push({
        id: `spending-decrease-${key}`,
        type: "achievement",
        category: currentData.name,
        title: "Parabéns! Economia em Alta",
        message: `Você reduziu seus gastos em ${currentData.name} em ${Math.abs(Math.round(change))}%! Economizou ${formatCurrency(previousSpent - currentSpent)}`,
        severity: "success",
        impact: "medium",
        actionable: false,
        data: {
          category: currentData.name,
          savedAmount: previousSpent - currentSpent,
          changePercent: Math.abs(Math.round(change)),
        },
        createdAt: new Date(),
      });
    }

    // Alert: Budget exceeded
    if (currentData.actual > currentData.planned && currentData.planned > 0) {
      const overBudget = ((currentData.actual - currentData.planned) / currentData.planned) * 100;
      if (overBudget > 15) {
        insights.push({
          id: `budget-exceeded-${key}`,
          type: "alert",
          category: currentData.name,
          title: "Orçamento Ultrapassado",
          message: `${currentData.name}: gastou ${formatCurrency(currentData.actual)} de ${formatCurrency(currentData.planned)} planejado (+${Math.round(overBudget)}%)`,
          severity: "danger",
          impact: "high",
          actionable: true,
          action: "adjust_budget",
          data: {
            category: currentData.name,
            planned: currentData.planned,
            actual: currentData.actual,
            overPercent: Math.round(overBudget),
          },
          createdAt: new Date(),
        });
      }
    }
  }

  return insights;
}

/**
 * Calculate savings rate
 */
async function analyzeSavingsRate(userId: number): Promise<FinancialInsight[]> {
  const insights: FinancialInsight[] = [];
  const monthsData = await calculateUserMetrics(userId, 3);

  if (monthsData.length < 2) return insights;

  const calculateRate = (data: any) => {
    let income = 0;
    let expenses = 0;

    for (const [, categoryData] of Object.entries(data.categoryTotals) as any) {
      if (categoryData.type === "income") {
        income += categoryData.actual;
      } else if (categoryData.type === "expense") {
        expenses += categoryData.actual;
      }
    }

    const savings = income - expenses;
    const rate = income > 0 ? (savings / income) * 100 : 0;

    return { income, expenses, savings, rate };
  };

  const current = calculateRate(monthsData[0]);
  const previous = calculateRate(monthsData[1]);

  // Achievement: Savings rate improved
  if (current.rate > previous.rate && current.rate > 10) {
    insights.push({
      id: "savings-rate-improved",
      type: "achievement",
      category: "Poupança",
      title: "Taxa de Poupança Aumentou!",
      message: `Parabéns! Sua taxa de poupança aumentou de ${Math.round(previous.rate)}% para ${Math.round(current.rate)}%`,
      severity: "success",
      impact: "high",
      actionable: false,
      data: {
        previousRate: Math.round(previous.rate),
        currentRate: Math.round(current.rate),
        improvement: Math.round(current.rate - previous.rate),
      },
      createdAt: new Date(),
    });
  }

  // Alert: Negative savings
  if (current.savings < 0) {
    insights.push({
      id: "negative-savings",
      type: "alert",
      category: "Poupança",
      title: "Atenção: Gastando Mais que Ganha",
      message: `Você gastou ${formatCurrency(Math.abs(current.savings))} a mais do que ganhou este mês`,
      severity: "danger",
      impact: "high",
      actionable: true,
      action: "reduce_expenses",
      data: {
        income: current.income,
        expenses: current.expenses,
        deficit: Math.abs(current.savings),
      },
      createdAt: new Date(),
    });
  }

  // Suggestion: Low savings rate
  if (current.rate < 10 && current.rate > 0 && current.income > 0) {
    insights.push({
      id: "low-savings-rate",
      type: "suggestion",
      category: "Poupança",
      title: "Sugestão: Aumente sua Taxa de Poupança",
      message: `Sua taxa de poupança está em ${Math.round(current.rate)}%. Especialistas recomendam pelo menos 20%. Tente aumentar em pequenos passos!`,
      severity: "info",
      impact: "medium",
      actionable: true,
      action: "increase_savings",
      data: {
        currentRate: Math.round(current.rate),
        targetRate: 20,
        gap: 20 - Math.round(current.rate),
      },
      createdAt: new Date(),
    });
  }

  return insights;
}

/**
 * Detect trends and predictions
 */
async function analyzeTrends(userId: number): Promise<FinancialInsight[]> {
  const insights: FinancialInsight[] = [];
  const monthsData = await calculateUserMetrics(userId, 6);

  if (monthsData.length < 3) return insights;

  // Calculate average monthly savings
  const monthlySavings = monthsData.map((month) => {
    let income = 0;
    let expenses = 0;

    for (const [, categoryData] of Object.entries(month.categoryTotals) as any) {
      if (categoryData.type === "income") {
        income += categoryData.actual;
      } else if (categoryData.type === "expense") {
        expenses += categoryData.actual;
      }
    }

    return income - expenses;
  });

  const avgMonthlySavings = monthlySavings.reduce((a, b) => a + b, 0) / monthlySavings.length;

  // Prediction: Future savings
  if (avgMonthlySavings > 0) {
    const in6Months = avgMonthlySavings * 6;
    const in12Months = avgMonthlySavings * 12;

    insights.push({
      id: "savings-prediction",
      type: "trend",
      category: "Tendência",
      title: "Projeção de Economia",
      message: `No ritmo atual, você terá economizado ${formatCurrency(in6Months)} em 6 meses e ${formatCurrency(in12Months)} em 1 ano`,
      severity: "info",
      impact: "medium",
      actionable: false,
      data: {
        avgMonthlySavings,
        in6Months,
        in12Months,
      },
      createdAt: new Date(),
    });
  }

  return insights;
}

/**
 * Generate cost-saving suggestions
 */
async function generateSuggestions(userId: number): Promise<FinancialInsight[]> {
  const insights: FinancialInsight[] = [];
  const monthsData = await calculateUserMetrics(userId, 1);

  if (monthsData.length === 0) return insights;

  const current = monthsData[0];

  // Analyze recurring expenses
  for (const [key, data] of Object.entries(current.categoryTotals)) {
    const monthlySpend = data.actual;

    // Subscription services suggestion
    if (
      (data.name.toLowerCase().includes("netflix") ||
        data.name.toLowerCase().includes("streaming") ||
        data.name.toLowerCase().includes("assinatura")) &&
      monthlySpend > 0
    ) {
      const yearlyImpact = monthlySpend * 12;
      insights.push({
        id: `subscription-suggestion-${key}`,
        type: "suggestion",
        category: data.name,
        title: "Oportunidade de Economia",
        message: `Cancelar ${data.name} economiza ${formatCurrency(yearlyImpact)}/ano. Considere compartilhar plano familiar!`,
        severity: "info",
        impact: "low",
        actionable: true,
        action: "review_subscription",
        data: {
          category: data.name,
          monthlyAmount: monthlySpend,
          yearlyImpact,
        },
        createdAt: new Date(),
      });
    }

    // Transportation high spending
    if (
      (data.name.toLowerCase().includes("transporte") ||
        data.name.toLowerCase().includes("uber") ||
        data.name.toLowerCase().includes("combustível")) &&
      monthlySpend > 50000
    ) {
      insights.push({
        id: `transport-suggestion-${key}`,
        type: "suggestion",
        category: data.name,
        title: "Gasto Alto com Transporte",
        message: `Você gasta ${formatCurrency(monthlySpend)}/mês com ${data.name}. Considere transporte público ou carona compartilhada para economizar!`,
        severity: "info",
        impact: "medium",
        actionable: true,
        action: "optimize_transport",
        data: {
          category: data.name,
          monthlyAmount: monthlySpend,
        },
        createdAt: new Date(),
      });
    }
  }

  return insights;
}

/**
 * Use LLM to generate personalized insights
 */
async function generateLLMInsights(userId: number): Promise<FinancialInsight[]> {
  const insights: FinancialInsight[] = [];

  try {
    const monthsData = await calculateUserMetrics(userId, 3);
    if (monthsData.length === 0) return insights;

    // Prepare data summary for LLM
    const dataSummary = {
      recentMonths: monthsData.map((m) => ({
        month: m.month,
        year: m.year,
        categories: Object.entries(m.categoryTotals).map(([, data]) => ({
          name: data.name,
          type: data.type,
          planned: data.planned,
          actual: data.actual,
        })),
      })),
    };

    const prompt = `Analise os seguintes dados financeiros de um usuário dos últimos 3 meses e gere insights personalizados:

${JSON.stringify(dataSummary, null, 2)}

Gere 2-3 insights relevantes e acionáveis sobre:
1. Padrões de gastos preocupantes
2. Oportunidades de economia
3. Tendências positivas a celebrar

Formato de resposta (JSON array):
[
  {
    "title": "Título curto",
    "message": "Mensagem detalhada e personalizada",
    "type": "alert|achievement|suggestion",
    "category": "Nome da categoria relevante",
    "actionable": true|false
  }
]

Importante:
- Use valores em Reais (R$)
- Seja específico e use números concretos
- Mantenha tom positivo e encorajador
- Foque no que é mais relevante financeiramente`;

    const response = await callLLM([{ role: "user", content: prompt }], {
      temperature: 0.7,
      max_tokens: 1000,
    });

    let llmInsights: any[] = [];
    try {
      // Try to parse JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        llmInsights = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
    }

    // Convert LLM insights to our format
    for (let i = 0; i < llmInsights.length; i++) {
      const llmInsight = llmInsights[i];
      insights.push({
        id: `llm-insight-${i}`,
        type: llmInsight.type as any,
        category: llmInsight.category || "Geral",
        title: llmInsight.title,
        message: llmInsight.message,
        severity: llmInsight.type === "achievement" ? "success" : llmInsight.type === "alert" ? "warning" : "info",
        impact: "medium",
        actionable: llmInsight.actionable || false,
        createdAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error generating LLM insights:", error);
  }

  return insights;
}

/**
 * Main function to generate all insights
 */
export async function generateFinancialInsights(userId: number): Promise<FinancialInsight[]> {
  const allInsights: FinancialInsight[] = [];

  try {
    // Rule-based insights
    const spendingInsights = await analyzeSpendingPatterns(userId);
    const savingsInsights = await analyzeSavingsRate(userId);
    const trendInsights = await analyzeTrends(userId);
    const suggestionInsights = await generateSuggestions(userId);

    allInsights.push(...spendingInsights);
    allInsights.push(...savingsInsights);
    allInsights.push(...trendInsights);
    allInsights.push(...suggestionInsights);

    // LLM-powered insights
    const llmInsights = await generateLLMInsights(userId);
    allInsights.push(...llmInsights);

    // Sort by impact and severity
    allInsights.sort((a, b) => {
      const impactScore = { high: 3, medium: 2, low: 1 };
      const severityScore = { danger: 4, warning: 3, success: 2, info: 1 };

      const scoreA = impactScore[a.impact] + severityScore[a.severity];
      const scoreB = impactScore[b.impact] + severityScore[b.severity];

      return scoreB - scoreA;
    });

    // Limit to top 10 insights
    return allInsights.slice(0, 10);
  } catch (error) {
    console.error("Error generating insights:", error);
    return [];
  }
}

/**
 * Helper function to format currency
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/**
 * Save insights to database (optional - for caching)
 */
export async function saveInsights(userId: number, insights: FinancialInsight[]) {
  const db = await getDb();
  if (!db) return;

  // Implementation depends on if you want to cache insights in DB
  // For now, we generate them on-demand
}

/**
 * Get cached insights (if implemented)
 */
export async function getCachedInsights(userId: number): Promise<FinancialInsight[] | null> {
  // Return null to always generate fresh insights
  // Can implement caching later if needed
  return null;
}
