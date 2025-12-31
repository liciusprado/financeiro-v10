/**
 * Loan Service
 * Gerenciamento completo de empréstimos com amortização
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { addMonths, format } from 'date-fns';

interface Loan {
  id: number;
  userId: number;
  name: string;
  type: 'personal' | 'home' | 'car' | 'education' | 'business' | 'other';
  principalAmount: number;
  outstandingBalance: number;
  interestRate: number;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  amortizationType: 'price' | 'sac' | 'american';
  startDate: Date;
  endDate: Date;
  status: 'active' | 'paid_off' | 'defaulted';
  creditor?: string;
}

interface LoanPayment {
  id: number;
  loanId: number;
  installmentNumber: number;
  dueDate: Date;
  paymentAmount: number;
  principalAmount: number;
  interestAmount: number;
  outstandingBalance: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
}

/**
 * Criar empréstimo
 */
export async function createLoan(data: {
  userId: number;
  name: string;
  type: 'personal' | 'home' | 'car' | 'education' | 'business' | 'other';
  principalAmount: number;
  interestRate: number; // Taxa ANUAL
  totalInstallments: number;
  amortizationType: 'price' | 'sac' | 'american';
  startDate: Date;
  creditor?: string;
  notes?: string;
}): Promise<Loan> {
  // Calcular parcela
  const installmentAmount = calculateInstallmentAmount(
    data.principalAmount,
    data.interestRate,
    data.totalInstallments,
    data.amortizationType
  );

  // Calcular data final
  const endDate = addMonths(data.startDate, data.totalInstallments);

  // Criar empréstimo
  const result = await db.execute(sql`
    INSERT INTO loans (
      user_id, name, type, principal_amount, outstanding_balance,
      interest_rate, total_installments, installment_amount,
      amortization_type, start_date, end_date, creditor, notes
    ) VALUES (
      ${data.userId}, ${data.name}, ${data.type}, ${data.principalAmount},
      ${data.principalAmount}, ${data.interestRate}, ${data.totalInstallments},
      ${installmentAmount}, ${data.amortizationType},
      ${format(data.startDate, 'yyyy-MM-dd')}, ${format(endDate, 'yyyy-MM-dd')},
      ${data.creditor || null}, ${data.notes || null}
    )
  `);

  const loanId = result.insertId;

  // Gerar cronograma de pagamentos
  await generateLoanPayments(
    loanId,
    data.userId,
    data.principalAmount,
    data.interestRate,
    data.totalInstallments,
    data.amortizationType,
    data.startDate
  );

  return await getLoan(loanId);
}

/**
 * Calcular valor da parcela
 */
function calculateInstallmentAmount(
  principal: number,
  annualRate: number,
  installments: number,
  type: 'price' | 'sac' | 'american'
): number {
  const monthlyRate = annualRate / 12 / 100;

  switch (type) {
    case 'price':
      // Sistema Price (parcelas fixas)
      if (monthlyRate === 0) return principal / installments;
      return (
        (principal * monthlyRate * Math.pow(1 + monthlyRate, installments)) /
        (Math.pow(1 + monthlyRate, installments) - 1)
      );

    case 'sac':
      // SAC - primeira parcela (maior)
      const amortization = principal / installments;
      return amortization + principal * monthlyRate;

    case 'american':
      // Sistema Americano - só juros mensais
      return principal * monthlyRate;

    default:
      return 0;
  }
}

/**
 * Gerar cronograma de pagamentos
 */
async function generateLoanPayments(
  loanId: number,
  userId: number,
  principal: number,
  annualRate: number,
  totalInstallments: number,
  type: 'price' | 'sac' | 'american',
  startDate: Date
): Promise<void> {
  const monthlyRate = annualRate / 12 / 100;
  let balance = principal;

  for (let i = 1; i <= totalInstallments; i++) {
    const dueDate = addMonths(startDate, i);
    let paymentAmount: number;
    let interestAmount: number;
    let principalAmount: number;

    switch (type) {
      case 'price':
        // Sistema Price
        paymentAmount = calculateInstallmentAmount(principal, annualRate, totalInstallments, 'price');
        interestAmount = balance * monthlyRate;
        principalAmount = paymentAmount - interestAmount;
        balance -= principalAmount;
        break;

      case 'sac':
        // SAC
        principalAmount = principal / totalInstallments;
        interestAmount = balance * monthlyRate;
        paymentAmount = principalAmount + interestAmount;
        balance -= principalAmount;
        break;

      case 'american':
        // Sistema Americano
        if (i < totalInstallments) {
          // Só juros
          paymentAmount = principal * monthlyRate;
          interestAmount = paymentAmount;
          principalAmount = 0;
        } else {
          // Última parcela: juros + principal
          paymentAmount = principal * (1 + monthlyRate);
          interestAmount = principal * monthlyRate;
          principalAmount = principal;
          balance = 0;
        }
        break;

      default:
        continue;
    }

    await db.execute(sql`
      INSERT INTO loan_payments (
        loan_id, user_id, installment_number, due_date,
        payment_amount, principal_amount, interest_amount,
        outstanding_balance
      ) VALUES (
        ${loanId}, ${userId}, ${i}, ${format(dueDate, 'yyyy-MM-dd')},
        ${paymentAmount}, ${principalAmount}, ${interestAmount},
        ${Math.max(0, balance)}
      )
    `);
  }
}

