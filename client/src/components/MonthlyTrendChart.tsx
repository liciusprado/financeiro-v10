import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export interface MonthlyTrendPoint {
  month: string;
  income: number; // in cents
  expense: number; // in cents
  investment: number; // in cents
  balance?: number; // optional net income = income - expense - investment
}

interface MonthlyTrendChartProps {
  title?: string;
  description?: string;
  data: MonthlyTrendPoint[];
}

/**
 * Gráfico de tendência mensal que exibe receitas, despesas, investimentos e saldo (opcional) para cada mês.
 * Usa linhas monotônicas para demonstrar a evolução dos valores.
 */
export function MonthlyTrendChart({ title = "Tendência Mensal", description = "Evolução das receitas, despesas e investimentos", data }: MonthlyTrendChartProps) {
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
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhum dado disponível para exibir
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" tickFormatter={(value) => formatCurrency(value as number)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="income" name="Receitas" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="expense" name="Despesas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="investment" name="Investimentos" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} />
            {data.some((d) => d.balance !== undefined) && (
              <Line type="monotone" dataKey="balance" name="Saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}