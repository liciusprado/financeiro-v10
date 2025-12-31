import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Input } from "@/components/ui/input";
import {
  TrendingDown,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Search,
  ArrowDownRight,
  AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExpensePieChart } from "@/components/ExpensePieChart";

export default function DespesasPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [valuesHidden, setValuesHidden] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");

  const utils = trpc.useUtils();

  const { data: categories = [] } = trpc.finance.listCategories.useQuery();
  const { data: items = [] } = trpc.finance.listItems.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });
  const { data: entries = [] } = trpc.finance.getMonthEntries.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });

  const createItem = trpc.finance.createItem.useMutation({
    onSuccess: () => {
      utils.finance.listItems.invalidate();
      setIsAddDialogOpen(false);
      setNewItemName("");
      toast.success("Item adicionado com sucesso!");
    },
  });

  const updateEntry = trpc.finance.updateMonthEntry.useMutation({
    onSuccess: () => {
      utils.finance.getMonthEntries.invalidate();
      toast.success("Valor atualizado!");
    },
  });

  const deleteItem = trpc.finance.deleteItem.useMutation({
    onSuccess: () => {
      utils.finance.listItems.invalidate();
      utils.finance.getMonthEntries.invalidate();
      toast.success("Item removido!");
    },
  });

  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.type === "expense");
  }, [categories]);

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

  const totalExpense = useMemo(() => {
    return entries.reduce((sum, entry) => {
      const item = items.find((i) => i.id === entry.itemId);
      if (!item) return sum;
      const category = categories.find((c) => c.id === item.categoryId);
      if (category?.type === "expense") {
        return sum + (entry.actualValue || 0);
      }
      return sum;
    }, 0);
  }, [entries, items, categories]);

  // Dados para gráfico de pizza
  const expensePieData = useMemo(() => {
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
  }, [expenseCategories, items, entries]);

  // Alertas de orçamento
  const alerts = useMemo(() => {
    const alertList: Array<{ item: string; planned: number; actual: number; category: string }> = [];
    
    expenseCategories.forEach((category) => {
      const catItems = items.filter((i) => i.categoryId === category.id);
      catItems.forEach((item) => {
        const itemEntries = entries.filter((e) => e.itemId === item.id);
        const totalPlanned = itemEntries.reduce((sum, e) => sum + (e.plannedValue || 0), 0);
        const totalActual = itemEntries.reduce((sum, e) => sum + (e.actualValue || 0), 0);
        
        if (totalPlanned > 0 && totalActual > totalPlanned * 1.1) {
          alertList.push({
            item: item.name,
            planned: totalPlanned,
            actual: totalActual,
            category: category.name,
          });
        }
      });
    });
    
    return alertList;
  }, [expenseCategories, items, entries]);

  const handleUpdateEntry = (
    itemId: number,
    person: "licius" | "marielly",
    field: "plannedValue" | "actualValue",
    cents: number
  ) => {
    updateEntry.mutate({
      itemId,
      month: selectedMonth,
      year: selectedYear,
      person,
      [field]: cents,
    });
  };

  const handleAddItem = () => {
    if (!selectedCategoryId || !newItemName.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    createItem.mutate({
      categoryId: selectedCategoryId,
      name: newItemName.trim(),
      month: selectedMonth,
      year: selectedYear,
    });
  };

  const categorizedData = useMemo(() => {
    return expenseCategories.map((category) => {
      let categoryItems = items.filter((item) => item.categoryId === category.id);

      if (searchTerm) {
        categoryItems = categoryItems.filter((item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      const itemsWithEntries = categoryItems.map((item) => {
        const itemEntries = entries.filter((e) => e.itemId === item.id);
        const liciusEntry = itemEntries.find((e) => e.person === "licius");
        const mariellyEntry = itemEntries.find((e) => e.person === "marielly");

        const liciusPlanned = liciusEntry?.plannedValue || 0;
        const liciusActual = liciusEntry?.actualValue || 0;
        const mariellyPlanned = mariellyEntry?.plannedValue || 0;
        const mariellyActual = mariellyEntry?.actualValue || 0;
        const totalActual = liciusActual + mariellyActual;

        return {
          item,
          liciusPlanned,
          liciusActual,
          mariellyPlanned,
          mariellyActual,
          totalActual,
        };
      });

      return {
        category,
        items: itemsWithEntries,
      };
    });
  }, [expenseCategories, items, entries, searchTerm]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Despesas</h1>
                <p className="text-sm text-muted-foreground">
                  Controle seus gastos mensais
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
        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-red-600">Total de Despesas</CardTitle>
                <CardDescription>Soma de todos os gastos do mês</CardDescription>
              </div>
              <div className="p-3 rounded-full bg-red-500/20">
                <ArrowDownRight className="h-8 w-8 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-red-600">
                {valuesHidden ? "•••" : formatCurrency(totalExpense)}
              </div>
            </CardContent>
          </Card>

          {expensePieData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
                <CardDescription>Percentual de gastos</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpensePieChart data={expensePieData} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <Card className="mb-8 border-yellow-500/50 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Orçamento
              </CardTitle>
              <CardDescription>Itens com gastos acima da meta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <div>
                      <p className="font-medium">{alert.item}</p>
                      <p className="text-sm text-muted-foreground">{alert.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">
                        {formatCurrency(alert.actual)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Meta: {formatCurrency(alert.planned)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Busca */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar despesa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabelas por Categoria */}
        {categorizedData.map(({ category, items: categoryItems }) => {
          if (categoryItems.length === 0 && searchTerm) return null;

          return (
            <Card key={category.id} className="mb-6 border-l-4 border-red-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-red-600">{category.name}</CardTitle>
                  <Button
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      setIsAddDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Item</TableHead>
                      <TableHead className="text-center">Meta (Lícius)</TableHead>
                      <TableHead className="text-center">Real (Lícius)</TableHead>
                      <TableHead className="text-center">Meta (Marielly)</TableHead>
                      <TableHead className="text-center">Real (Marielly)</TableHead>
                      <TableHead className="text-center font-semibold text-red-600">Total (Real)</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum item nesta categoria
                        </TableCell>
                      </TableRow>
                    ) : (
                      categoryItems.map(({ item, liciusPlanned, liciusActual, mariellyPlanned, mariellyActual, totalActual }) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-center">
                            {valuesHidden ? "•••" : (
                              <CurrencyInput
                                value={liciusPlanned}
                                className="w-28 text-center"
                                onBlur={(value) =>
                                  handleUpdateEntry(item.id, "licius", "plannedValue", value)
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {valuesHidden ? "•••" : (
                              <CurrencyInput
                                value={liciusActual}
                                className="w-28 text-center"
                                onBlur={(value) =>
                                  handleUpdateEntry(item.id, "licius", "actualValue", value)
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {valuesHidden ? "•••" : (
                              <CurrencyInput
                                value={mariellyPlanned}
                                className="w-28 text-center"
                                onBlur={(value) =>
                                  handleUpdateEntry(item.id, "marielly", "plannedValue", value)
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {valuesHidden ? "•••" : (
                              <CurrencyInput
                                value={mariellyActual}
                                className="w-28 text-center"
                                onBlur={(value) =>
                                  handleUpdateEntry(item.id, "marielly", "actualValue", value)
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold text-red-600">
                            {valuesHidden ? "•••" : formatCurrency(totalActual)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Remover "${item.name}"?`)) {
                                  deleteItem.mutate({ itemId: item.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Despesa</DialogTitle>
            <DialogDescription>
              Crie um novo item de despesa nesta categoria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Item</Label>
              <Input
                placeholder="Ex: Aluguel, Mercado, Luz..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