/**
 * Buscar empréstimo por ID
 */
export async function getLoan(loanId: number): Promise<Loan> {
  const result = await db.execute(sql`
    SELECT * FROM v_active_loans WHERE id = ${loanId}
    UNION
    SELECT 
      l.id, l.user_id, l.name, l.type, l.principal_amount,
      l.outstanding_balance, l.interest_rate, l.total_installments,
      l.paid_installments, l.installment_amount, l.amortization_type,
      l.end_date, 0 as total_payments, 0 as total_paid, 0 as overdue_amount
    FROM loans l
    WHERE l.id = ${loanId} AND l.status != 'active'
    LIMIT 1
  `);

  return result.rows[0] as any;
}

/**
 * Listar empréstimos do usuário
 */
export async function getUserLoans(
  userId: number,
  status?: 'active' | 'paid_off' | 'defaulted'
): Promise<Loan[]> {
  let query = sql`
    SELECT * FROM v_active_loans WHERE user_id = ${userId}
  `;

  if (status && status !== 'active') {
    query = sql`
      SELECT 
        l.*,
        COUNT(lp.id) as total_payments,
        SUM(CASE WHEN lp.status = 'paid' THEN lp.payment_amount ELSE 0 END) as total_paid,
        0 as overdue_amount
      FROM loans l
      LEFT JOIN loan_payments lp ON l.id = lp.loan_id
      WHERE l.user_id = ${userId} AND l.status = ${status}
      GROUP BY l.id
    `;
  } else if (!status) {
    query = sql`
      SELECT * FROM v_active_loans WHERE user_id = ${userId}
      UNION
      SELECT 
        l.*,
        COUNT(lp.id) as total_payments,
        SUM(CASE WHEN lp.status = 'paid' THEN lp.payment_amount ELSE 0 END) as total_paid,
        0 as overdue_amount
      FROM loans l
      LEFT JOIN loan_payments lp ON l.id = lp.loan_id
      WHERE l.user_id = ${userId} AND l.status != 'active'
      GROUP BY l.id
    `;
  }

  const result = await db.execute(query);
  return result.rows as any[];
}

/**
 * Buscar cronograma de pagamentos
 */
export async function getLoanPayments(loanId: number): Promise<LoanPayment[]> {
  const result = await db.execute(sql`
    SELECT * FROM loan_payments
    WHERE loan_id = ${loanId}
    ORDER BY installment_number ASC
  `);

  return result.rows as LoanPayment[];
}

/**
 * Pagar parcela
 */
export async function payLoanPayment(
  paymentId: number,
  paidAmount?: number,
  paymentDate?: Date
): Promise<LoanPayment> {
  const payment = await getLoanPayment(paymentId);
  
  await db.execute(sql`
    UPDATE loan_payments
    SET status = 'paid',
        paid_amount = ${paidAmount || payment.paymentAmount},
        paid_at = ${format(paymentDate || new Date(), 'yyyy-MM-dd HH:mm:ss')},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${paymentId}
  `);

  // Trigger vai atualizar saldo do empréstimo automaticamente
  return await getLoanPayment(paymentId);
}

/**
 * Buscar parcela por ID
 */
async function getLoanPayment(paymentId: number): Promise<LoanPayment> {
  const result = await db.execute(sql`
    SELECT * FROM loan_payments WHERE id = ${paymentId}
  `);

  return result.rows[0] as LoanPayment;
}

/**
 * Próximas parcelas a vencer
 */
export async function getUpcomingLoanPayments(
  userId: number,
  days: number = 30
): Promise<LoanPayment[]> {
  const result = await db.execute(sql`
    SELECT * FROM v_upcoming_loan_payments
    WHERE user_id = ${userId}
      AND days_until_due <= ${days}
    LIMIT 10
  `);

  return result.rows as any[];
}

/**
 * Marcar parcelas vencidas
 */
export async function markOverdueLoanPayments(): Promise<number> {
  const result = await db.execute(sql`
    UPDATE loan_payments
    SET status = 'overdue'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE
  `);

  return result.affectedRows || 0;
}

/**
 * Dashboard de empréstimos
 */
