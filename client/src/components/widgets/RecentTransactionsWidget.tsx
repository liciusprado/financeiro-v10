import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowDown, ArrowUp } from "lucide-react";

interface RecentTransactionsWidgetProps {
  title?: string;
  config?: Record<string, any>;
}

export function RecentTransactionsWidget({ title, config }: RecentTransactionsWidgetProps) {
  const { data: dashboard } = trpc.expense.dashboard.useQuery();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const allTransactions = [
    ...(dashboard?.currentMonth.despesas.map((d) => ({ ...d, type: "expense" })) || []),
    ...(dashboard?.currentMonth.receitas.map((r) => ({ ...r, type: "income" })) || []),
  ]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 8);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {title || "Transações Recentes"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {allTransactions.length > 0 ? (
            allTransactions.map((item: any, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                <div className="flex items-center gap-3">
                  {item.type === "expense" ? (
                    <ArrowDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <ArrowUp className="h-4 w-4 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{item.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.categoria} • {formatDate(item.data)}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    item.type === "expense" ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {item.type === "expense" ? "-" : "+"}
                  {formatCurrency(item.valor)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma transação recente
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
