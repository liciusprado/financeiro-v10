/**
 * Installment Service
 * Gerenciamento completo de parcelamentos
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { addMonths, format, parseISO } from 'date-fns';

interface Installment {
  id: number;
  userId: number;
  transactionId?: number;
  cardId?: number;
  description: string;
  totalAmount: number;
  totalInstallments: number;
  currentInstallment: number;
  installmentAmount: number;
  startDate: Date;
  category?: string;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
}

interface InstallmentPayment {
  id: number;
  installmentId: number;
  userId: number;
  statementId?: number;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
}

/**
 * Criar parcelamento
 */
export async function createInstallment(data: {
  userId: number;
  description: string;
  totalAmount: number;
  totalInstallments: number;
  startDate: Date;
  cardId?: number;
  category?: string;
  notes?: string;
  interestRate?: number; // Taxa de juros mensal (opcional)
}): Promise<Installment> {
  // Calcular valor da parcela
  let installmentAmount = data.totalAmount / data.totalInstallments;

  // Se tem juros, calcular com Price
  if (data.interestRate && data.interestRate > 0) {
    installmentAmount = calculateInstallmentWithInterest(
      data.totalAmount,
      data.totalInstallments,
      data.interestRate
    );
  }

  // Criar parcelamento
  const result = await db.execute(sql`
    INSERT INTO installments (
      user_id, description, total_amount, total_installments,
      installment_amount, start_date, card_id, category, notes
    ) VALUES (
      ${data.userId}, ${data.description}, ${data.totalAmount},
      ${data.totalInstallments}, ${installmentAmount},
      ${format(data.startDate, 'yyyy-MM-dd')}, ${data.cardId || null},
      ${data.category || null}, ${data.notes || null}
    )
  `);

  const installmentId = result.insertId;

  // Gerar parcelas individuais
  await generateInstallmentPayments(
    installmentId,
    data.userId,
    data.totalInstallments,
    installmentAmount,
    data.startDate,
    data.cardId
  );

  return await getInstallment(installmentId);
}

/**
 * Calcular parcela com juros (Tabela Price)
 */
function calculateInstallmentWithInterest(
  totalAmount: number,
  installments: number,
  monthlyRate: number
): number {
  const rate = monthlyRate / 100;
  const coefficient = (rate * Math.pow(1 + rate, installments)) / 
                     (Math.pow(1 + rate, installments) - 1);
  return totalAmount * coefficient;
}

/**
 * Gerar parcelas individuais
 */
async function generateInstallmentPayments(
  installmentId: number,
  userId: number,
  totalInstallments: number,
  installmentAmount: number,
  startDate: Date,
  cardId?: number
): Promise<void> {
  for (let i = 1; i <= totalInstallments; i++) {
    const dueDate = addMonths(startDate, i - 1);
    
    // Se tem cartão, associar à fatura correspondente
    let statementId = null;
    if (cardId) {
      statementId = await findStatementForDate(cardId, dueDate);
    }

    await db.execute(sql`
      INSERT INTO installment_payments (
        installment_id, user_id, statement_id, installment_number,
        amount, due_date
      ) VALUES (
        ${installmentId}, ${userId}, ${statementId},
        ${i}, ${installmentAmount}, ${format(dueDate, 'yyyy-MM-dd')}
      )
    `);
  }
}

/**
 * Encontrar fatura do cartão para uma data
 */
async function findStatementForDate(
  cardId: number,
  date: Date
): Promise<number | null> {
  const result = await db.execute(sql`
    SELECT id FROM card_statements
    WHERE card_id = ${cardId}
      AND reference_month = DATE_FORMAT(${format(date, 'yyyy-MM-dd')}, '%Y-%m-01')
    LIMIT 1
  `);

  return result.rows[0]?.id || null;
}

/**
 * Buscar parcelamento por ID
 */
export async function getInstallment(installmentId: number): Promise<Installment> {
  const result = await db.execute(sql`
    SELECT 
      i.*,
      cc.name as card_name,
      (SELECT COUNT(*) FROM installment_payments 
       WHERE installment_id = i.id AND status = 'paid') as paid_count
    FROM installments i
    LEFT JOIN credit_cards cc ON i.card_id = cc.id
    WHERE i.id = ${installmentId}
  `);

  return result.rows[0] as any;
}

/**
 * Listar parcelamentos do usuário
 */
