/**
 * Bill Splitting Service
 * Divisão de contas entre amigos/grupos
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { format } from 'date-fns';

interface BillSplit {
  id: number;
  ownerId: number;
  transactionId?: number;
  title: string;
  totalAmount: number;
  description?: string;
  splitDate: Date;
  status: 'pending' | 'partially_paid' | 'completed' | 'cancelled';
  category?: string;
}

interface SplitParticipant {
  id: number;
  splitId: number;
  userId?: number;
  name: string;
  email?: string;
  phone?: string;
  amountOwed: number;
  amountPaid: number;
  status: 'pending' | 'paid' | 'partial';
}

/**
 * Criar divisão de conta
 */
export async function createBillSplit(data: {
  ownerId: number;
  title: string;
  totalAmount: number;
  splitDate: Date;
  participants: Array<{
    userId?: number;
    name: string;
    email?: string;
    phone?: string;
    amount: number;
  }>;
  description?: string;
  category?: string;
  splitMethod?: 'equal' | 'custom';
}): Promise<BillSplit> {
  // Calcular valores se divisão igual
  let participants = data.participants;
  if (data.splitMethod === 'equal') {
    const equalAmount = data.totalAmount / participants.length;
    participants = participants.map(p => ({
      ...p,
      amount: equalAmount,
    }));
  }

  // Validar total
  const participantsTotal = participants.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(participantsTotal - data.totalAmount) > 0.01) {
    throw new Error('A soma dos valores dos participantes não bate com o total');
  }

  // Criar divisão
  const result = await db.execute(sql`
    INSERT INTO bill_splits (
      owner_id, title, total_amount, description, split_date, category
    ) VALUES (
      ${data.ownerId}, ${data.title}, ${data.totalAmount},
      ${data.description || null}, ${format(data.splitDate, 'yyyy-MM-dd')},
      ${data.category || null}
    )
  `);

  const splitId = result.insertId;

  // Adicionar participantes
  for (const participant of participants) {
    await db.execute(sql`
      INSERT INTO split_participants (
        split_id, user_id, name, email, phone, amount_owed
      ) VALUES (
        ${splitId}, ${participant.userId || null}, ${participant.name},
        ${participant.email || null}, ${participant.phone || null},
        ${participant.amount}
      )
    `);
  }

  return await getBillSplit(splitId);
}

/**
 * Buscar divisão por ID
 */
export async function getBillSplit(splitId: number): Promise<any> {
  const result = await db.execute(sql`
    SELECT * FROM v_pending_splits WHERE id = ${splitId}
    UNION
    SELECT 
      bs.id, bs.owner_id, bs.title, bs.total_amount, bs.split_date,
      COUNT(sp.id) as total_participants,
      SUM(sp.amount_owed) as total_owed,
      SUM(sp.amount_paid) as total_paid,
      0 as remaining_amount,
      COUNT(sp.id) as paid_count
    FROM bill_splits bs
    LEFT JOIN split_participants sp ON bs.id = sp.split_id
    WHERE bs.id = ${splitId} AND bs.status = 'completed'
    GROUP BY bs.id
    LIMIT 1
  `);

  return result.rows[0];
}

/**
 * Listar divisões do usuário (como dono)
 */
export async function getMyBillSplits(
  userId: number,
  status?: string
): Promise<BillSplit[]> {
  let query = sql`
    SELECT bs.*, 
      COUNT(sp.id) as participants_count,
      SUM(sp.amount_paid) as total_received
    FROM bill_splits bs
    LEFT JOIN split_participants sp ON bs.id = sp.split_id
    WHERE bs.owner_id = ${userId}
  `;

  if (status) {
    query = sql`${query} AND bs.status = ${status}`;
  }

  query = sql`
    ${query}
    GROUP BY bs.id
    ORDER BY bs.split_date DESC
  `;

  const result = await db.execute(query);
  return result.rows as any[];
}

/**
 * Listar participações (o que devo)
 */
export async function getMyDebts(userId: number): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT * FROM v_my_debts WHERE user_id = ${userId}
  `);

  return result.rows;
}

/**
 * Listar créditos (o que me devem)
 */
export async function getMyCredits(userId: number): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT * FROM v_my_credits WHERE owner_id = ${userId}
  `);

  return result.rows;
}

/**
 * Buscar participantes de uma divisão
 */
export async function getSplitParticipants(
  splitId: number
): Promise<SplitParticipant[]> {
  const result = await db.execute(sql`
    SELECT 
      sp.*,
      u.name as user_name,
      u.email as user_email
    FROM split_participants sp
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE sp.split_id = ${splitId}
    ORDER BY sp.name ASC
  `);

  return result.rows as any[];
}

/**
 * Registrar pagamento
 */
export async function recordSplitPayment(data: {
  participantId: number;
  amount: number;
  paymentMethod?: string;
  paymentDate?: Date;
  notes?: string;
}): Promise<any> {
  // Buscar participante
  const participant = await db.execute(sql`
    SELECT * FROM split_participants WHERE id = ${data.participantId}
  `);

  if (participant.rows.length === 0) {
    throw new Error('Participante não encontrado');
  }

  const p = participant.rows[0];

  // Validar valor
  const remaining = p.amount_owed - p.amount_paid;
  if (data.amount > remaining) {
    throw new Error('Valor maior que o devido');
  }

  // Registrar pagamento
  const result = await db.execute(sql`
    INSERT INTO split_payments (
      participant_id, split_id, amount, payment_method,
      payment_date, notes
    ) VALUES (
      ${data.participantId}, ${p.split_id}, ${data.amount},
      ${data.paymentMethod || null},
      ${format(data.paymentDate || new Date(), 'yyyy-MM-dd')},
      ${data.notes || null}
    )
  `);

  // Trigger vai atualizar status automaticamente
  return { id: result.insertId, success: true };
}

