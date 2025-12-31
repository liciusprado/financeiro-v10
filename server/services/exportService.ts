/**
 * Export Service
 * Exportação de relatórios em Excel e PDF
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Exportar transações para Excel
 */
export async function exportTransactionsToExcel(
  userId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    type?: 'income' | 'expense';
    category?: string;
  }
): Promise<Buffer> {
  // Buscar transações
  let query = sql`
    SELECT 
      id,
      description,
      amount,
      type,
      category,
      date,
      payment_method,
      notes
    FROM transactions
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
  `;

  if (filters?.startDate) {
    query = sql`${query} AND date >= ${format(filters.startDate, 'yyyy-MM-dd')}`;
  }
  if (filters?.endDate) {
    query = sql`${query} AND date <= ${format(filters.endDate, 'yyyy-MM-dd')}`;
  }
  if (filters?.type) {
    query = sql`${query} AND type = ${filters.type}`;
  }
  if (filters?.category) {
    query = sql`${query} AND category = ${filters.category}`;
  }

  query = sql`${query} ORDER BY date DESC`;

  const result = await db.execute(query);
  const transactions = result.rows;

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Transações
  const wsData = [
    ['ID', 'Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Forma Pagamento', 'Observações'],
    ...transactions.map((t: any) => [
      t.id,
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.description,
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.category || '-',
      t.amount,
      t.payment_method || '-',
      t.notes || '-',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Ajustar largura das colunas
  ws['!cols'] = [
    { wch: 8 },  // ID
    { wch: 12 }, // Data
    { wch: 30 }, // Descrição
    { wch: 10 }, // Tipo
    { wch: 20 }, // Categoria
    { wch: 12 }, // Valor
    { wch: 15 }, // Forma Pagamento
    { wch: 30 }, // Observações
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Transações');

  // Sheet 2: Resumo
  const totalIncome = transactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const summaryData = [
    ['Resumo Financeiro'],
    [''],
    ['Total de Receitas', totalIncome],
    ['Total de Despesas', totalExpense],
    ['Saldo', totalIncome - totalExpense],
    [''],
    ['Total de Transações', transactions.length],
    ['Período', `${filters?.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'Início'} até ${filters?.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'Hoje'}`],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  // Sheet 3: Por Categoria
  const byCategory = new Map<string, { income: number; expense: number }>();

  transactions.forEach((t: any) => {
    const category = t.category || 'Sem Categoria';
    if (!byCategory.has(category)) {
      byCategory.set(category, { income: 0, expense: 0 });
    }
    const cat = byCategory.get(category)!;
    if (t.type === 'income') {
      cat.income += t.amount;
    } else {
      cat.expense += t.amount;
    }
  });

  const categoryData = [
    ['Categoria', 'Receitas', 'Despesas', 'Saldo'],
    ...Array.from(byCategory.entries()).map(([cat, values]) => [
      cat,
      values.income,
      values.expense,
      values.income - values.expense,
    ]),
  ];

  const wsCategory = XLSX.utils.aoa_to_sheet(categoryData);
  XLSX.utils.book_append_sheet(wb, wsCategory, 'Por Categoria');

  // Gerar buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Exportar para PDF
 */
export async function exportTransactionsToPDF(
  userId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    type?: 'income' | 'expense';
    category?: string;
  }
): Promise<Buffer> {
  // Buscar dados
  let query = sql`
    SELECT 
      id,
      description,
      amount,
      type,
      category,
      date
    FROM transactions
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
  `;

  if (filters?.startDate) {
    query = sql`${query} AND date >= ${format(filters.startDate, 'yyyy-MM-dd')}`;
  }
  if (filters?.endDate) {
    query = sql`${query} AND date <= ${format(filters.endDate, 'yyyy-MM-dd')}`;
  }
  if (filters?.type) {
    query = sql`${query} AND type = ${filters.type}`;
  }
  if (filters?.category) {
    query = sql`${query} AND category = ${filters.category}`;
  }

  query = sql`${query} ORDER BY date DESC`;

  const result = await db.execute(query);
  const transactions = result.rows;

  // Criar PDF
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Relatório Financeiro', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(
      `Período: ${filters?.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'Início'} até ${filters?.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'Hoje'}`,
      { align: 'center' }
    );
    doc.moveDown(2);

    // Resumo
    const totalIncome = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    doc.fontSize(14).text('Resumo', { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Total de Receitas: R$ ${totalIncome.toFixed(2)}`);
    doc.text(`Total de Despesas: R$ ${totalExpense.toFixed(2)}`);
    doc.text(`Saldo: R$ ${(totalIncome - totalExpense).toFixed(2)}`);
    doc.moveDown(2);

    // Transações
    doc.fontSize(14).text('Transações', { underline: true });
    doc.moveDown();

    doc.fontSize(9);
    transactions.forEach((t: any, index: number) => {
      if (index > 0 && index % 20 === 0) {
        doc.addPage();
      }

      const dateStr = format(new Date(t.date), 'dd/MM/yyyy');
      const typeStr = t.type === 'income' ? 'Receita' : 'Despesa';
      const amountStr = `R$ ${t.amount.toFixed(2)}`;

      doc.text(
        `${dateStr} | ${t.description} | ${typeStr} | ${t.category || '-'} | ${amountStr}`
      );
    });

    // Footer
    doc.fontSize(8).text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
  });
}

/**
 * Exportar dashboard completo
 */
export async function exportFullDashboard(userId: number): Promise<Buffer> {
  // Buscar todos os dados
  const [transactions, goals, budgets, cards] = await Promise.all([
    db.execute(sql`
      SELECT * FROM transactions
      WHERE user_id = ${userId}
        AND deleted_at IS NULL
      ORDER BY date DESC
    `),
    db.execute(sql`
      SELECT * FROM goals WHERE user_id = ${userId}
    `),
    db.execute(sql`
      SELECT * FROM budgets WHERE user_id = ${userId}
    `),
    db.execute(sql`
      SELECT * FROM credit_cards WHERE user_id = ${userId}
    `),
  ]);

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Sheet: Transações
  const wsTransactions = XLSX.utils.json_to_sheet(transactions.rows);
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transações');

  // Sheet: Metas
  const wsGoals = XLSX.utils.json_to_sheet(goals.rows);
  XLSX.utils.book_append_sheet(wb, wsGoals, 'Metas');

  // Sheet: Orçamentos
  const wsBudgets = XLSX.utils.json_to_sheet(budgets.rows);
  XLSX.utils.book_append_sheet(wb, wsBudgets, 'Orçamentos');

  // Sheet: Cartões
  const wsCards = XLSX.utils.json_to_sheet(cards.rows);
  XLSX.utils.book_append_sheet(wb, wsCards, 'Cartões');

  // Gerar buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Exportar relatório customizado
 */
export async function exportCustomReport(
  userId: number,
  config: {
    title: string;
    sections: Array<{
      type: 'transactions' | 'goals' | 'budgets' | 'summary';
      filters?: any;
    }>;
    format: 'xlsx' | 'pdf';
  }
): Promise<Buffer> {
  if (config.format === 'xlsx') {
    const wb = XLSX.utils.book_new();

    for (const section of config.sections) {
      let data: any[] = [];

      switch (section.type) {
        case 'transactions':
          const txResult = await db.execute(sql`
            SELECT * FROM transactions
            WHERE user_id = ${userId}
              AND deleted_at IS NULL
          `);
          data = txResult.rows;
          break;

        case 'goals':
          const goalsResult = await db.execute(sql`
            SELECT * FROM goals WHERE user_id = ${userId}
          `);
          data = goalsResult.rows;
          break;

        case 'budgets':
          const budgetsResult = await db.execute(sql`
            SELECT * FROM budgets WHERE user_id = ${userId}
          `);
          data = budgetsResult.rows;
          break;
      }

      if (data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, section.type);
      }
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  } else {
    // PDF customizado
    return exportTransactionsToPDF(userId);
  }
}

/**
 * Exemplo de uso:
 * 
 * // Exportar transações para Excel
 * const excelBuffer = await exportTransactionsToExcel(1, {
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-12-31'),
 *   type: 'expense',
 * });
 * 
 * // Salvar arquivo
 * fs.writeFileSync('transacoes.xlsx', excelBuffer);
 * 
 * // Exportar para PDF
 * const pdfBuffer = await exportTransactionsToPDF(1, {
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-12-31'),
 * });
 * 
 * fs.writeFileSync('relatorio.pdf', pdfBuffer);
 * 
 * // Dashboard completo
 * const dashboardBuffer = await exportFullDashboard(1);
 * 
 * // Relatório customizado
 * const customBuffer = await exportCustomReport(1, {
 *   title: 'Relatório Anual',
 *   sections: [
 *     { type: 'transactions' },
 *     { type: 'goals' },
 *     { type: 'budgets' },
 *   ],
 *   format: 'xlsx',
 * });
 */
