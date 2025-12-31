/**
 * Credit Card Service
 * Gerenciamento completo de cartões de crédito
 */

import { db } from '@/db';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { addMonths, startOfMonth, endOfMonth, format } from 'date-fns';

interface CreditCard {
  id: number;
  userId: number;
  name: string;
  lastDigits: string;
  brand: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other';
  creditLimit: number;
  availableLimit: number;
  closingDay: number;
  dueDay: number;
  isActive: boolean;
  color?: string;
  icon?: string;
  notes?: string;
}

interface CardStatement {
  id: number;
  cardId: number;
  userId: number;
  referenceMonth: Date;
  closingDate: Date;
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
  status: 'open' | 'closed' | 'paid' | 'overdue';
  paidAt?: Date;
}

/**
 * Criar cartão de crédito
 */
export async function createCreditCard(data: {
  userId: number;
  name: string;
  lastDigits: string;
  brand: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  color?: string;
  icon?: string;
  notes?: string;
}): Promise<CreditCard> {
  const result = await db.execute(sql`
    INSERT INTO credit_cards (
      user_id, name, last_digits, brand, credit_limit,
      available_limit, closing_day, due_day, color, icon, notes
    ) VALUES (
      ${data.userId}, ${data.name}, ${data.lastDigits}, ${data.brand},
      ${data.creditLimit}, ${data.creditLimit}, ${data.closingDay},
      ${data.dueDay}, ${data.color || '#3B82F6'}, ${data.icon || 'credit-card'},
      ${data.notes || null}
    )
  `);

  const cardId = result.insertId;

  // Gerar faturas para os próximos 12 meses
  await generateStatementsForCard(cardId, data.userId, data.closingDay, data.dueDay);

  return await getCreditCard(cardId);
}

/**
 * Buscar cartão por ID
 */
export async function getCreditCard(cardId: number): Promise<CreditCard> {
  const result = await db.execute(sql`
    SELECT * FROM credit_cards WHERE id = ${cardId}
  `);

  return result.rows[0] as CreditCard;
}

/**
 * Listar cartões do usuário
 */
export async function getUserCreditCards(userId: number): Promise<CreditCard[]> {
  const result = await db.execute(sql`
    SELECT 
      cc.*,
      (SELECT COUNT(*) FROM card_statements 
       WHERE card_id = cc.id AND status IN ('open', 'closed')) as open_statements
    FROM credit_cards cc
    WHERE cc.user_id = ${userId}
    ORDER BY cc.is_active DESC, cc.name ASC
  `);

  return result.rows as CreditCard[];
}

/**
 * Atualizar cartão
 */
export async function updateCreditCard(
  cardId: number,
  data: Partial<CreditCard>
): Promise<CreditCard> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.creditLimit !== undefined) {
    updates.push('credit_limit = ?');
    values.push(data.creditLimit);
  }
  if (data.closingDay !== undefined) {
    updates.push('closing_day = ?');
    values.push(data.closingDay);
  }
  if (data.dueDay !== undefined) {
    updates.push('due_day = ?');
    values.push(data.dueDay);
  }
  if (data.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(data.isActive);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    values.push(data.color);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    values.push(data.notes);
  }

  if (updates.length > 0) {
    values.push(cardId);
    await db.execute(sql.raw(`
      UPDATE credit_cards 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `), values);
  }

  return await getCreditCard(cardId);
}

/**
 * Deletar cartão
 */
export async function deleteCreditCard(cardId: number): Promise<void> {
  await db.execute(sql`
    DELETE FROM credit_cards WHERE id = ${cardId}
  `);
}

/**
 * Gerar faturas para um cartão
 */
async function generateStatementsForCard(
  cardId: number,
  userId: number,
  closingDay: number,
  dueDay: number,
  months: number = 12
): Promise<void> {
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const referenceMonth = startOfMonth(addMonths(now, i));
    const closingDate = new Date(referenceMonth);
    closingDate.setDate(closingDay);

    const dueDate = new Date(closingDate);
    dueDate.setDate(dueDay);
    if (dueDate <= closingDate) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    // Verificar se fatura já existe
    const existing = await db.execute(sql`
      SELECT id FROM card_statements
      WHERE card_id = ${cardId} 
        AND reference_month = ${format(referenceMonth, 'yyyy-MM-dd')}
    `);

    if (existing.rows.length === 0) {
      await db.execute(sql`
        INSERT INTO card_statements (
          card_id, user_id, reference_month, closing_date, due_date, status
        ) VALUES (
          ${cardId}, ${userId}, ${format(referenceMonth, 'yyyy-MM-dd')},
          ${format(closingDate, 'yyyy-MM-dd')}, ${format(dueDate, 'yyyy-MM-dd')},
          'open'
        )
      `);
    }
  }
}

