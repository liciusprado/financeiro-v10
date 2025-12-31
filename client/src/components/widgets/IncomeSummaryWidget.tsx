import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface IncomeSummaryWidgetProps {
  title?: string;
  config?: Record<string, any>;
}

export function IncomeSummaryWidget({ title, config }: IncomeSummaryWidgetProps) {
  const { data: dashboard } = trpc.expense.dashboard.useQuery();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const totalReceitas = dashboard?.currentMonth.totalReceitas || 0;
  const count = dashboard?.currentMonth.receitas.length || 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title || "Receitas"}</CardTitle>
        <ArrowUp className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-green-600">
          {formatCurrency(totalReceitas)}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {count} {count === 1 ? "receita" : "receitas"} este mês
        </p>
      </CardContent>
    </Card>
  );
}
