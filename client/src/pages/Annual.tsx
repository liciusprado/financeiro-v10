import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Annual() {
  const [, setLocation] = useLocation();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: annualData, isLoading } = trpc.finance.getAnnualData.useQuery({ year: selectedYear });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const calculateProgress = (actual: number, planned: number) => {
    if (planned === 0) return 0;
    return Math.min((actual / planned) * 100, 100);
  };

  if (isLoading || !annualData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando dados anuais...</div>
      </div>
    );
  }

  const { monthlyData, totals, averages } = annualData;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Visão Anual</h1>
            <p className="text-muted-foreground mt-1">Acompanhe metas e progresso ao longo do ano</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSelectedYear(selectedYear - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[100px] text-center font-semibold">{selectedYear}</div>
            <Button variant="outline" size="icon" onClick={() => setSelectedYear(selectedYear + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cards de Resumo Anual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Receitas Anuais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Meta:</span>
                  <span className="font-semibold">{formatCurrency(totals.plannedIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Real:</span>
                  <span className="text-xl font-bold text-emerald-600">{formatCurrency(totals.actualIncome)}</span>
                </div>
                <Progress
                  value={calculateProgress(totals.actualIncome, totals.plannedIncome)}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {calculateProgress(totals.actualIncome, totals.plannedIncome).toFixed(1)}% da meta
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Despesas Anuais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Meta:</span>
                  <span className="font-semibold">{formatCurrency(totals.plannedExpense)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Real:</span>
                  <span className="text-xl font-bold text-red-600">{formatCurrency(totals.actualExpense)}</span>
                </div>
                <Progress
                  value={calculateProgress(totals.actualExpense, totals.plannedExpense)}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {calculateProgress(totals.actualExpense, totals.plannedExpense).toFixed(1)}% da meta
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Investimentos Anuais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Meta:</span>
                  <span className="font-semibold">{formatCurrency(totals.plannedInvestment)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Real:</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(totals.actualInvestment)}</span>
                </div>
                <Progress
                  value={calculateProgress(totals.actualInvestment, totals.plannedInvestment)}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {calculateProgress(totals.actualInvestment, totals.plannedInvestment).toFixed(1)}% da meta
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Médias Mensais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Médias Mensais</CardTitle>
            <CardDescription>Valores médios baseados nos dados do ano</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Média</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(averages.income)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Despesa Média</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(averages.expense)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Investimento Médio</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(averages.investment)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento Mensal</CardTitle>
            <CardDescription>Comparativo de metas vs real por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Receita (Meta)</TableHead>
                    <TableHead className="text-right">Receita (Real)</TableHead>
                    <TableHead className="text-right">Despesa (Meta)</TableHead>
                    <TableHead className="text-right">Despesa (Real)</TableHead>
                    <TableHead className="text-right">Saldo (Real)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((month) => (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium capitalize">{month.monthName}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(month.plannedIncome)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {formatCurrency(month.actualIncome)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(month.plannedExpense)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(month.actualExpense)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          month.actualBalance >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(month.actualBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
