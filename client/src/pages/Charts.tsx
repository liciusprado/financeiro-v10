import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { NetWorthEvolutionChart } from "@/components/NetWorthEvolutionChart";
import { ExpenseDistributionByPersonChart } from "@/components/ExpenseDistributionByPersonChart";
import { MonthlyTrendChart } from "@/components/MonthlyTrendChart";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Charts() {
  const [, setLocation] = useLocation();
  const [months, setMonths] = useState(6);

  const { data: chartData = [], isLoading } = trpc.finance.getChartData.useQuery({ months });

  // Obtenha a soma das despesas por pessoa para os últimos N meses
  const { data: expenseDistributionData = [] } = trpc.finance.getExpenseDistributionByPerson.useQuery({ months });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{payload[0].payload.month}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando gráficos...</div>
      </div>
    );
  }

  // Calcular evolução acumulada do patrimônio. Usa o saldo de cada mês (balance) e acumula.
  const netWorthData = chartData.reduce((acc: any[], curr: any, index: number) => {
    const prevValue = index > 0 ? acc[index - 1]?.netWorth : 0;
    acc.push({ month: curr.month, netWorth: prevValue + (curr.balance ?? 0) });
    return acc;
  }, [] as any[]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Gráficos de Evolução</h1>
            <p className="text-muted-foreground mt-1">Visualize tendências financeiras ao longo do tempo</p>
          </div>
          <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gráfico de Linha - Evolução Geral */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Evolução Financeira</CardTitle>
            <CardDescription>Acompanhe receitas, despesas e saldo ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Receitas"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Despesas"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Saldo"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Comparativo */}
        <Card>
          <CardHeader>
            <CardTitle>Comparativo Mensal</CardTitle>
            <CardDescription>Receitas vs Despesas vs Investimentos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="income" name="Receitas" fill="hsl(var(--chart-1))" />
                <Bar dataKey="expense" name="Despesas" fill="hsl(var(--destructive))" />
                <Bar dataKey="investment" name="Investimentos" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Evolução do Patrimônio acumulado */}
        <div className="mb-6">
          <NetWorthEvolutionChart data={netWorthData} />
        </div>

        {/* Gráfico de Distribuição de Despesas por Pessoa */}
        <div className="mb-6">
          <ExpenseDistributionByPersonChart data={expenseDistributionData as any} />
        </div>

        {/* Gráfico de Tendência Mensal (visualização alternativa) */}
        <div className="mb-6">
          <MonthlyTrendChart data={chartData as any} />
        </div>
      </div>
    </div>
  );
}