/**
 * Cancelar divisão
 */
export async function cancelBillSplit(splitId: number): Promise<void> {
  await db.execute(sql`
    UPDATE bill_splits
    SET status = 'cancelled',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${splitId}
  `);
}

/**
 * Dashboard de divisões
 */
export async function getSplitsDashboard(userId: number) {
  // Minhas divisões (créditos)
  const creditsResult = await db.execute(sql`
    SELECT 
      COUNT(*) as count,
      SUM(remaining) as total_pending
    FROM v_my_credits
    WHERE owner_id = ${userId}
  `);

  // Minhas dívidas
  const debtsResult = await db.execute(sql`
    SELECT 
      COUNT(*) as count,
      SUM(remaining) as total_pending
    FROM v_my_debts
    WHERE user_id = ${userId}
  `);

  // Atividade recente
  const recentResult = await db.execute(sql`
    SELECT 
      'payment' as type,
      sp.amount as amount,
      sp.payment_date as date,
      bs.title as description
    FROM split_payments sp
    JOIN split_participants spart ON sp.participant_id = spart.id
    JOIN bill_splits bs ON sp.split_id = bs.id
    WHERE spart.user_id = ${userId} OR bs.owner_id = ${userId}
    ORDER BY sp.created_at DESC
    LIMIT 10
  `);

  return {
    credits: creditsResult.rows[0],
    debts: debtsResult.rows[0],
    recentActivity: recentResult.rows,
  };
}

/**
 * Enviar lembrete
 */
export async function sendPaymentReminder(
  participantId: number
): Promise<{ success: boolean; message: string }> {
  // TODO: Integrar com serviço de email/SMS
  const participant = await db.execute(sql`
    SELECT 
      sp.*,
      bs.title,
      bs.owner_id,
      u.name as owner_name
    FROM split_participants sp
    JOIN bill_splits bs ON sp.split_id = bs.id
    JOIN users u ON bs.owner_id = u.id
    WHERE sp.id = ${participantId}
  `);

  if (participant.rows.length === 0) {
    return { success: false, message: 'Participante não encontrado' };
  }

  const p = participant.rows[0];
  const remaining = p.amount_owed - p.amount_paid;

  // Aqui você implementaria o envio real de email/SMS
  console.log(`Lembrete enviado para ${p.name}: R$ ${remaining} da conta "${p.title}"`);

  return {
    success: true,
    message: 'Lembrete enviado com sucesso',
  };
}

/**
 * Dividir conta igualmente (helper)
 */
export function splitEqually(
  totalAmount: number,
  numberOfPeople: number
): {
  amountPerPerson: number;
  remainder: number;
} {
  const amountPerPerson = Math.floor((totalAmount * 100) / numberOfPeople) / 100;
  const remainder = totalAmount - amountPerPerson * numberOfPeople;

  return {
    amountPerPerson,
    remainder,
  };
}

/**
 * Dividir por porcentagens
 */
export function splitByPercentage(
  totalAmount: number,
  percentages: number[]
): number[] {
  // Validar total = 100%
  const total = percentages.reduce((sum, p) => sum + p, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error('As porcentagens devem somar 100%');
  }

  return percentages.map(p => (totalAmount * p) / 100);
}

/**
 * Dividir por shares (partes)
 */
export function splitByShares(
  totalAmount: number,
  shares: number[]
): number[] {
  const totalShares = shares.reduce((sum, s) => sum + s, 0);
  return shares.map(s => (totalAmount * s) / totalShares);
}

/**
 * Exemplo de uso:
 * 
 * // Criar divisão de conta (igual)
 * const split = await createBillSplit({
 *   ownerId: 1,
 *   title: 'Jantar Restaurante',
 *   totalAmount: 240.00,
 *   splitDate: new Date(),
 *   splitMethod: 'equal',
 *   participants: [
 *     { name: 'João', email: 'joao@email.com', amount: 0 },
 *     { name: 'Maria', email: 'maria@email.com', amount: 0 },
 *     { name: 'Pedro', phone: '11999887766', amount: 0 },
 *   ],
 *   category: 'Alimentação',
 * });
 * 
 * // Criar divisão customizada
 * const split = await createBillSplit({
 *   ownerId: 1,
 *   title: 'Aluguel Apartamento',
 *   totalAmount: 2400.00,
 *   splitDate: new Date(),
 *   splitMethod: 'custom',
 *   participants: [
 *     { userId: 2, name: 'João', amount: 1200 },
 *     { userId: 3, name: 'Maria', amount: 800 },
 *     { name: 'Pedro (visitante)', amount: 400 },
 *   ],
 * });
 * 
 * // Registrar pagamento
 * await recordSplitPayment({
 *   participantId: 1,
 *   amount: 80.00,
 *   paymentMethod: 'pix',
 * });
 * 
 * // Ver minhas dívidas
 * const debts = await getMyDebts(1);
 * 
 * // Ver quem me deve
 * const credits = await getMyCredits(1);
 * 
 * // Dashboard
 * const dashboard = await getSplitsDashboard(1);
 * 
 * // Helpers de divisão
 * const equalSplit = splitEqually(240, 4); // R$ 60 cada
 * const percentSplit = splitByPercentage(240, [50, 30, 20]); // 50%, 30%, 20%
 * const sharesSplit = splitByShares(240, [2, 1, 1]); // 2 partes, 1 parte, 1 parte
 */