/**
 * Buscar faturas de um cartão
 */
export async function getCardStatements(
  cardId: number,
  limit: number = 12
): Promise<CardStatement[]> {
  const result = await db.execute(sql`
    SELECT * FROM card_statements
    WHERE card_id = ${cardId}
    ORDER BY reference_month DESC
    LIMIT ${limit}
  `);

  return result.rows as CardStatement[];
}

/**
 * Buscar fatura específica
 */
export async function getStatement(statementId: number): Promise<CardStatement> {
  const result = await db.execute(sql`
    SELECT * FROM card_statements WHERE id = ${statementId}
  `);

  return result.rows[0] as CardStatement;
}

/**
 * Fechar fatura (calcular total)
 */
export async function closeStatement(statementId: number): Promise<CardStatement> {
  // Somar todas as transações da fatura
  const result = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE statement_id = ${statementId}
  `);

  const total = result.rows[0].total;

  await db.execute(sql`
    UPDATE card_statements
    SET total_amount = ${total},
        status = 'closed',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${statementId}
  `);

  return await getStatement(statementId);
}

/**
 * Pagar fatura
 */
export async function payStatement(
  statementId: number,
  amount: number,
  paymentDate?: Date
): Promise<CardStatement> {
  const statement = await getStatement(statementId);
  const newPaidAmount = statement.paidAmount + amount;
  const isPaid = newPaidAmount >= statement.totalAmount;

  await db.execute(sql`
    UPDATE card_statements
    SET paid_amount = ${newPaidAmount},
        status = ${isPaid ? 'paid' : statement.status},
        paid_at = ${isPaid ? (paymentDate || new Date()) : statement.paidAt},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${statementId}
  `);

  return await getStatement(statementId);
}

/**
 * Buscar próximas faturas a vencer
 */
export async function getUpcomingStatements(
  userId: number,
  days: number = 30
): Promise<CardStatement[]> {
  const today = new Date();
  const futureDate = addMonths(today, 1);

  const result = await db.execute(sql`
    SELECT 
      cs.*,
      cc.name as card_name,
      cc.color as card_color,
      DATEDIFF(cs.due_date, CURRENT_DATE) as days_until_due
    FROM card_statements cs
    JOIN credit_cards cc ON cs.card_id = cc.id
    WHERE cs.user_id = ${userId}
      AND cs.status IN ('open', 'closed')
      AND cs.due_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL ${days} DAY)
    ORDER BY cs.due_date ASC
  `);

  return result.rows as any[];
}

/**
 * Calcular limite disponível
 */
export async function getAvailableLimit(cardId: number): Promise<number> {
  const result = await db.execute(sql`
    SELECT available_limit FROM v_card_available_limit
    WHERE card_id = ${cardId}
  `);

  return result.rows[0]?.available_limit || 0;
}

/**
 * Dashboard de cartões
 */
export async function getCardsDashboard(userId: number) {
  // Total de limite
  const limitsResult = await db.execute(sql`
    SELECT 
      SUM(credit_limit) as total_limit,
      SUM(available_limit) as total_available
    FROM credit_cards
    WHERE user_id = ${userId} AND is_active = TRUE
  `);

  // Próximas faturas
  const upcomingStatements = await getUpcomingStatements(userId, 30);

  // Faturas em atraso
  const overdueResult = await db.execute(sql`
    SELECT COUNT(*) as count, SUM(total_amount - paid_amount) as amount
    FROM card_statements
    WHERE user_id = ${userId}
      AND status IN ('open', 'closed')
      AND due_date < CURRENT_DATE
  `);

  return {
    limits: limitsResult.rows[0],
    upcomingStatements,
    overdue: overdueResult.rows[0],
  };
}

/**
 * Marcar faturas vencidas
 */
export async function markOverdueStatements(): Promise<number> {
  const result = await db.execute(sql`
    UPDATE card_statements
    SET status = 'overdue'
    WHERE status IN ('open', 'closed')
      AND due_date < CURRENT_DATE
  `);

  return result.affectedRows || 0;
}

/**
 * Exemplo de uso:
 * 
 * // Criar cartão
 * const card = await createCreditCard({
 *   userId: 1,
 *   name: 'Nubank',
 *   lastDigits: '1234',
 *   brand: 'mastercard',
 *   creditLimit: 5000,
 *   closingDay: 10,
 *   dueDay: 20,
 *   color: '#8A05BE',
 * });
 * 
 * // Listar cartões
 * const cards = await getUserCreditCards(1);
 * 
 * // Buscar faturas
 * const statements = await getCardStatements(card.id);
 * 
 * // Fechar fatura
 * await closeStatement(statementId);
 * 
 * // Pagar fatura
 * await payStatement(statementId, 1500.00);
 * 
 * // Dashboard
 * const dashboard = await getCardsDashboard(1);
 */
