import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, FileText, FileSpreadsheet } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function History() {
  const [, setLocation] = useLocation();
  const [itemIdFilter, setItemIdFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Por enquanto, vamos buscar todo o histórico (implementar filtros depois)
  const { data: auditLogs, isLoading } = trpc.finance.getAuditLogs.useQuery({});

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const formatValue = (field: string, value: string) => {
    if (field.includes("Value") || field.includes("value")) {
      return formatCurrency(value);
    }
    return value;
  };

  const handleExportPDF = () => {
    if (!auditLogs || auditLogs.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }

    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(34, 197, 94);
    doc.text("PLANEJAMENTO FINANCEIRO", 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Histórico de Alterações", 105, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 105, 38, { align: "center" });

    // Tabela
    const tableData = auditLogs.map((log: any) => [
      formatDate(log.createdAt),
      log.userName || "Sistema",
      log.action === "create" ? "Criação" : "Atualização",
      `Item #${log.entryId}`,
      log.fieldChanged || "-",
      log.oldValue || "-",
      log.newValue || "-",
    ]);

    autoTable(doc, {
      head: [["Data/Hora", "Usuário", "Ação", "Item", "Campo", "Anterior", "Novo"]],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 45 },
    });

    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    doc.save(`historico-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleExportCSV = () => {
    if (!auditLogs || auditLogs.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }

    const headers = ["Data/Hora", "Usuário", "Ação", "Item", "Campo", "Valor Anterior", "Valor Novo"];
    const rows = auditLogs.map((log: any) => [
      formatDate(log.createdAt),
      log.userName || "Sistema",
      log.action === "create" ? "Criação" : "Atualização",
      `Item #${log.entryId}`,
      log.fieldChanged || "-",
      log.oldValue || "-",
      log.newValue || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(",")),
    ].join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historico-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Histórico de Alterações</h1>
        </div>
        <p className="text-muted-foreground">Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Histórico de Alterações</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre o histórico por item ou período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="itemId">ID do Item</Label>
              <Input
                id="itemId"
                type="number"
                placeholder="Ex: 123"
                value={itemIdFilter}
                onChange={(e) => setItemIdFilter(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setItemIdFilter("");
                setStartDate("");
                setEndDate("");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Exportação */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
        <Button variant="outline" onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Auditoria</CardTitle>
          <CardDescription>
            {auditLogs?.length || 0} {auditLogs?.length === 1 ? "alteração registrada" : "alterações registradas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!auditLogs || auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma alteração registrada ainda</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Valor Anterior</TableHead>
                    <TableHead>Valor Novo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                      <TableCell>{log.userName || "Sistema"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            log.action === "create"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {log.action === "create" ? "Criação" : "Atualização"}
                        </span>
                      </TableCell>
                      <TableCell>Item #{log.entryId}</TableCell>
                      <TableCell className="font-mono text-sm">{log.fieldChanged || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.oldValue ? formatValue(log.fieldChanged || "", log.oldValue) : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.newValue ? formatValue(log.fieldChanged || "", log.newValue) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
