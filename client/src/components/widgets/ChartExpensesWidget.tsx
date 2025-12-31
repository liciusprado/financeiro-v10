import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ChartExpensesWidgetProps {
  title?: string;
  config?: Record<string, any>;
}

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

export function ChartExpensesWidget({ title, config }: ChartExpensesWidgetProps) {
  const { data: dashboard } = trpc.expense.dashboard.useQuery();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const chartData = dashboard?.currentMonth.despesas
    .reduce((acc: any[], item) => {
      const existing = acc.find((i) => i.name === item.categoria);
      if (existing) {
        existing.value += item.valor;
      } else {
        acc.push({ name: item.categoria, value: item.valor });
      }
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 6) || [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {title || "Despesas por Categoria"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Sem dados
          </div>
        )}
      </CardContent>
    </Card>
  );
}
