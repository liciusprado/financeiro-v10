/**
 * Smart Recurring Service
 * Detecção inteligente de padrões recorrentes
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { differenceInDays, addMonths, addWeeks, addDays, format } from 'date-fns';

interface RecurringPattern {
  id: number;
  userId: number;
  description: string;
  category?: string;
  averageAmount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  confidenceScore: number;
  lastOccurrence?: Date;
  nextPredictedDate?: Date;
  occurrencesCount: number;
  isConfirmed: boolean;
  isActive: boolean;
  merchantName?: string;
}

/**
 * Detectar padrões recorrentes
 */
export async function detectRecurringPatterns(userId: number): Promise<{
  detected: number;
  patterns: RecurringPattern[];
}> {
  // Buscar transações dos últimos 12 meses
  const transactions = await db.execute(sql`
    SELECT 
      id, description, amount, category, date, merchant_name
    FROM transactions
    WHERE user_id = ${userId}
      AND date >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
      AND deleted_at IS NULL
    ORDER BY date ASC
  `);

  const grouped = groupSimilarTransactions(transactions.rows as any[]);
  const patterns: RecurringPattern[] = [];

  for (const group of grouped) {
    if (group.transactions.length < 3) continue; // Mínimo 3 ocorrências

    const pattern = analyzePattern(userId, group.transactions);
    
    if (pattern && pattern.confidenceScore >= 0.60) {
      // Verificar se já existe
      const existing = await db.execute(sql`
        SELECT id FROM recurring_patterns
        WHERE user_id = ${userId}
          AND description = ${pattern.description}
          AND frequency = ${pattern.frequency}
      `);

      if (existing.rows.length === 0) {
        // Criar novo padrão
        const result = await db.execute(sql`
          INSERT INTO recurring_patterns (
            user_id, description, category, average_amount, frequency,
            confidence_score, last_occurrence, next_predicted_date,
            occurrences_count, merchant_name
          ) VALUES (
            ${userId}, ${pattern.description}, ${pattern.category},
            ${pattern.averageAmount}, ${pattern.frequency},
            ${pattern.confidenceScore}, ${format(pattern.lastOccurrence!, 'yyyy-MM-dd')},
            ${format(pattern.nextPredictedDate!, 'yyyy-MM-dd')},
            ${pattern.occurrencesCount}, ${pattern.merchantName || null}
          )
        `);

        const patternId = result.insertId;

        // Registrar ocorrências
        for (const txn of group.transactions) {
          await db.execute(sql`
            INSERT INTO recurring_occurrences (
              pattern_id, transaction_id, occurrence_date, amount
            ) VALUES (
              ${patternId}, ${txn.id}, ${format(txn.date, 'yyyy-MM-dd')}, ${txn.amount}
            )
          `);
        }

        pattern.id = patternId;
        patterns.push(pattern);
      }
    }
  }

  return {
    detected: patterns.length,
    patterns,
  };
}

/**
 * Agrupar transações similares
 */
function groupSimilarTransactions(transactions: any[]): Array<{
  key: string;
  transactions: any[];
}> {
  const groups = new Map<string, any[]>();

  for (const txn of transactions) {
    // Normalizar descrição
    const normalized = normalizeDescription(txn.description);
    
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized)!.push(txn);
  }

  return Array.from(groups.entries()).map(([key, txns]) => ({
    key,
    transactions: txns,
  }));
}

/**
 * Normalizar descrição (remover números, datas)
 */
function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/\d+/g, '') // Remove números
    .replace(/\s+/g, ' ') // Remove espaços extras
    .trim();
}

/**
 * Analisar padrão de um grupo
 */
