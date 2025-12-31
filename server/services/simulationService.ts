/**
 * Simulation Service
 * Simulações "E se?" para projeções financeiras
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { addMonths, format, differenceInMonths } from 'date-fns';

interface SimulationResult {
  months: Array<{
    month: Date;
    income: number;
    expenses: number;
    savings: number;
    balance: number;
  }>;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    finalBalance: number;
  };
}

/**
 * Simular: E se eu economizar X% do meu salário?
 */
export async function simulateSavingsRate(
  userId: number,
  savingsRate: number, // Porcentagem (0-100)
  months: number = 12
): Promise<SimulationResult> {
  // Buscar renda e despesas médias
  const avgResult = await db.execute(sql`
    SELECT 
      AVG(CASE WHEN type = 'income' THEN monthly_total ELSE 0 END) as avg_income,
      AVG(CASE WHEN type = 'expense' THEN monthly_total ELSE 0 END) as avg_expense
    FROM (
      SELECT 
        type,
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(amount) as monthly_total
      FROM transactions
      WHERE user_id = ${userId}
        AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
        AND deleted_at IS NULL
      GROUP BY type, month
    ) as monthly_data
  `);

  const avgIncome = avgResult.rows[0]?.avg_income || 0;
  const avgExpense = avgResult.rows[0]?.avg_expense || 0;

  // Calcular nova despesa baseada na taxa de poupança
  const targetSavings = avgIncome * (savingsRate / 100);
  const newExpense = avgIncome - targetSavings;

  // Simular meses
  const monthsData = [];
  let balance = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  for (let i = 0; i < months; i++) {
    const month = addMonths(new Date(), i);
    const savings = targetSavings;
    
    monthsData.push({
      month,
      income: avgIncome,
      expenses: newExpense,
      savings,
      balance: balance + savings,
    });

    balance += savings;
    totalIncome += avgIncome;
    totalExpenses += newExpense;
  }

  return {
    months: monthsData,
    summary: {
      totalIncome,
      totalExpenses,
      totalSavings: balance,
      finalBalance: balance,
    },
  };
}

/**
 * Simular: E se eu reduzir gastos em uma categoria?
 */
export async function simulateCategoryReduction(
  userId: number,
  category: string,
  reductionPercent: number, // Porcentagem de redução
  months: number = 12
): Promise<{
  beforeReduction: SimulationResult;
  afterReduction: SimulationResult;
  totalSavings: number;
}> {
  // Buscar gastos médios
  const avgResult = await db.execute(sql`
    SELECT 
      AVG(CASE WHEN type = 'income' THEN monthly_total ELSE 0 END) as avg_income,
      AVG(CASE WHEN type = 'expense' AND category = ${category} THEN monthly_total ELSE 0 END) as avg_category,
      AVG(CASE WHEN type = 'expense' AND category != ${category} THEN monthly_total ELSE 0 END) as avg_other
    FROM (
      SELECT 
        type,
        category,
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(amount) as monthly_total
      FROM transactions
      WHERE user_id = ${userId}
        AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
        AND deleted_at IS NULL
      GROUP BY type, category, month
    ) as monthly_data
  `);

  const avgIncome = avgResult.rows[0]?.avg_income || 0;
  const avgCategory = avgResult.rows[0]?.avg_category || 0;
  const avgOther = avgResult.rows[0]?.avg_other || 0;

  const totalExpenseBefore = avgCategory + avgOther;
  const reduction = avgCategory * (reductionPercent / 100);
  const totalExpenseAfter = totalExpenseBefore - reduction;

  // Simular ANTES
  const before = simulateScenario(avgIncome, totalExpenseBefore, months);
  
  // Simular DEPOIS
  const after = simulateScenario(avgIncome, totalExpenseAfter, months);

  return {
    beforeReduction: before,
    afterReduction: after,
    totalSavings: after.summary.totalSavings - before.summary.totalSavings,
  };
}

/**
 * Simular: E se eu aumentar minha renda?
 */
