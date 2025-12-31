import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ExpensesSummaryWidgetProps {
  title?: string;
  config?: Record<string, any>;
}

export function ExpensesSummaryWidget({ title, config }: ExpensesSummaryWidgetProps) {
  const { data: dashboard } = trpc.expense.dashboard.useQuery();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const totalDespesas = dashboard?.currentMonth.totalDespesas || 0;
  const count = dashboard?.currentMonth.despesas.length || 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title || "Despesas"}</CardTitle>
        <ArrowDown className="h-4 w-4 text-red-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-red-600">
          {formatCurrency(totalDespesas)}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {count} {count === 1 ? "despesa" : "despesas"} este mês
        </p>
      </CardContent>
    </Card>
  );
}
