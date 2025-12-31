import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface NetWorthPoint {
  month: string;
  netWorth: number; // in cents
}

interface NetWorthEvolutionChartProps {
  title?: string;
  description?: string;
  data: NetWorthPoint[];
}

/**
 * Exibe a evolução acumulada do patrimônio (saldo acumulado) ao longo dos meses.
 * Recebe um array de pontos com campos `month` e `netWorth` (em centavos).
 */
export function NetWorthEvolutionChart({ title = "Evolução do Patrimônio", description = "Saldo acumulado ao longo do tempo", data }: NetWorthEvolutionChartProps) {
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
          <p className="text-sm" style={{ color: payload[0].color }}>
            Patrimônio: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
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
            <YAxis
              className="text-xs"
              tickFormatter={(value) => formatCurrency(value as number)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="netWorth"
              name="Patrimônio"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}