/**
 * Investment Service
 * Gerenciamento completo de investimentos com IR
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { addMonths, differenceInDays, format } from 'date-fns';

interface Investment {
  id: number;
  userId: number;
  name: string;
  type: string;
  investedAmount: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  broker?: string;
  ticker?: string;
  maturityDate?: Date;
  riskLevel: 'low' | 'medium' | 'high';
  liquidity: 'daily' | 'monthly' | 'maturity';
  taxRegime: 'progressive' | 'regressive' | 'exempt';
}

interface InvestmentTransaction {
  id: number;
  investmentId: number;
  userId: number;
  type: 'buy' | 'sell' | 'dividend' | 'interest' | 'tax' | 'fee';
  amount: number;
  quantity?: number;
  pricePerUnit?: number;
  transactionDate: Date;
  description?: string;
}

/**
 * Criar investimento
 */
export async function createInvestment(data: {
  userId: number;
  name: string;
  type: string;
  investedAmount: number;
  broker?: string;
  ticker?: string;
  maturityDate?: Date;
  riskLevel?: 'low' | 'medium' | 'high';
  liquidity?: 'daily' | 'monthly' | 'maturity';
  taxRegime?: 'progressive' | 'regressive' | 'exempt';
  notes?: string;
}): Promise<Investment> {
  const result = await db.execute(sql`
    INSERT INTO investments (
      user_id, name, type, invested_amount, current_value,
      broker, ticker, maturity_date, risk_level, liquidity, tax_regime, notes
    ) VALUES (
      ${data.userId}, ${data.name}, ${data.type}, ${data.investedAmount},
      ${data.investedAmount}, ${data.broker || null}, ${data.ticker || null},
      ${data.maturityDate ? format(data.maturityDate, 'yyyy-MM-dd') : null},
      ${data.riskLevel || 'medium'}, ${data.liquidity || 'daily'},
      ${data.taxRegime || 'regressive'}, ${data.notes || null}
    )
  `);

  return await getInvestment(result.insertId);
}

/**
 * Buscar investimento por ID
 */
export async function getInvestment(investmentId: number): Promise<Investment> {
  const result = await db.execute(sql`
    SELECT * FROM v_investment_portfolio WHERE id = ${investmentId}
  `);

  return result.rows[0] as Investment;
}

/**
 * Listar investimentos do usuário
 */
export async function getUserInvestments(userId: number): Promise<Investment[]> {
  const result = await db.execute(sql`
    SELECT * FROM v_investment_portfolio 
    WHERE user_id = ${userId}
    ORDER BY current_value DESC
  `);

  return result.rows as Investment[];
}

/**
 * Adicionar transação de investimento
 */
export async function addInvestmentTransaction(data: {
  investmentId: number;
  userId: number;
  type: 'buy' | 'sell' | 'dividend' | 'interest' | 'tax' | 'fee';
  amount: number;
  quantity?: number;
  pricePerUnit?: number;
  transactionDate: Date;
  description?: string;
}): Promise<InvestmentTransaction> {
  const result = await db.execute(sql`
    INSERT INTO investment_transactions (
      investment_id, user_id, type, amount, quantity,
      price_per_unit, transaction_date, description
    ) VALUES (
      ${data.investmentId}, ${data.userId}, ${data.type}, ${data.amount},
      ${data.quantity || null}, ${data.pricePerUnit || null},
      ${format(data.transactionDate, 'yyyy-MM-dd')}, ${data.description || null}
    )
  `);

  // Atualizar valor do investimento
  await updateInvestmentValue(data.investmentId);

  return await getInvestmentTransaction(result.insertId);
}

/**
 * Buscar transação por ID
 */
async function getInvestmentTransaction(transactionId: number): Promise<InvestmentTransaction> {
  const result = await db.execute(sql`
    SELECT * FROM investment_transactions WHERE id = ${transactionId}
  `);

  return result.rows[0] as InvestmentTransaction;
}

/**
 * Listar transações de um investimento
 */
export async function getInvestmentTransactions(
  investmentId: number
): Promise<InvestmentTransaction[]> {
  const result = await db.execute(sql`
    SELECT * FROM investment_transactions
    WHERE investment_id = ${investmentId}
    ORDER BY transaction_date DESC
  `);

  return result.rows as InvestmentTransaction[];
}

/**
 * Atualizar valor do investimento manualmente
 */
