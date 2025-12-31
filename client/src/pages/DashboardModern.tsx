import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { ExpensePieChart } from "@/components/ExpensePieChart";
import { useSelectedUser } from "@/contexts/SelectedUserContext";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart } from "recharts";

export default function DashboardModern() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [valuesHidden, setValuesHidden] = useState(false);
  const { selectedUser } = useSelectedUser();

  // Queries
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

  // Calcular resumo
  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalInvestment = 0;

    entries.forEach((entry) => {
      const item = items.find((i) => i.id === entry.itemId);
      if (!item) return;
      const category = categories.find((c) => c.id === item.categoryId);
      if (!category) return;

      const value = entry.actualValue || 0;
      if (category.type === "income") totalIncome += value;
      else if (category.type === "expense") totalExpense += value;
      else if (category.type === "investment") totalInvestment += value;
    });

    const balance = totalIncome - totalExpense - totalInvestment;

    return { totalIncome, totalExpense, totalInvestment, balance };
  }, [entries, items, categories]);

  // Dados para gráfico de pizza
  const expensePieData = useMemo(() => {
    const expenseCategories = categories.filter((c) => c.type === "expense");
    const total = expenseCategories.reduce((sum, cat) => {
      const catItems = items.filter((i) => i.categoryId === cat.id);
      const catTotal = catItems.reduce((itemSum, item) => {
        const itemEntries = entries.filter((e) => e.itemId === item.id);
        return itemSum + itemEntries.reduce((entrySum, e) => entrySum + (e.actualValue || 0), 0);
      }, 0);
      return sum + catTotal;
    }, 0);

    if (total === 0) return [];

    return expenseCategories
      .map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        const catTotal = catItems.reduce((itemSum, item) => {
          const itemEntries = entries.filter((e) => e.itemId === item.id);
          return itemSum + itemEntries.reduce((entrySum, e) => entrySum + (e.actualValue || 0), 0);
        }, 0);
        return {
          name: cat.name,
          value: catTotal,
          percentage: (catTotal / total) * 100,
        };
      })
      .filter((d) => d.value > 0);
  }, [categories, items, entries]);

  // Top 5 despesas
  const topExpenses = useMemo(() => {
    const expenseItems = items.filter((item) => {
      const category = categories.find((c) => c.id === item.categoryId);
      return category?.type === "expense";
    });

    return expenseItems
      .map((item) => {
        const itemEntries = entries.filter((e) => e.itemId === item.id);
        const total = itemEntries.reduce((sum, e) => sum + (e.actualValue || 0), 0);
        const category = categories.find((c) => c.id === item.categoryId);
        return {
          name: item.name,
          value: total,
          category: category?.name || "",
        };
      })
      .filter((i) => i.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [items, entries, categories]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Controle suas finanças mensais
              </p>
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
        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Saldo */}
          <Card className={summary.balance >= 0 ? "bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20" : "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20"}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
              <div className={`p-2 rounded-full ${summary.balance >= 0 ? "bg-blue-500/20" : "bg-red-500/20"}`}>
                <Wallet className={`h-4 w-4 ${summary.balance >= 0 ? "text-blue-600" : "text-red-600"}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${summary.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {valuesHidden ? "•••" : formatCurrency(summary.balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.balance >= 0 ? "Positivo" : "Negativo"} este mês
              </p>
            </CardContent>
          </Card>

          {/* Receitas */}
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <div className="p-2 rounded-full bg-green-500/20">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {valuesHidden ? "•••" : formatCurrency(summary.totalIncome)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3 text-green-600" />
                <p className="text-xs text-muted-foreground">Entradas do mês</p>
              </div>
            </CardContent>
          </Card>

          {/* Despesas */}
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <div className="p-2 rounded-full bg-red-500/20">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {valuesHidden ? "•••" : formatCurrency(summary.totalExpense)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowDownRight className="h-3 w-3 text-red-600" />
                <p className="text-xs text-muted-foreground">Saídas do mês</p>
              </div>
            </CardContent>
          </Card>

          {/* Investimentos */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Investimentos</CardTitle>
              <div className="p-2 rounded-full bg-purple-500/20">
                <PiggyBank className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {valuesHidden ? "•••" : formatCurrency(summary.totalInvestment)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-purple-600" />
                <p className="text-xs text-muted-foreground">Aplicado no mês</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grid de 2 colunas */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Gráfico de Pizza */}
          {expensePieData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
                <CardDescription>Distribuição percentual dos gastos</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpensePieChart data={expensePieData} />
              </CardContent>
            </Card>
          )}

          {/* Top 5 Despesas */}
          <Card>
            <CardHeader>
              <CardTitle>Maiores Despesas</CardTitle>
              <CardDescription>Top 5 gastos do mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma despesa registrada
                  </p>
                ) : (
                  topExpenses.map((expense, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{expense.name}</p>
                          <p className="text-xs text-muted-foreground">{expense.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">
                          {formatCurrency(expense.value)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às funcionalidades principais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <Button variant="outline" className="h-20 flex-col gap-2">
                <TrendingUp className="h-6 w-6 text-green-500" />
                <span className="text-xs">Ver Receitas</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <TrendingDown className="h-6 w-6 text-red-500" />
                <span className="text-xs">Ver Despesas</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <PiggyBank className="h-6 w-6 text-purple-500" />
                <span className="text-xs">Investimentos</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Calendar className="h-6 w-6 text-blue-500" />
                <span className="text-xs">Visão Anual</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
