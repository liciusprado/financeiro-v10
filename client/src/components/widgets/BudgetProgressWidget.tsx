import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

interface BudgetProgressWidgetProps {
  title?: string;
  config?: Record<string, any>;
}

export function BudgetProgressWidget({ title, config }: BudgetProgressWidgetProps) {
  const { data: dashboard } = trpc.expense.dashboard.useQuery();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const budgetData = dashboard?.currentMonth.despesas
    .reduce((acc: any[], item) => {
      const existing = acc.find((i) => i.category === item.categoria);
      if (existing) {
        existing.spent += item.valor;
      } else {
        acc.push({
          category: item.categoria,
          spent: item.valor,
          budget: item.valor * 1.5, // Placeholder - ideally from budget table
        });
      }
      return acc;
    }, [])
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5) || [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {title || "Progresso do Orçamento"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budgetData.length > 0 ? (
            budgetData.map((item: any, idx: number) => {
              const percentage = Math.min((item.spent / item.budget) * 100, 100);
              const isOverBudget = percentage > 100;

              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                      </span>
                      {isOverBudget && (
                        <Badge variant="destructive" className="text-xs">
                          Excedido
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress
                    value={percentage}
                    className={isOverBudget ? "bg-red-200" : ""}
                  />
                </div>
              );
            })
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum orçamento configurado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
