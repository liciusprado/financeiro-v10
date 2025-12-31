import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export interface ExpenseByPersonEntry {
  name: string; // e.g. "Lícius" or "Marielly"
  value: number; // in cents
  percentage?: number;
}

interface ExpenseDistributionByPersonChartProps {
  title?: string;
  description?: string;
  data: ExpenseByPersonEntry[];
}

/**
 * Mostra a distribuição das despesas entre as pessoas (Lícius e Marielly). Exibe um gráfico de pizza
 * com dois segmentos (ou mais, caso adicione novos usuários). Deve receber os valores em centavos.
 */
export function ExpenseDistributionByPersonChart({ title = "Despesas por Pessoa", description = "Participação percentual nas despesas", data }: ExpenseDistributionByPersonChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  // Calcular a porcentagem se não fornecido
  const chartData = data.map((d) => ({ ...d, percentage: total ? (d.value / total) * 100 : 0 }));
  const COLORS = [
    "#1d4ed8", // blue-700
    "#be123c", // rose-700
    "#047857", // teal-700 (para possíveis terceiros)
    "#7c3aed", // violet-700
  ];
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
          <p className="font-semibold mb-2">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(payload[0].value)}</p>
          <p className="text-sm font-medium text-primary">{payload[0].payload.percentage?.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-3 justify-center mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm text-muted-foreground">
              {entry.value} ({entry.payload.percentage?.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    );
  };
  if (!data.length || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhuma despesa registrada para exibir
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
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage?.toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}