export async function getUserInstallments(
  userId: number,
  status?: 'active' | 'completed' | 'cancelled'
): Promise<Installment[]> {
  let query = sql`
    SELECT 
      i.*,
      cc.name as card_name,
      COUNT(CASE WHEN ip.status = 'paid' THEN 1 END) as paid_installments,
      COUNT(CASE WHEN ip.status = 'pending' THEN 1 END) as pending_installments,
      COUNT(CASE WHEN ip.status = 'overdue' THEN 1 END) as overdue_installments,
      SUM(CASE WHEN ip.status = 'paid' THEN ip.amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN ip.status != 'paid' THEN ip.amount ELSE 0 END) as remaining_amount
    FROM installments i
    LEFT JOIN credit_cards cc ON i.card_id = cc.id
    LEFT JOIN installment_payments ip ON i.id = ip.installment_id
    WHERE i.user_id = ${userId}
  `;

  if (status) {
    query = sql`${query} AND i.status = ${status}`;
  }

  query = sql`
    ${query}
    GROUP BY i.id
    ORDER BY i.start_date DESC
  `;

  const result = await db.execute(query);
  return result.rows as any[];
}

/**
 * Buscar parcelas de um parcelamento
 */
export async function getInstallmentPayments(
  installmentId: number
): Promise<InstallmentPayment[]> {
  const result = await db.execute(sql`
    SELECT 
      ip.*,
      cs.reference_month as statement_month
    FROM installment_payments ip
    LEFT JOIN card_statements cs ON ip.statement_id = cs.id
    WHERE ip.installment_id = ${installmentId}
    ORDER BY ip.installment_number ASC
  `);

  return result.rows as any[];
}

/**
 * Pagar parcela
 */
export async function payInstallmentPayment(
  paymentId: number,
  paymentDate?: Date
): Promise<InstallmentPayment> {
  await db.execute(sql`
    UPDATE installment_payments
    SET status = 'paid',
        paid_at = ${format(paymentDate || new Date(), 'yyyy-MM-dd HH:mm:ss')},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${paymentId}
  `);

  // Trigger vai atualizar status do parcelamento automaticamente
  return await getInstallmentPayment(paymentId);
}

/**
 * Buscar parcela por ID
 */
export async function getInstallmentPayment(
  paymentId: number
): Promise<InstallmentPayment> {
  const result = await db.execute(sql`
    SELECT * FROM installment_payments WHERE id = ${paymentId}
  `);

  return result.rows[0] as InstallmentPayment;
}

/**
 * Cancelar parcelamento
 */
export async function cancelInstallment(installmentId: number): Promise<void> {
  await db.execute(sql`
    UPDATE installments
    SET status = 'cancelled',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${installmentId}
  `);

  // Cancelar parcelas pendentes
  await db.execute(sql`
    DELETE FROM installment_payments
    WHERE installment_id = ${installmentId}
      AND status = 'pending'
  `);
}

/**
 * Buscar próximas parcelas a vencer
 */
export async function getUpcomingPayments(
  userId: number,
  days: number = 30
): Promise<InstallmentPayment[]> {
  const result = await db.execute(sql`
    SELECT 
      ip.*,
      i.description,
      i.total_installments,
      cc.name as card_name,
      DATEDIFF(ip.due_date, CURRENT_DATE) as days_until_due
    FROM installment_payments ip
    JOIN installments i ON ip.installment_id = i.id
    LEFT JOIN credit_cards cc ON i.card_id = cc.id
    WHERE ip.user_id = ${userId}
      AND ip.status = 'pending'
      AND ip.due_date BETWEEN CURRENT_DATE 
        AND DATE_ADD(CURRENT_DATE, INTERVAL ${days} DAY)
    ORDER BY ip.due_date ASC
  `);

  return result.rows as any[];
}

/**
 * Marcar parcelas vencidas
 */
export async function markOverduePayments(): Promise<number> {
  const result = await db.execute(sql`
    UPDATE installment_payments
    SET status = 'overdue'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE
  `);

  return result.affectedRows || 0;
}

/**
 * Dashboard de parcelamentos
 */