export async function updateInvestmentValue(
  investmentId: number,
  newValue?: number
): Promise<Investment> {
  if (newValue !== undefined) {
    // Atualização manual
    await db.execute(sql`
      UPDATE investments
      SET current_value = ${newValue},
          profit_loss = ${newValue} - invested_amount,
          profit_loss_percent = ((${newValue} - invested_amount) / invested_amount) * 100,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${investmentId}
    `);
  } else {
    // Recalcular baseado em transações
    await db.execute(sql`
      UPDATE investments i
      SET current_value = invested_amount + COALESCE((
        SELECT SUM(
          CASE 
            WHEN type IN ('dividend', 'interest') THEN amount
            WHEN type IN ('tax', 'fee') THEN -amount
            ELSE 0
          END
        )
        FROM investment_transactions
        WHERE investment_id = i.id
      ), 0),
      profit_loss = current_value - invested_amount,
      profit_loss_percent = ((current_value - invested_amount) / invested_amount) * 100,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ${investmentId}
    `);
  }

  return await getInvestment(investmentId);
}

/**
 * Calcular IR sobre investimento
 */
export function calculateInvestmentTax(
  investmentType: string,
  profitAmount: number,
  holdingPeriodDays: number,
  taxRegime: 'progressive' | 'regressive' | 'exempt'
): {
  taxRate: number;
  taxAmount: number;
  netProfit: number;
} {
  if (taxRegime === 'exempt' || profitAmount <= 0) {
    return {
      taxRate: 0,
      taxAmount: 0,
      netProfit: profitAmount,
    };
  }

  let taxRate = 0;

  if (taxRegime === 'regressive') {
    // Renda Fixa - Tabela Regressiva
    if (holdingPeriodDays <= 180) {
      taxRate = 22.5;
    } else if (holdingPeriodDays <= 360) {
      taxRate = 20;
    } else if (holdingPeriodDays <= 720) {
      taxRate = 17.5;
    } else {
      taxRate = 15;
    }
  } else {
    // Renda Variável - Tabela Progressiva
    if (investmentType === 'stocks_day_trade') {
      taxRate = 20;
    } else {
      taxRate = 15;
    }
  }

  const taxAmount = (profitAmount * taxRate) / 100;
  const netProfit = profitAmount - taxAmount;

  return {
    taxRate,
    taxAmount,
    netProfit,
  };
}

/**
 * Registrar imposto a pagar
 */
export async function recordInvestmentTax(data: {
  investmentId: number;
  userId: number;
  referenceYear: number;
  referenceMonth: number;
  taxableIncome: number;
  taxRate: number;
  taxAmount: number;
  dueDate: Date;
}): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO investment_taxes (
      investment_id, user_id, reference_year, reference_month,
      taxable_income, tax_rate, tax_amount, due_date
    ) VALUES (
      ${data.investmentId}, ${data.userId}, ${data.referenceYear},
      ${data.referenceMonth}, ${data.taxableIncome}, ${data.taxRate},
      ${data.taxAmount}, ${format(data.dueDate, 'yyyy-MM-dd')}
    )
    ON DUPLICATE KEY UPDATE
      taxable_income = VALUES(taxable_income),
      tax_rate = VALUES(tax_rate),
      tax_amount = VALUES(tax_amount),
      due_date = VALUES(due_date)
  `);

  return result;
}

/**
 * Listar impostos pendentes
 */
export async function getPendingTaxes(userId: number): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT * FROM v_pending_investment_taxes
    WHERE user_id = ${userId}
    ORDER BY due_date ASC
  `);

  return result.rows;
}

/**
 * Marcar imposto como pago
 */
export async function payInvestmentTax(
  taxId: number,
  paymentDate?: Date
): Promise<void> {
  await db.execute(sql`
    UPDATE investment_taxes
    SET status = 'paid',
        paid_at = ${format(paymentDate || new Date(), 'yyyy-MM-dd HH:mm:ss')},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${taxId}
  `);
}

/**
 * Dashboard de investimentos
 */