function analyzePattern(
  userId: number,
  transactions: any[]
): RecurringPattern | null {
  if (transactions.length < 3) return null;

  // Ordenar por data
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calcular intervalos entre transações
  const intervals: number[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const days = differenceInDays(
      new Date(transactions[i].date),
      new Date(transactions[i - 1].date)
    );
    intervals.push(days);
  }

  // Detectar frequência
  const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
  const frequency = detectFrequency(avgInterval);

  if (!frequency) return null;

  // Calcular variância dos intervalos
  const variance = calculateVariance(intervals);
  const consistencyScore = 1 - Math.min(variance / avgInterval, 1);

  // Calcular valor médio
  const averageAmount = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;

  // Calcular variância dos valores
  const amountVariance = calculateVariance(transactions.map(t => t.amount));
  const amountConsistencyScore = 1 - Math.min(amountVariance / averageAmount, 1);

  // Confidence score baseado em:
  // - Número de ocorrências (peso 0.3)
  // - Consistência do intervalo (peso 0.4)
  // - Consistência do valor (peso 0.3)
  const occurrenceScore = Math.min(transactions.length / 12, 1);
  const confidenceScore = 
    occurrenceScore * 0.3 +
    consistencyScore * 0.4 +
    amountConsistencyScore * 0.3;

  // Prever próxima data
  const lastOccurrence = new Date(transactions[transactions.length - 1].date);
  const nextPredictedDate = predictNextDate(lastOccurrence, frequency);

  return {
    id: 0,
    userId,
    description: transactions[0].description,
    category: transactions[0].category,
    averageAmount,
    frequency,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    lastOccurrence,
    nextPredictedDate,
    occurrencesCount: transactions.length,
    isConfirmed: false,
    isActive: true,
    merchantName: transactions[0].merchant_name,
  };
}

/**
 * Detectar frequência baseada no intervalo médio
 */
function detectFrequency(avgDays: number): RecurringPattern['frequency'] | null {
  if (avgDays < 2) return 'daily';
  if (avgDays >= 2 && avgDays <= 9) return 'weekly';
  if (avgDays >= 10 && avgDays <= 18) return 'biweekly';
  if (avgDays >= 25 && avgDays <= 35) return 'monthly';
  if (avgDays >= 80 && avgDays <= 100) return 'quarterly';
  if (avgDays >= 350 && avgDays <= 380) return 'yearly';
  return null;
}

/**
 * Calcular variância
 */
function calculateVariance(numbers: number[]): number {
  const avg = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - avg, 2));
  return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
}

/**
 * Prever próxima data
 */
function predictNextDate(
  lastDate: Date,
  frequency: RecurringPattern['frequency']
): Date {
  switch (frequency) {
    case 'daily':
      return addDays(lastDate, 1);
    case 'weekly':
      return addWeeks(lastDate, 1);
    case 'biweekly':
      return addWeeks(lastDate, 2);
    case 'monthly':
      return addMonths(lastDate, 1);
    case 'quarterly':
      return addMonths(lastDate, 3);
    case 'yearly':
      return addMonths(lastDate, 12);
    default:
      return addMonths(lastDate, 1);
  }
}

/**
 * Listar padrões ativos
 */
export async function getActivePatterns(userId: number): Promise<RecurringPattern[]> {
  const result = await db.execute(sql`
    SELECT * FROM recurring_patterns
    WHERE user_id = ${userId}
      AND is_active = TRUE
    ORDER BY confidence_score DESC, next_predicted_date ASC
  `);

  return result.rows as RecurringPattern[];
}

/**
 * Buscar próximas recorrências previstas
 */
