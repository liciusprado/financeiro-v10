import * as XLSX from "xlsx";

export interface ExportData {
  categories: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  items: Array<{
    id: number;
    categoryId: number;
    name: string;
    customCategory?: string | null;
  }>;
  entries: Array<{
    itemId: number;
    person: string;
    plannedValue: number;
    actualValue: number;
  }>;
  month: number;
  year: number;
}

export function exportToExcel(data: ExportData) {
  const { categories, items, entries, month, year } = data;

  // Preparar dados para a planilha
  const rows: any[] = [];

  // Header
  rows.push([
    "Categoria",
    "Item",
    "Categoria Customizada",
    "Meta (Lícius)",
    "Real (Lícius)",
    "Meta (Marielly)",
    "Real (Marielly)",
    "Total (Real)",
  ]);

  // Agrupar por categoria
  categories.forEach((category) => {
    const categoryItems = items.filter((item) => item.categoryId === category.id);

    categoryItems.forEach((item) => {
      const liciusEntry = entries.find((e) => e.itemId === item.id && e.person === "licius");
      const mariellyEntry = entries.find((e) => e.itemId === item.id && e.person === "marielly");

      const liciusPlanned = (liciusEntry?.plannedValue || 0) / 100;
      const liciusActual = (liciusEntry?.actualValue || 0) / 100;
      const mariellyPlanned = (mariellyEntry?.plannedValue || 0) / 100;
      const mariellyActual = (mariellyEntry?.actualValue || 0) / 100;
      const total = liciusActual + mariellyActual;

      rows.push([
        category.name,
        item.name,
        item.customCategory || "-",
        liciusPlanned,
        liciusActual,
        mariellyPlanned,
        mariellyActual,
        total,
      ]);
    });
  });

  // Criar workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Formatar colunas de valores como moeda
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let R = 1; R <= range.e.r; ++R) {
    for (let C = 3; C <= 7; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[cellAddress]) {
        ws[cellAddress].z = "R$ #,##0.00";
      }
    }
  }

  // Ajustar largura das colunas
  ws["!cols"] = [
    { wch: 25 }, // Categoria
    { wch: 30 }, // Item
    { wch: 20 }, // Categoria Customizada
    { wch: 15 }, // Meta (Lícius)
    { wch: 15 }, // Real (Lícius)
    { wch: 15 }, // Meta (Marielly)
    { wch: 15 }, // Real (Marielly)
    { wch: 15 }, // Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Planejamento Financeiro");

  // Download
  const monthName = new Date(year, month - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  XLSX.writeFile(wb, `Planejamento_Financeiro_${monthName}.xlsx`);
}

export function exportToPDF(data: ExportData) {
  const { categories, items, entries, month, year } = data;

  // Criar conteúdo HTML para impressão
  const monthName = new Date(year, month - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Planejamento Financeiro - ${monthName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        h1 {
          text-align: center;
          color: #333;
        }
        h2 {
          color: #059669;
          margin-top: 30px;
          border-bottom: 2px solid #059669;
          padding-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        .currency {
          text-align: right;
        }
        .total {
          font-weight: bold;
          background-color: #f9fafb;
        }
        @media print {
          body {
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <h1>Planejamento Financeiro Familiar</h1>
      <h2>${monthName}</h2>
  `;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  // Agrupar por categoria
  categories.forEach((category) => {
    const categoryItems = items.filter((item) => item.categoryId === category.id);

    if (categoryItems.length === 0) return;

    html += `
      <h2>${category.name}</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Categoria</th>
            <th class="currency">Meta (Lícius)</th>
            <th class="currency">Real (Lícius)</th>
            <th class="currency">Meta (Marielly)</th>
            <th class="currency">Real (Marielly)</th>
            <th class="currency">Total (Real)</th>
          </tr>
        </thead>
        <tbody>
    `;

    categoryItems.forEach((item) => {
      const liciusEntry = entries.find((e) => e.itemId === item.id && e.person === "licius");
      const mariellyEntry = entries.find((e) => e.itemId === item.id && e.person === "marielly");

      const liciusPlanned = liciusEntry?.plannedValue || 0;
      const liciusActual = liciusEntry?.actualValue || 0;
      const mariellyPlanned = mariellyEntry?.plannedValue || 0;
      const mariellyActual = mariellyEntry?.actualValue || 0;
      const total = liciusActual + mariellyActual;

      html += `
        <tr>
          <td>${item.name}</td>
          <td>${item.customCategory || "-"}</td>
          <td class="currency">${formatCurrency(liciusPlanned)}</td>
          <td class="currency">${formatCurrency(liciusActual)}</td>
          <td class="currency">${formatCurrency(mariellyPlanned)}</td>
          <td class="currency">${formatCurrency(mariellyActual)}</td>
          <td class="currency total">${formatCurrency(total)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
  });

  html += `
    </body>
    </html>
  `;

  // Abrir em nova janela para impressão
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