export async function getInvestmentsDashboard(userId: number) {
  // Total investido e valor atual
  const summaryResult = await db.execute(sql`
    SELECT 
      COUNT(*) as total_investments,
      SUM(invested_amount) as total_invested,
      SUM(current_value) as total_current_value,
      SUM(profit_loss) as total_profit_loss,
      AVG(profit_loss_percent) as avg_profit_loss_percent,
      SUM(total_dividends) as total_dividends,
      SUM(total_interest) as total_interest
    FROM v_investment_portfolio
    WHERE user_id = ${userId}
  `);

  // Por tipo de investimento
  const byTypeResult = await db.execute(sql`
    SELECT 
      type,
      COUNT(*) as count,
      SUM(invested_amount) as invested,
      SUM(current_value) as current_value,
      SUM(profit_loss) as profit_loss
    FROM investments
    WHERE user_id = ${userId}
    GROUP BY type
    ORDER BY current_value DESC
  `);

  // Por nível de risco
  const byRiskResult = await db.execute(sql`
    SELECT 
      risk_level,
      COUNT(*) as count,
      SUM(current_value) as total_value
    FROM investments
    WHERE user_id = ${userId}
    GROUP BY risk_level
  `);

  // Impostos pendentes
  const pendingTaxes = await getPendingTaxes(userId);

  // Melhores performers
  const topPerformersResult = await db.execute(sql`
    SELECT 
      id, name, type, invested_amount, current_value,
      profit_loss, profit_loss_percent
    FROM v_investment_portfolio
    WHERE user_id = ${userId}
    ORDER BY profit_loss_percent DESC
    LIMIT 5
  `);

  return {
    summary: summaryResult.rows[0],
    byType: byTypeResult.rows,
    byRisk: byRiskResult.rows,
    pendingTaxes,
    topPerformers: topPerformersResult.rows,
  };
}

/**
 * Rebalancear portfolio (sugestão)
 */
export async function getRebalancingSuggestion(userId: number) {
  const investments = await getUserInvestments(userId);
  
  const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  
  // Calcular alocação atual
  const currentAllocation = {
    low: 0,
    medium: 0,
    high: 0,
  };

  investments.forEach(inv => {
    currentAllocation[inv.riskLevel] += (inv.currentValue / totalValue) * 100;
  });

  // Alocação ideal (exemplo: conservador)
  const idealAllocation = {
    low: 60,    // 60% baixo risco
    medium: 30, // 30% médio risco
    high: 10,   // 10% alto risco
  };

  // Calcular diferenças
  const suggestions = {
    low: idealAllocation.low - currentAllocation.low,
    medium: idealAllocation.medium - currentAllocation.medium,
    high: idealAllocation.high - currentAllocation.high,
  };

  return {
    totalValue,
    currentAllocation,
    idealAllocation,
    suggestions,
  };
}

/**
 * Simular venda (com IR)
 */
export async function simulateSale(
  investmentId: number,
  saleAmount: number
): Promise<{
  grossProfit: number;
  taxAmount: number;
  netProfit: number;
  finalAmount: number;
}> {
  const investment = await getInvestment(investmentId);
  
  const costBasis = (investment.investedAmount / investment.currentValue) * saleAmount;
  const grossProfit = saleAmount - costBasis;

  // Calcular IR (simplificado)
  const holdingDays = differenceInDays(new Date(), new Date(investment.createdAt));
  const taxCalc = calculateInvestmentTax(
    investment.type,
    grossProfit,
    holdingDays,
    investment.taxRegime
  );

  return {
    grossProfit,
    taxAmount: taxCalc.taxAmount,
    netProfit: taxCalc.netProfit,
    finalAmount: saleAmount - taxCalc.taxAmount,
  };
}

/**
 * Exemplo de uso:
 * 
 * // Criar investimento
 * const investment = await createInvestment({
 *   userId: 1,
 *   name: 'Tesouro Selic 2029',
 *   type: 'treasury',
 *   investedAmount: 10000,
 *   broker: 'XP Investimentos',
 *   ticker: 'Tesouro Selic',
 *   maturityDate: new Date('2029-01-01'),
 *   riskLevel: 'low',
 *   liquidity: 'daily',
 *   taxRegime: 'regressive',
 * });
 * 
 * // Adicionar dividendo
 * await addInvestmentTransaction({
 *   investmentId: 1,
 *   userId: 1,
 *   type: 'dividend',
 *   amount: 150.00,
 *   transactionDate: new Date(),
 *   description: 'Dividendo mensal',
 * });
 * 
 * // Atualizar valor
 * await updateInvestmentValue(1, 10500);
 * 
 * // Calcular IR
 * const tax = calculateInvestmentTax('treasury', 500, 365, 'regressive');
 * 
 * // Dashboard
 * const dashboard = await getInvestmentsDashboard(1);
 * 
 * // Simular venda
 * const simulation = await simulateSale(1, 10500);
 */
