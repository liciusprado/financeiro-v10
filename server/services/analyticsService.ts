/**
 * Analytics Service
 * Análise de tendências e insights com ML básico
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { format, subMonths, startOfMonth, endOfMonth, differenceInMonths } from 'date-fns';

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  prediction: number;
  confidence: number;
}

/**
 * Analisar tendência de gastos
 */
export async function analyzeSpendingTrend(
  userId: number,
  months: number = 6
): Promise<TrendAnalysis> {
  const monthsData: number[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const result = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'expense'
        AND date >= ${format(start, 'yyyy-MM-dd')}
        AND date <= ${format(end, 'yyyy-MM-dd')}
        AND deleted_at IS NULL
    `);

    monthsData.push(result.rows[0].total);
  }

  return analyzeTrend(monthsData);
}

/**
 * Analisar tendência de receitas
 */
export async function analyzeIncomeTrend(
  userId: number,
  months: number = 6
): Promise<TrendAnalysis> {
  const monthsData: number[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const result = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'income'
        AND date >= ${format(start, 'yyyy-MM-dd')}
        AND date <= ${format(end, 'yyyy-MM-dd')}
        AND deleted_at IS NULL
    `);

    monthsData.push(result.rows[0].total);
  }

  return analyzeTrend(monthsData);
}

/**
 * Analisar tendência geral (regressão linear simples)
 */
function analyzeTrend(data: number[]): TrendAnalysis {
  if (data.length < 2) {
    return {
      direction: 'stable',
      percentage: 0,
      prediction: data[0] || 0,
      confidence: 0,
    };
  }

  // Calcular regressão linear: y = a + bx
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = data;

  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Prever próximo valor
  const prediction = intercept + slope * n;

  // Calcular R² (coeficiente de determinação)
  const yMean = sumY / n;
  const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
  const ssResidual = y.reduce((sum, val, i) => {
    const predicted = intercept + slope * i;
    return sum + Math.pow(val - predicted, 2);
  }, 0);
  const r2 = 1 - ssResidual / ssTotal;

  // Calcular variação percentual
  const first = data[0];
  const last = data[data.length - 1];
  const percentage = first > 0 ? ((last - first) / first) * 100 : 0;

  // Determinar direção
  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(percentage) > 5) {
    direction = percentage > 0 ? 'up' : 'down';
  }

  return {
    direction,
    percentage: Math.round(percentage * 100) / 100,
    prediction: Math.max(0, Math.round(prediction * 100) / 100),
    confidence: Math.max(0, Math.min(1, r2)),
  };
}

/**
 * Identificar categorias problemáticas
 */
export async function identifyProblemCategories(
  userId: number
): Promise<Array<{
  category: string;
  currentMonth: number;
  average: number;
  percentageIncrease: number;
  severity: 'high' | 'medium' | 'low';
}>> {
  // Gasto atual (mês corrente)
  const currentMonth = new Date();
  const currentStart = startOfMonth(currentMonth);
  const currentEnd = endOfMonth(currentMonth);

  const currentResult = await db.execute(sql`
    SELECT 
      category,
      SUM(amount) as total
    FROM transactions
    WHERE user_id = ${userId}
      AND type = 'expense'
      AND date >= ${format(currentStart, 'yyyy-MM-dd')}
      AND date <= ${format(currentEnd, 'yyyy-MM-dd')}
      AND deleted_at IS NULL
    GROUP BY category
  `);

  // Média dos últimos 6 meses
  const sixMonthsAgo = subMonths(currentMonth, 6);

  const averageResult = await db.execute(sql`
    SELECT 
      category,
      AVG(monthly_total) as average
    FROM (
      SELECT 
        category,
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(amount) as monthly_total
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'expense'
        AND date >= ${format(sixMonthsAgo, 'yyyy-MM-dd')}
        AND date < ${format(currentStart, 'yyyy-MM-dd')}
        AND deleted_at IS NULL
      GROUP BY category, month
    ) as monthly_totals
    GROUP BY category
  `);

  // Criar mapa de médias
  const averages = new Map();
  averageResult.rows.forEach((row: any) => {
    averages.set(row.category, row.average);
  });

  // Identificar problemas
  const problems: any[] = [];

  currentResult.rows.forEach((row: any) => {
    const category = row.category || 'Sem Categoria';
    const current = row.total;
    const average = averages.get(row.category) || current;

    if (average === 0) return;

    const percentageIncrease = ((current - average) / average) * 100;

    if (percentageIncrease > 20) {
      let severity: 'high' | 'medium' | 'low' = 'low';
      if (percentageIncrease > 50) severity = 'high';
      else if (percentageIncrease > 30) severity = 'medium';

      problems.push({
        category,
        currentMonth: current,
        average,
        percentageIncrease: Math.round(percentageIncrease * 100) / 100,
        severity,
      });
    }
  });

  return problems.sort((a, b) => b.percentageIncrease - a.percentageIncrease);
}

/**
 * Prever gastos do próximo mês
 */