export async function getLoansDashboard(userId: number) {
  // Resumo geral
  const summaryResult = await db.execute(sql`
    SELECT 
      COUNT(*) as total_loans,
      SUM(principal_amount) as total_borrowed,
      SUM(outstanding_balance) as total_outstanding,
      SUM(principal_amount - outstanding_balance) as total_paid
    FROM loans
    WHERE user_id = ${userId} AND status = 'active'
  `);

  // Próximas parcelas
  const upcomingPayments = await getUpcomingLoanPayments(userId, 30);

  // Parcelas em atraso
  const overdueResult = await db.execute(sql`
    SELECT 
      COUNT(*) as count,
      SUM(payment_amount) as amount
    FROM loan_payments
    WHERE user_id = ${userId}
      AND status = 'overdue'
  `);

  // Por tipo
  const byTypeResult = await db.execute(sql`
    SELECT 
      type,
      COUNT(*) as count,
      SUM(outstanding_balance) as outstanding
    FROM loans
    WHERE user_id = ${userId} AND status = 'active'
    GROUP BY type
    ORDER BY outstanding DESC
  `);

  // Juros pagos (últimos 12 meses)
  const interestResult = await db.execute(sql`
    SELECT 
      DATE_FORMAT(paid_at, '%Y-%m') as month,
      SUM(interest_amount) as interest_paid
    FROM loan_payments
    WHERE user_id = ${userId}
      AND status = 'paid'
      AND paid_at >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
    GROUP BY month
    ORDER BY month DESC
  `);

  return {
    summary: summaryResult.rows[0],
    upcomingPayments,
    overdue: overdueResult.rows[0],
    byType: byTypeResult.rows,
    interestPaid: interestResult.rows,
  };
}

/**
 * Simular empréstimo (sem criar)
 */
export function simulateLoan(
  principal: number,
  annualRate: number,
  installments: number,
  type: 'price' | 'sac' | 'american'
): {
  installmentAmount: number;
  totalAmount: number;
  totalInterest: number;
  schedule: Array<{
    number: number;
    dueDate: Date;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
} {
  const monthlyRate = annualRate / 12 / 100;
  let balance = principal;
  const schedule = [];
  let totalAmount = 0;

  for (let i = 1; i <= installments; i++) {
    const dueDate = addMonths(new Date(), i);
    let payment: number;
    let interestAmount: number;
    let principalAmount: number;

    switch (type) {
      case 'price':
        payment = calculateInstallmentAmount(principal, annualRate, installments, 'price');
        interestAmount = balance * monthlyRate;
        principalAmount = payment - interestAmount;
        balance -= principalAmount;
        break;

      case 'sac':
        principalAmount = principal / installments;
        interestAmount = balance * monthlyRate;
        payment = principalAmount + interestAmount;
        balance -= principalAmount;
        break;

      case 'american':
        if (i < installments) {
          payment = principal * monthlyRate;
          interestAmount = payment;
          principalAmount = 0;
        } else {
          payment = principal * (1 + monthlyRate);
          interestAmount = principal * monthlyRate;
          principalAmount = principal;
          balance = 0;
        }
        break;

      default:
        continue;
    }

    totalAmount += payment;

    schedule.push({
      number: i,
      dueDate,
      payment,
      principal: principalAmount,
      interest: interestAmount,
      balance: Math.max(0, balance),
    });
  }

  return {
    installmentAmount: type === 'sac' ? schedule[0].payment : schedule[0].payment,
    totalAmount,
    totalInterest: totalAmount - principal,
    schedule,
  };
}

/**
 * Comparar sistemas de amortização
 */
export function compareAmortizationSystems(
  principal: number,
  annualRate: number,
  installments: number
): {
  price: any;
  sac: any;
  american: any;
  comparison: {
    bestForLowerTotal: string;
    bestForLowerInstallment: string;
    bestForStability: string;
  };
} {
  const price = simulateLoan(principal, annualRate, installments, 'price');
  const sac = simulateLoan(principal, annualRate, installments, 'sac');
  const american = simulateLoan(principal, annualRate, installments, 'american');

  return {
    price,
    sac,
    american,
    comparison: {
      bestForLowerTotal: sac.totalInterest < price.totalInterest ? 'SAC' : 'PRICE',
      bestForLowerInstallment: american.schedule[0].payment < Math.min(price.installmentAmount, sac.schedule[0].payment) ? 'AMERICAN' : 'PRICE',
      bestForStability: 'PRICE', // Parcelas fixas
    },
  };
}

/**
 * Exemplo de uso:
 * 
 * // Criar empréstimo
 * const loan = await createLoan({
 *   userId: 1,
 *   name: 'Financiamento Casa',
 *   type: 'home',
 *   principalAmount: 300000,
 *   interestRate: 9.5,
 *   totalInstallments: 360,
 *   amortizationType: 'sac',
 *   startDate: new Date(),
 *   creditor: 'Banco ABC',
 * });
 * 
 * // Simular antes de criar
 * const simulation = simulateLoan(300000, 9.5, 360, 'sac');
 * 
 * // Comparar sistemas
 * const comparison = compareAmortizationSystems(300000, 9.5, 360);
 * 
 * // Pagar parcela
 * await payLoanPayment(paymentId);
 * 
 * // Dashboard
 * const dashboard = await getLoansDashboard(1);
 */
