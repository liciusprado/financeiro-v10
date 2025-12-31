import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Comparative() {
  const [, setLocation] = useLocation();
  const [monthsToCompare] = useState(6);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const { data, isLoading } = trpc.finance.getComparativeData.useQuery({
    currentMonth,
    currentYear,
    monthsToCompare,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatMonth = (month: number, year: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 10) return "text-red-500 font-bold";
    if (change > 0) return "text-orange-500";
    if (change < -10) return "text-green-500 font-bold";
    if (change < 0) return "text-green-600";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Dashboard Comparativo</h1>
        </div>
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  const chartData = data.months.map((m) => ({
    name: formatMonth(m.month, m.year),
    Receitas: m.income,
    Despesas: m.expense,
    Investimentos: m.investment,
    Saldo: m.balance,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Dashboard Comparativo</h1>
      </div>

      {/* Cards de Variação */}
      {data.comparisons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Variação de Receitas</CardTitle>
              <CardDescription>Mês atual vs anterior</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getChangeIcon(data.comparisons[0].incomeChange)}
                <span className={`text-2xl font-bold ${getChangeColor(data.comparisons[0].incomeChange)}`}>
                  {data.comparisons[0].incomeChange.toFixed(1)}%
                </span>
              </div>
              {Math.abs(data.comparisons[0].incomeChange) > 10 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Variação significativa detectada
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Variação de Despesas</CardTitle>
              <CardDescription>Mês atual vs anterior</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getChangeIcon(data.comparisons[0].expenseChange)}
                <span className={`text-2xl font-bold ${getChangeColor(data.comparisons[0].expenseChange)}`}>
                  {data.comparisons[0].expenseChange.toFixed(1)}%
                </span>
              </div>
              {Math.abs(data.comparisons[0].expenseChange) > 10 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Variação significativa detectada
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Variação de Investimentos</CardTitle>
              <CardDescription>Mês atual vs anterior</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getChangeIcon(data.comparisons[0].investmentChange)}
                <span className={`text-2xl font-bold ${getChangeColor(data.comparisons[0].investmentChange)}`}>
                  {data.comparisons[0].investmentChange.toFixed(1)}%
                </span>
              </div>
              {Math.abs(data.comparisons[0].investmentChange) > 10 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Variação significativa detectada
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico Comparativo */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação dos Últimos {monthsToCompare} Meses</CardTitle>
          <CardDescription>Evolução de receitas, despesas e investimentos</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar dataKey="Receitas" fill="hsl(var(--chart-1))" />
              <Bar dataKey="Despesas" fill="hsl(var(--chart-2))" />
              <Bar dataKey="Investimentos" fill="hsl(var(--chart-3))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela de Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Mês</th>
                  <th className="text-right p-2">Receitas</th>
                  <th className="text-right p-2">Despesas</th>
                  <th className="text-right p-2">Investimentos</th>
                  <th className="text-right p-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">{formatMonth(m.month, m.year)}</td>
                    <td className="text-right p-2 text-green-600 font-medium">
                      {formatCurrency(m.income)}
                    </td>
                    <td className="text-right p-2 text-red-600 font-medium">
                      {formatCurrency(m.expense)}
                    </td>
                    <td className="text-right p-2 text-blue-600 font-medium">
                      {formatCurrency(m.investment)}
                    </td>
                    <td className={`text-right p-2 font-bold ${m.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(m.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