export async function predictNextMonthExpenses(
  userId: number
): Promise<{
  total: number;
  byCategory: Array<{
    category: string;
    predicted: number;
    confidence: number;
  }>;
  confidence: number;
}> {
  // Buscar últimos 6 meses por categoria
  const sixMonthsAgo = subMonths(new Date(), 6);

  const result = await db.execute(sql`
    SELECT 
      category,
      DATE_FORMAT(date, '%Y-%m') as month,
      SUM(amount) as total
    FROM transactions
    WHERE user_id = ${userId}
      AND type = 'expense'
      AND date >= ${format(sixMonthsAgo, 'yyyy-MM-dd')}
      AND deleted_at IS NULL
    GROUP BY category, month
    ORDER BY category, month
  `);

  // Agrupar por categoria
  const byCategory = new Map<string, number[]>();

  result.rows.forEach((row: any) => {
    const category = row.category || 'Sem Categoria';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(row.total);
  });

  // Prever cada categoria
  const predictions: any[] = [];
  let totalPrediction = 0;
  let totalConfidence = 0;

  byCategory.forEach((values, category) => {
    const trend = analyzeTrend(values);
    predictions.push({
      category,
      predicted: trend.prediction,
      confidence: trend.confidence,
    });
    totalPrediction += trend.prediction;
    totalConfidence += trend.confidence;
  });

  return {
    total: Math.round(totalPrediction * 100) / 100,
    byCategory: predictions.sort((a, b) => b.predicted - a.predicted),
    confidence: predictions.length > 0 ? totalConfidence / predictions.length : 0,
  };
}

/**
 * Análise de padrões sazonais
 */
export async function analyzeSeasonalPatterns(
  userId: number
): Promise<Array<{
  month: number;
  monthName: string;
  averageExpense: number;
  pattern: 'high' | 'normal' | 'low';
}>> {
  const result = await db.execute(sql`
    SELECT 
      MONTH(date) as month,
      AVG(monthly_total) as average
    FROM (
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month_year,
        date,
        SUM(amount) as monthly_total
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'expense'
        AND deleted_at IS NULL
      GROUP BY month_year
    ) as monthly_data
    GROUP BY MONTH(date)
    ORDER BY month
  `);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  // Calcular média geral
  const overallAverage = result.rows.reduce(
    (sum: number, row: any) => sum + row.average,
    0
  ) / result.rows.length;

  const threshold = overallAverage * 0.15;

  return result.rows.map((row: any) => ({
    month: row.month,
    monthName: monthNames[row.month - 1],
    averageExpense: Math.round(row.average * 100) / 100,
    pattern:
      row.average > overallAverage + threshold
        ? 'high'
        : row.average < overallAverage - threshold
        ? 'low'
        : 'normal',
  }));
}

/**
 * Identificar oportunidades de economia
 */
export async function identifySavingsOpportunities(
  userId: number
): Promise<Array<{
  category: string;
  currentSpending: number;
  benchmark: number;
  potentialSavings: number;
  recommendation: string;
}>> {
  // Benchmarks (valores médios ideais por categoria)
  const benchmarks = {
    'Alimentação': 0.15, // 15% da renda
    'Transporte': 0.10,
    'Moradia': 0.30,
    'Lazer': 0.05,
    'Educação': 0.05,
    'Saúde': 0.10,
  };

  // Buscar renda mensal média
  const incomeResult = await db.execute(sql`
    SELECT AVG(total) as avg_income
    FROM (
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'income'
        AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
        AND deleted_at IS NULL
      GROUP BY month
    ) as monthly_income
  `);

  const avgIncome = incomeResult.rows[0]?.avg_income || 0;

  // Buscar gastos por categoria
  const expenseResult = await db.execute(sql`
    SELECT 
      category,
      AVG(total) as avg_expense
    FROM (
      SELECT 
        category,
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'expense'
        AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
        AND deleted_at IS NULL
      GROUP BY category, month
    ) as monthly_expenses
    GROUP BY category
  `);

  const opportunities: any[] = [];

  expenseResult.rows.forEach((row: any) => {
    const category = row.category;
    const currentSpending = row.avg_expense;
    const benchmarkPercent = benchmarks[category as keyof typeof benchmarks];

    if (benchmarkPercent && avgIncome > 0) {
      const benchmark = avgIncome * benchmarkPercent;
      const currentPercent = (currentSpending / avgIncome) * 100;
      const benchmarkPercentDisplay = benchmarkPercent * 100;

      if (currentSpending > benchmark * 1.2) {
        // 20% acima do benchmark
        opportunities.push({
          category,
          currentSpending: Math.round(currentSpending * 100) / 100,
          benchmark: Math.round(benchmark * 100) / 100,
          potentialSavings: Math.round((currentSpending - benchmark) * 100) / 100,
          recommendation: `Você está gastando ${currentPercent.toFixed(1)}% da sua renda com ${category}. O recomendado é cerca de ${benchmarkPercentDisplay}%. Considere reduzir em R$ ${((currentSpending - benchmark).toFixed(2))}.`,
        });
      }
    }
  });

  return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
}

/**
 * Score de saúde financeira
 */