export async function simulateIncomeIncrease(
  userId: number,
  increasePercent: number,
  months: number = 12
): Promise<{
  beforeIncrease: SimulationResult;
  afterIncrease: SimulationResult;
  additionalSavings: number;
}> {
  // Buscar dados atuais
  const avgResult = await db.execute(sql`
    SELECT 
      AVG(CASE WHEN type = 'income' THEN monthly_total ELSE 0 END) as avg_income,
      AVG(CASE WHEN type = 'expense' THEN monthly_total ELSE 0 END) as avg_expense
    FROM (
      SELECT 
        type,
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(amount) as monthly_total
      FROM transactions
      WHERE user_id = ${userId}
        AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
        AND deleted_at IS NULL
      GROUP BY type, month
    ) as monthly_data
  `);

  const avgIncome = avgResult.rows[0]?.avg_income || 0;
  const avgExpense = avgResult.rows[0]?.avg_expense || 0;

  const newIncome = avgIncome * (1 + increasePercent / 100);

  // Simular ANTES
  const before = simulateScenario(avgIncome, avgExpense, months);
  
  // Simular DEPOIS (mantém despesas iguais)
  const after = simulateScenario(newIncome, avgExpense, months);

  return {
    beforeIncrease: before,
    afterIncrease: after,
    additionalSavings: after.summary.totalSavings - before.summary.totalSavings,
  };
}

/**
 * Simular: Quanto tempo para atingir meta?
 */
export async function simulateGoalAchievement(
  userId: number,
  goalAmount: number,
  monthlySavings?: number
): Promise<{
  months: number;
  achievementDate: Date;
  monthlyBreakdown: Array<{
    month: Date;
    saved: number;
    accumulated: number;
    progress: number;
  }>;
}> {
  // Se não informar poupança mensal, calcular baseado no histórico
  if (!monthlySavings) {
    const avgResult = await db.execute(sql`
      SELECT 
        AVG(CASE WHEN type = 'income' THEN monthly_total ELSE 0 END) -
        AVG(CASE WHEN type = 'expense' THEN monthly_total ELSE 0 END) as avg_savings
      FROM (
        SELECT 
          type,
          DATE_FORMAT(date, '%Y-%m') as month,
          SUM(amount) as monthly_total
        FROM transactions
        WHERE user_id = ${userId}
          AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
          AND deleted_at IS NULL
        GROUP BY type, month
      ) as monthly_data
    `);

    monthlySavings = Math.max(0, avgResult.rows[0]?.avg_savings || 0);
  }

  if (monthlySavings <= 0) {
    throw new Error('Poupança mensal deve ser positiva');
  }

  const monthsNeeded = Math.ceil(goalAmount / monthlySavings);
  const achievementDate = addMonths(new Date(), monthsNeeded);

  // Gerar breakdown mensal
  const monthlyBreakdown = [];
  let accumulated = 0;

  for (let i = 1; i <= monthsNeeded; i++) {
    accumulated += monthlySavings;
    const saved = Math.min(monthlySavings, goalAmount - (accumulated - monthlySavings));
    
    monthlyBreakdown.push({
      month: addMonths(new Date(), i),
      saved,
      accumulated: Math.min(accumulated, goalAmount),
      progress: Math.min(100, (accumulated / goalAmount) * 100),
    });
  }

  return {
    months: monthsNeeded,
    achievementDate,
    monthlyBreakdown,
  };
}

/**
 * Simular: Aposentadoria
 */
export async function simulateRetirement(
  userId: number,
  currentAge: number,
  retirementAge: number,
  monthlySavings: number,
  expectedReturn: number = 0.8 // Taxa de retorno mensal (0.8% = ~10% ao ano)
): Promise<{
  monthsUntilRetirement: number;
  totalContributions: number;
  estimatedValue: number;
  monthlyIncome: number; // Assumindo 4% de saque anual
}> {
  const yearsUntilRetirement = retirementAge - currentAge;
  const monthsUntilRetirement = yearsUntilRetirement * 12;

  // Calcular valor futuro com juros compostos
  const monthlyRate = expectedReturn / 100;
  let totalValue = 0;

  for (let i = 0; i < monthsUntilRetirement; i++) {
    totalValue = (totalValue + monthlySavings) * (1 + monthlyRate);
  }

  const totalContributions = monthlySavings * monthsUntilRetirement;
  const monthlyIncome = (totalValue * 0.04) / 12; // 4% rule

  return {
    monthsUntilRetirement,
    totalContributions,
    estimatedValue: Math.round(totalValue * 100) / 100,
    monthlyIncome: Math.round(monthlyIncome * 100) / 100,
  };
}

