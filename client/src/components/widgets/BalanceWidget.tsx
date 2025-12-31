import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface BalanceWidgetProps {
  title?: string;
  config?: Record<string, any>;
}

export function BalanceWidget({ title, config }: BalanceWidgetProps) {
  const { data: dashboard } = trpc.expense.dashboard.useQuery();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const balance = dashboard
    ? dashboard.currentMonth.totalReceitas - dashboard.currentMonth.totalDespesas
    : 0;

  const isPositive = balance >= 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title || "Saldo"}</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {formatCurrency(balance)}
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
          <span>Este mês</span>
        </div>
      </CardContent>
    </Card>
  );
}