export async function calculateFinancialHealthScore(
  userId: number
): Promise<{
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    status: 'good' | 'warning' | 'critical';
  }>;
  recommendations: string[];
}> {
  // Fator 1: Taxa de poupança (peso 30%)
  const savingsResult = await db.execute(sql`
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE user_id = ${userId}
      AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 3 MONTH)
      AND deleted_at IS NULL
  `);

  const income = savingsResult.rows[0]?.income || 0;
  const expense = savingsResult.rows[0]?.expense || 0;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const savingsScore = Math.min(100, savingsRate * 5); // 20% = 100 pontos

  // Fator 2: Diversificação de receitas (peso 20%)
  const incomeSourcesResult = await db.execute(sql`
    SELECT COUNT(DISTINCT category) as sources
    FROM transactions
    WHERE user_id = ${userId}
      AND type = 'income'
      AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
      AND deleted_at IS NULL
  `);

  const incomeSources = incomeSourcesResult.rows[0]?.sources || 1;
  const diversificationScore = Math.min(100, incomeSources * 33);

  // Fator 3: Controle de dívidas (peso 25%)
  const debtResult = await db.execute(sql`
    SELECT COALESCE(SUM(outstanding_balance), 0) as total_debt
    FROM loans
    WHERE user_id = ${userId}
      AND status = 'active'
  `);

  const totalDebt = debtResult.rows[0]?.total_debt || 0;
  const debtRatio = income > 0 ? (totalDebt / income) * 100 : 0;
  const debtScore = Math.max(0, 100 - debtRatio);

  // Fator 4: Fundo de emergência (peso 25%)
  // Buscar saldo em contas de poupança/investimentos
  const emergencyFundResult = await db.execute(sql`
    SELECT COALESCE(SUM(current_value), 0) as emergency_fund
    FROM investments
    WHERE user_id = ${userId}
      AND liquidity = 'daily'
  `);

  const emergencyFund = emergencyFundResult.rows[0]?.emergency_fund || 0;
  const monthlyExpense = expense / 3; // Média mensal dos últimos 3 meses
  const emergencyMonths = monthlyExpense > 0 ? emergencyFund / monthlyExpense : 0;
  const emergencyScore = Math.min(100, (emergencyMonths / 6) * 100); // 6 meses = 100 pontos

  // Calcular score final
  const factors = [
    {
      name: 'Taxa de Poupança',
      score: Math.round(savingsScore),
      weight: 0.30,
      status: savingsScore >= 70 ? 'good' : savingsScore >= 40 ? 'warning' : 'critical',
    },
    {
      name: 'Diversificação de Receitas',
      score: Math.round(diversificationScore),
      weight: 0.20,
      status: diversificationScore >= 70 ? 'good' : diversificationScore >= 40 ? 'warning' : 'critical',
    },
    {
      name: 'Controle de Dívidas',
      score: Math.round(debtScore),
      weight: 0.25,
      status: debtScore >= 70 ? 'good' : debtScore >= 40 ? 'warning' : 'critical',
    },
    {
      name: 'Fundo de Emergência',
      score: Math.round(emergencyScore),
      weight: 0.25,
      status: emergencyScore >= 70 ? 'good' : emergencyScore >= 40 ? 'warning' : 'critical',
    },
  ];

  const finalScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (finalScore >= 90) grade = 'A';
  else if (finalScore >= 80) grade = 'B';
  else if (finalScore >= 70) grade = 'C';
  else if (finalScore >= 60) grade = 'D';
  else grade = 'F';

  // Gerar recomendações
  const recommendations: string[] = [];
  if (savingsScore < 70) {
    recommendations.push('Aumente sua taxa de poupança para pelo menos 20% da renda');
  }
  if (diversificationScore < 70) {
    recommendations.push('Considere diversificar suas fontes de renda');
  }
  if (debtScore < 70) {
    recommendations.push('Trabalhe para reduzir suas dívidas');
  }
  if (emergencyScore < 70) {
    recommendations.push('Construa um fundo de emergência de 6 meses de despesas');
  }

  return {
    score: finalScore,
    grade,
    factors: factors as any,
    recommendations,
  };
}

/**
 * Exemplo de uso:
 * 
 * // Analisar tendência de gastos
 * const spendingTrend = await analyzeSpendingTrend(1, 6);
 * console.log(`Tendência: ${spendingTrend.direction}, ${spendingTrend.percentage}%`);
 * 
 * // Categorias problemáticas
 * const problems = await identifyProblemCategories(1);
 * 
 * // Prever próximo mês
 * const prediction = await predictNextMonthExpenses(1);
 * console.log(`Previsão: R$ ${prediction.total}`);
 * 
 * // Padrões sazonais
 * const seasonal = await analyzeSeasonalPatterns(1);
 * 
 * // Oportunidades de economia
 * const savings = await identifySavingsOpportunities(1);
 * 
 * // Score de saúde financeira
 * const health = await calculateFinancialHealthScore(1);
 * console.log(`Score: ${health.score} (${health.grade})`);
 */
