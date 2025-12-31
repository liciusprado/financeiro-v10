import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * Simple CSV parser. Expects comma-separated values with a header row. Does not support
 * quoted values containing commas. Returns an array of objects keyed by header names.
 */
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const data: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const values = lines[i].split(",");
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].trim() : "";
    });
    data.push(row);
  }
  return data;
}

// Define the shape of parsed rows used for import
interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  category?: string;
  person?: "licius" | "marielly";
}

export default function ImportCSVPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const importMutation = trpc.finance.importCSVEntries.useMutation({
    onSuccess: (data) => {
      toast.success(`Importação concluída: ${data.createdCount} lançamentos adicionados.`);
      setRows([]);
      setFileName("");
    },
    onError: (error) => {
      toast.error(`Erro ao importar: ${error.message}`);
    },
  });

  /**
   * Handles file selection. Reads the file as text, parses it and stores the resulting rows.
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const raw = parseCSV(text);
      // Map raw rows into ParsedRow objects, attempting to parse numeric values and person values.
      const parsed: ParsedRow[] = raw.map((row) => {
        const amountStr = row["amount"] || row["value"] || row["valor"] || "0";
        const amount = parseFloat(amountStr.replace(/\./g, "").replace(/,/g, "."));
        const person = (row["person"] || row["pessoa"] || "").toLowerCase();
        const p = person === "marielly" ? "marielly" : person === "licius" ? "licius" : undefined;
        return {
          date: row["date"] || row["data"] || "",
          description: row["description"] || row["descricao"] || row["descrição"] || "",
          amount: isNaN(amount) ? 0 : amount,
          category: row["category"] || row["categoria"] || undefined,
          person: p,
        };
      });
      setRows(parsed);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao ler o arquivo CSV. Certifique-se de que está no formato correto.");
    }
  };

  /**
   * Envia as linhas parseadas ao servidor para importação. Converte campos se necessário.
   */
  const handleImport = () => {
    if (!rows.length) {
      toast.error("Nenhum dado para importar");
      return;
    }
    // Map for sending to API: convert amount to number and ensure date string
    const payload = rows.map((r) => ({
      date: r.date,
      description: r.description,
      amount: r.amount,
      category: r.category,
      person: r.person,
    }));
    importMutation.mutate({ entries: payload });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Importar Extrato CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="csvFile">Selecione um arquivo CSV</Label>
            <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} />
            {fileName && (
              <p className="text-sm text-muted-foreground">Arquivo selecionado: {fileName}</p>
            )}
          </div>
          {rows.length > 0 && (
            <div className="max-h-64 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Pessoa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>{row.amount}</TableCell>
                      <TableCell>{row.category ?? '-'}</TableCell>
                      <TableCell>{row.person ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Button disabled={importMutation.isPending || rows.length === 0} onClick={handleImport}>
            {importMutation.isPending ? "Importando..." : "Importar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}