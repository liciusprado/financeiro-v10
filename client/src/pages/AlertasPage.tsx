import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AlertasPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [valuesHidden, setValuesHidden] = useState(false);

  const { data: categories = [] } = trpc.finance.listCategories.useQuery();
  const { data: items = [] } = trpc.finance.listItems.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });
  const { data: entries = [] } = trpc.finance.getMonthEntries.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const monthName = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(selectedYear, selectedMonth - 1));

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Calcular alertas de orçamento
  const alerts = useMemo(() => {
    const alertList: Array<{
      item: string;
      planned: number;
      actual: number;
      category: string;
      categoryType: string;
      percentage: number;
      severity: "warning" | "danger" | "critical";
    }> = [];

    categories.forEach((category) => {
      const catItems = items.filter((i) => i.categoryId === category.id);
      catItems.forEach((item) => {
        const itemEntries = entries.filter((e) => e.itemId === item.id);
        const totalPlanned = itemEntries.reduce((sum, e) => sum + (e.plannedValue || 0), 0);
        const totalActual = itemEntries.reduce((sum, e) => sum + (e.actualValue || 0), 0);

        if (totalPlanned > 0) {
          const percentage = (totalActual / totalPlanned) * 100;

          // Alertas para despesas
          if (category.type === "expense" && totalActual > totalPlanned) {
            let severity: "warning" | "danger" | "critical" = "warning";
            if (percentage > 150) severity = "critical";
            else if (percentage > 120) severity = "danger";

            alertList.push({
              item: item.name,
              planned: totalPlanned,
              actual: totalActual,
              category: category.name,
              categoryType: category.type,
              percentage,
              severity,
            });
          }

          // Alertas para receitas abaixo do esperado
          if (category.type === "income" && totalActual < totalPlanned * 0.9) {
            alertList.push({
              item: item.name,
              planned: totalPlanned,
              actual: totalActual,
              category: category.name,
              categoryType: category.type,
              percentage,
              severity: totalActual < totalPlanned * 0.7 ? "critical" : "warning",
            });
          }
        }
      });
    });

    // Ordenar por severidade e valor excedente
    return alertList.sort((a, b) => {
      const severityOrder = { critical: 3, danger: 2, warning: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.percentage - a.percentage;
    });
  }, [categories, items, entries]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 border-red-500/50 text-red-600";
      case "danger":
        return "bg-orange-500/10 border-orange-500/50 text-orange-600";
      default:
        return "bg-yellow-500/10 border-yellow-500/50 text-yellow-600";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      case "danger":
        return <Badge className="bg-orange-500">Atenção</Badge>;
      default:
        return <Badge className="bg-yellow-500">Aviso</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Verificar Alertas</h1>
                <p className="text-sm text-muted-foreground">
                  Itens com gastos acima do orçamento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setValuesHidden(!valuesHidden)}
              >
                {valuesHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[180px] text-center">
                  <p className="text-sm font-medium capitalize">{monthName}</p>
                </div>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Resumo */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="bg-red-500/10 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-600">Alertas Críticos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {alerts.filter((a) => a.severity === "critical").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-orange-600">Atenção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {alerts.filter((a) => a.severity === "danger").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-yellow-600">Avisos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {alerts.filter((a) => a.severity === "warning").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Alertas */}
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tudo sob controle!</h3>
              <p className="text-muted-foreground">
                Nenhum alerta de orçamento neste mês
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, idx) => (
              <Card
                key={idx}
                className={`${getSeverityColor(alert.severity)} border-l-4`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{alert.item}</CardTitle>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <CardDescription>{alert.category}</CardDescription>
                    </div>
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Orçamento Planejado
                      </p>
                      <p className="text-xl font-bold">
                        {valuesHidden ? "•••" : formatCurrency(alert.planned)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Gasto Real</p>
                      <p className="text-xl font-bold text-red-600">
                        {valuesHidden ? "•••" : formatCurrency(alert.actual)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {alert.categoryType === "expense" ? "Excedente" : "Déficit"}
                      </p>
                      <p className="text-xl font-bold">
                        {valuesHidden
                          ? "•••"
                          : formatCurrency(Math.abs(alert.actual - alert.planned))}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-xs">{alert.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