export async function getUpcomingRecurring(
  userId: number,
  days: number = 30
): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT * FROM v_upcoming_recurring
    WHERE user_id = ${userId}
      AND days_until <= ${days}
    ORDER BY next_predicted_date ASC
  `);

  return result.rows;
}

/**
 * Confirmar padrão
 */
export async function confirmPattern(patternId: number): Promise<void> {
  await db.execute(sql`
    UPDATE recurring_patterns
    SET is_confirmed = TRUE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${patternId}
  `);
}

/**
 * Desativar padrão
 */
export async function deactivatePattern(patternId: number): Promise<void> {
  await db.execute(sql`
    UPDATE recurring_patterns
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${patternId}
  `);
}

/**
 * Atualizar padrão com nova ocorrência
 */
export async function updatePatternWithOccurrence(
  patternId: number,
  transactionId: number
): Promise<void> {
  const transaction = await db.execute(sql`
    SELECT * FROM transactions WHERE id = ${transactionId}
  `);

  if (transaction.rows.length === 0) return;

  const txn = transaction.rows[0];

  // Registrar ocorrência
  await db.execute(sql`
    INSERT INTO recurring_occurrences (
      pattern_id, transaction_id, occurrence_date, amount, was_predicted
    ) VALUES (
      ${patternId}, ${transactionId}, ${format(txn.date, 'yyyy-MM-dd')},
      ${txn.amount}, TRUE
    )
  `);

  // Atualizar padrão
  const pattern = await db.execute(sql`
    SELECT * FROM recurring_patterns WHERE id = ${patternId}
  `);

  if (pattern.rows.length === 0) return;

  const p = pattern.rows[0];
  const nextDate = predictNextDate(new Date(txn.date), p.frequency);

  await db.execute(sql`
    UPDATE recurring_patterns
    SET last_occurrence = ${format(txn.date, 'yyyy-MM-dd')},
        next_predicted_date = ${format(nextDate, 'yyyy-MM-dd')},
        occurrences_count = occurrences_count + 1,
        average_amount = (average_amount * occurrences_count + ${txn.amount}) / (occurrences_count + 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${patternId}
  `);
}

/**
 * Dashboard de recorrências
 */
export async function getRecurringDashboard(userId: number) {
  // Total de padrões
  const patternsResult = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN is_confirmed THEN 1 END) as confirmed,
      AVG(confidence_score) as avg_confidence
    FROM recurring_patterns
    WHERE user_id = ${userId}
      AND is_active = TRUE
  `);

  // Próximas recorrências (7 dias)
  const upcomingResult = await db.execute(sql`
    SELECT * FROM v_upcoming_recurring
    WHERE user_id = ${userId}
      AND days_until <= 7
    ORDER BY next_predicted_date ASC
  `);

  // Por frequência
  const byFrequencyResult = await db.execute(sql`
    SELECT 
      frequency,
      COUNT(*) as count,
      SUM(average_amount) as total_amount
    FROM recurring_patterns
    WHERE user_id = ${userId}
      AND is_active = TRUE
    GROUP BY frequency
    ORDER BY count DESC
  `);

  // Economia estimada (se alertas previnem atrasos)
  const savingsResult = await db.execute(sql`
    SELECT 
      COUNT(*) * 50 as estimated_savings
    FROM recurring_patterns
    WHERE user_id = ${userId}
      AND is_confirmed = TRUE
  `);

  return {
    patterns: patternsResult.rows[0],
    upcoming: upcomingResult.rows,
    byFrequency: byFrequencyResult.rows,
    estimatedSavings: savingsResult.rows[0],
  };
}

/**
 * Sugerir automatização (criar meta recorrente)
 */
export async function suggestAutomation(
  patternId: number
): Promise<{
  canAutomate: boolean;
  suggestion: string;
  estimatedMonthlyAmount: number;
}> {
  const pattern = await db.execute(sql`
    SELECT * FROM recurring_patterns WHERE id = ${patternId}
  `);

  if (pattern.rows.length === 0) {
    return {
      canAutomate: false,
      suggestion: 'Padrão não encontrado',
      estimatedMonthlyAmount: 0,
    };
  }

  const p = pattern.rows[0];

  if (p.confidence_score < 0.80) {
    return {
      canAutomate: false,
      suggestion: 'Confiança muito baixa para automação',
      estimatedMonthlyAmount: 0,
    };
  }

  // Calcular gasto mensal
  let monthlyAmount = 0;
  switch (p.frequency) {
    case 'daily':
      monthlyAmount = p.average_amount * 30;
      break;
    case 'weekly':
      monthlyAmount = p.average_amount * 4.33;
      break;
    case 'biweekly':
      monthlyAmount = p.average_amount * 2;
      break;
    case 'monthly':
      monthlyAmount = p.average_amount;
      break;
    case 'quarterly':
      monthlyAmount = p.average_amount / 3;
      break;
    case 'yearly':
      monthlyAmount = p.average_amount / 12;
      break;
  }

  return {
    canAutomate: true,
    suggestion: `Sugerimos reservar R$ ${monthlyAmount.toFixed(2)} mensalmente para "${p.description}"`,
    estimatedMonthlyAmount: monthlyAmount,
  };
}

/**
 * Exemplo de uso:
 * 
 * // Detectar padrões
 * const detection = await detectRecurringPatterns(1);
 * console.log(`Detectados ${detection.detected} padrões`);
 * 
 * // Listar padrões ativos
 * const patterns = await getActivePatterns(1);
 * 
 * // Próximas recorrências (7 dias)
 * const upcoming = await getUpcomingRecurring(1, 7);
 * 
 * // Confirmar padrão
 * await confirmPattern(patternId);
 * 
 * // Dashboard
 * const dashboard = await getRecurringDashboard(1);
 * 
 * // Sugerir automação
 * const suggestion = await suggestAutomation(patternId);
 * if (suggestion.canAutomate) {
 *   console.log(suggestion.suggestion);
 * }
 */