export async function getInstallmentsDashboard(userId: number) {
  // Total ativo
  const activeResult = await db.execute(sql`
    SELECT 
      COUNT(*) as count,
      SUM(total_amount) as total_amount,
      SUM(total_amount - (current_installment * installment_amount)) as remaining_amount
    FROM installments
    WHERE user_id = ${userId} AND status = 'active'
  `);

  // Próximas parcelas (30 dias)
  const upcomingPayments = await getUpcomingPayments(userId, 30);

  // Parcelas em atraso
  const overdueResult = await db.execute(sql`
    SELECT 
      COUNT(*) as count,
      SUM(amount) as amount
    FROM installment_payments
    WHERE user_id = ${userId}
      AND status = 'overdue'
  `);

  // Por cartão
  const byCardResult = await db.execute(sql`
    SELECT 
      cc.name as card_name,
      cc.color as card_color,
      COUNT(DISTINCT i.id) as installment_count,
      SUM(ip.amount) as total_amount
    FROM installments i
    JOIN credit_cards cc ON i.card_id = cc.id
    JOIN installment_payments ip ON i.id = ip.installment_id
    WHERE i.user_id = ${userId}
      AND i.status = 'active'
      AND ip.status != 'paid'
    GROUP BY cc.id, cc.name, cc.color
    ORDER BY total_amount DESC
  `);

  return {
    active: activeResult.rows[0],
    upcomingPayments,
    overdue: overdueResult.rows[0],
    byCard: byCardResult.rows,
  };
}

/**
 * Simular parcelamento (sem criar)
 */
export function simulateInstallment(
  totalAmount: number,
  installments: number,
  interestRate?: number
): {
  installmentAmount: number;
  totalWithInterest: number;
  totalInterest: number;
  schedule: Array<{
    number: number;
    amount: number;
    interest: number;
    principal: number;
    balance: number;
  }>;
} {
  let installmentAmount: number;
  let totalWithInterest: number;

  if (!interestRate || interestRate === 0) {
    // Sem juros
    installmentAmount = totalAmount / installments;
    totalWithInterest = totalAmount;

    return {
      installmentAmount,
      totalWithInterest,
      totalInterest: 0,
      schedule: Array.from({ length: installments }, (_, i) => ({
        number: i + 1,
        amount: installmentAmount,
        interest: 0,
        principal: installmentAmount,
        balance: totalAmount - (installmentAmount * (i + 1)),
      })),
    };
  }

  // Com juros (Tabela Price)
  installmentAmount = calculateInstallmentWithInterest(
    totalAmount,
    installments,
    interestRate
  );
  totalWithInterest = installmentAmount * installments;

  // Gerar cronograma
  const schedule = [];
  let balance = totalAmount;
  const monthlyRate = interestRate / 100;

  for (let i = 1; i <= installments; i++) {
    const interest = balance * monthlyRate;
    const principal = installmentAmount - interest;
    balance -= principal;

    schedule.push({
      number: i,
      amount: installmentAmount,
      interest,
      principal,
      balance: Math.max(0, balance),
    });
  }

  return {
    installmentAmount,
    totalWithInterest,
    totalInterest: totalWithInterest - totalAmount,
    schedule,
  };
}

/**
 * Antecipar parcelas
 */
export async function anticipatePayments(
  installmentId: number,
  paymentIds: number[]
): Promise<{
  paidCount: number;
  totalPaid: number;
  discount?: number;
}> {
  let totalPaid = 0;
  
  for (const paymentId of paymentIds) {
    const payment = await getInstallmentPayment(paymentId);
    totalPaid += payment.amount;
    await payInstallmentPayment(paymentId);
  }

  // TODO: Aplicar desconto por antecipação (se houver)
  
  return {
    paidCount: paymentIds.length,
    totalPaid,
  };
}

/**
 * Exemplo de uso:
 * 
 * // Criar parcelamento simples
 * const installment = await createInstallment({
 *   userId: 1,
 *   description: 'iPhone 15 Pro',
 *   totalAmount: 7200,
 *   totalInstallments: 12,
 *   startDate: new Date(),
 *   category: 'Eletrônicos',
 * });
 * 
 * // Criar parcelamento no cartão
 * const installment = await createInstallment({
 *   userId: 1,
 *   description: 'Geladeira',
 *   totalAmount: 3000,
 *   totalInstallments: 10,
 *   startDate: new Date(),
 *   cardId: 1,
 *   category: 'Casa',
 * });
 * 
 * // Simular com juros
 * const simulation = simulateInstallment(10000, 12, 2.5);
 * console.log('Parcela:', simulation.installmentAmount);
 * console.log('Total com juros:', simulation.totalWithInterest);
 * console.log('Juros total:', simulation.totalInterest);
 * 
 * // Pagar parcela
 * await payInstallmentPayment(paymentId);
 * 
 * // Dashboard
 * const dashboard = await getInstallmentsDashboard(1);
 */