/**
 * Simular cenário completo
 */
export async function simulateCompleteScenario(
  userId: number,
  scenario: {
    incomeChange?: number; // % de mudança na renda
    expenseChange?: number; // % de mudança nas despesas
    newExpense?: { category: string; amount: number }; // Nova despesa
    months: number;
  }
): Promise<SimulationResult> {
  // Buscar dados históricos
  const avgResult = await db.execute(sql`
    SELECT 
      AVG(CASE WHEN type = 'income' THEN monthly_total ELSE 0 END) as avg_income,
      AVG(CASE WHEN type = 'expense' THEN monthly_total ELSE 0 END) as avg_expense
    FROM (
      SELECT 
        type,
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(amount) as monthly_total
      FROM transactions
      WHERE user_id = ${userId}
        AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
        AND deleted_at IS NULL
      GROUP BY type, month
    ) as monthly_data
  `);

  let income = avgResult.rows[0]?.avg_income || 0;
  let expense = avgResult.rows[0]?.avg_expense || 0;

  // Aplicar mudanças
  if (scenario.incomeChange) {
    income *= (1 + scenario.incomeChange / 100);
  }
  if (scenario.expenseChange) {
    expense *= (1 + scenario.expenseChange / 100);
  }
  if (scenario.newExpense) {
    expense += scenario.newExpense.amount;
  }

  return simulateScenario(income, expense, scenario.months);
}

/**
 * Helper: Simular cenário genérico
 */
function simulateScenario(
  monthlyIncome: number,
  monthlyExpense: number,
  months: number
): SimulationResult {
  const monthsData = [];
  let balance = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  for (let i = 0; i < months; i++) {
    const month = addMonths(new Date(), i);
    const savings = monthlyIncome - monthlyExpense;
    
    monthsData.push({
      month,
      income: monthlyIncome,
      expenses: monthlyExpense,
      savings,
      balance: balance + savings,
    });

    balance += savings;
    totalIncome += monthlyIncome;
    totalExpenses += monthlyExpense;
  }

  return {
    months: monthsData,
    summary: {
      totalIncome,
      totalExpenses,
      totalSavings: balance,
      finalBalance: balance,
    },
  };
}

/**
 * Comparar múltiplos cenários
 */
export async function compareScenarios(
  userId: number,
  scenarios: Array<{
    name: string;
    incomeChange?: number;
    expenseChange?: number;
    months: number;
  }>
): Promise<Array<{
  name: string;
  result: SimulationResult;
}>> {
  const results = [];

  for (const scenario of scenarios) {
    const result = await simulateCompleteScenario(userId, scenario);
    results.push({
      name: scenario.name,
      result,
    });
  }

  return results;
}

/**
 * Exemplo de uso:
 * 
 * // Simular taxa de poupança de 20%
 * const savings = await simulateSavingsRate(1, 20, 12);
 * console.log(`Em 12 meses você terá: R$ ${savings.summary.finalBalance}`);
 * 
 * // Simular redução de 30% em Alimentação
 * const reduction = await simulateCategoryReduction(1, 'Alimentação', 30, 12);
 * console.log(`Economia total: R$ ${reduction.totalSavings}`);
 * 
 * // Simular aumento de 15% na renda
 * const increase = await simulateIncomeIncrease(1, 15, 12);
 * console.log(`Poupança adicional: R$ ${increase.additionalSavings}`);
 * 
 * // Simular meta de R$ 50.000
 * const goal = await simulateGoalAchievement(1, 50000);
 * console.log(`Você alcançará em ${goal.months} meses`);
 * 
 * // Simular aposentadoria
 * const retirement = await simulateRetirement(1, 30, 65, 1500);
 * console.log(`Valor estimado: R$ ${retirement.estimatedValue}`);
 * console.log(`Renda mensal: R$ ${retirement.monthlyIncome}`);
 * 
 * // Comparar cenários
 * const comparison = await compareScenarios(1, [
 *   { name: 'Conservador', expenseChange: -10, months: 12 },
 *   { name: 'Moderado', expenseChange: -20, months: 12 },
 *   { name: 'Agressivo', expenseChange: -30, months: 12 },
 * ]);
 */
