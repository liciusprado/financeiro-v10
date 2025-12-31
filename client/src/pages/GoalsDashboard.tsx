import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useSelectedUser } from "@/contexts/SelectedUserContext";
import { useLocation } from "wouter";
import { TrendingUp, TrendingDown, Wallet, Flag, Trash2, Plus, Save } from "lucide-react";

/**
 * Painel unificado para contas, orçamentos e metas compartilhadas.
 *
 * Esta página apresenta um resumo das receitas, despesas, investimentos e saldo
 * do mês atual, além de uma seção para definir e acompanhar metas de longo
 * prazo (por exemplo, economizar para uma viagem ou comprar um imóvel). As
 * metas são armazenadas no localStorage e são compartilhadas entre os
 * perfis (Lícius e Marielly), permitindo que ambos acompanhem o progresso.
 */
export default function GoalsDashboard() {
  const [, setLocation] = useLocation();
  const { selectedUser } = useSelectedUser();

  // Definir mês e ano atuais para o resumo
  const currentDate = new Date();
  const selectedMonth = currentDate.getMonth() + 1;
  const selectedYear = currentDate.getFullYear();

  // Consultas TRPC para obter categorias, itens e lançamentos do mês atual
  const { data: categories = [], isLoading: categoriesLoading } = trpc.finance.listCategories.useQuery();
  const { data: items = [], isLoading: itemsLoading } = trpc.finance.listItems.useQuery({ month: selectedMonth, year: selectedYear });
  const { data: entries = [], isLoading: entriesLoading } = trpc.finance.getMonthEntries.useQuery({ month: selectedMonth, year: selectedYear });

  // Função utilitária para formatar valores monetários
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  // Calcular resumo de receitas, despesas, investimentos e saldo (usando todos os lançamentos)
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

  /**
   * Estrutura de uma meta financeira.
   * id: identificador único
   * name: descrição da meta (ex.: "Viagem Europa")
   * target: valor alvo em centavos
   * current: valor acumulado em centavos
   */
  interface Goal {
    id: number;
    name: string;
    target: number;
    current: number;
  }

  // Metas armazenadas em localStorage e replicadas em estado
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState(0);

  // Carregar metas do localStorage ao montar o componente
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("financialGoals");
      if (stored) {
        try {
          const parsed: Goal[] = JSON.parse(stored);
          setGoals(parsed);
        } catch (err) {
          console.error("Falha ao carregar metas do localStorage:", err);
        }
      }
    }
  }, []);

  // Persistir metas no localStorage sempre que forem atualizadas
  const saveGoals = (updatedGoals: Goal[]) => {
    setGoals(updatedGoals);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("financialGoals", JSON.stringify(updatedGoals));
    }
  };

  // Adicionar uma nova meta
  const addGoal = () => {
    if (!newGoalName || newGoalTarget <= 0) return;
    const newGoal: Goal = {
      id: Date.now(),
      name: newGoalName,
      target: newGoalTarget,
      current: 0,
    };
    const updated = [...goals, newGoal];
    saveGoals(updated);
    setIsAddDialogOpen(false);
    setNewGoalName("");
    setNewGoalTarget(0);
  };

  // Atualizar progresso de uma meta somando um valor ao valor atual
  const addToGoal = (goalId: number, amount: number) => {
    if (amount <= 0) return;
    const updated = goals.map((goal) => {
      if (goal.id === goalId) {
        return { ...goal, current: goal.current + amount };
      }
      return goal;
    });
    saveGoals(updated);
  };

  // Excluir uma meta
  const deleteGoal = (goalId: number) => {
    const updated = goals.filter((goal) => goal.id !== goalId);
    saveGoals(updated);
  };

  // Carregar metas do localStorage novamente se o usuário mudar de perfil (para permitir
  // que ambos os perfis compartilhem a mesma lista de metas)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("financialGoals");
      if (stored) {
        try {
          const parsed: Goal[] = JSON.parse(stored);
          setGoals(parsed);
        } catch (err) {
          console.error("Falha ao recarregar metas do localStorage:", err);
        }
      }
    }
  }, [selectedUser]);

  // Estado para entradas de progresso de cada meta (valor temporário)
  const [progressInputs, setProgressInputs] = useState<Record<number, number>>({});

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-7xl">
        {/* Cabeçalho da página */}
        <div className="mb-6">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
            Painel de Metas e Resumo
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Acompanhe suas finanças e objetivos compartilhados
          </p>
        </div>

        {/* Cartões de resumo (Receita, Despesa, Investimento, Saldo) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-blue-500/20 border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-400">Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-300">{formatCurrency(summary.totalIncome)}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-600/20 border-red-600/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-400">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-300">{formatCurrency(summary.totalExpense)}</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/20 border-green-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-400">Investimentos</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-300">{formatCurrency(summary.totalInvestment)}</div>
            </CardContent>
          </Card>
          <Card className={`${summary.balance >= 0 ? 'bg-amber-500/20 border-amber-500/50' : 'bg-red-600/20 border-red-600/50'}` }>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-sm font-medium ${summary.balance >= 0 ? 'text-amber-400' : 'text-red-400'}`}>Saldo</CardTitle>
              <Wallet className={`h-4 w-4 ${summary.balance >= 0 ? 'text-amber-400' : 'text-red-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-amber-300' : 'text-red-300'}`}>{formatCurrency(summary.balance)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Seção de metas */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Metas Compartilhadas</h2>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Nova Meta
            </Button>
          </div>
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = Math.min(100, (goal.current / goal.target) * 100);
              const remaining = Math.max(0, goal.target - goal.current);
              return (
                <Card key={goal.id} className="border-l-4 border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{goal.name}</CardTitle>
                        <CardDescription>{formatCurrency(goal.current)} de {formatCurrency(goal.target)} (Restam {formatCurrency(remaining)})</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteGoal(goal.id)}
                        title="Excluir meta"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Barra de progresso */}
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-3 bg-primary rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    {/* Entrada para adicionar progresso */}
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <CurrencyInput
                        value={progressInputs[goal.id] || 0}
                        className="w-40 text-center"
                        onBlur={(value) => {
                          setProgressInputs((prev) => ({ ...prev, [goal.id]: value }));
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const amount = progressInputs[goal.id] || 0;
                          if (amount > 0) {
                            addToGoal(goal.id, amount);
                            setProgressInputs((prev) => ({ ...prev, [goal.id]: 0 }));
                          }
                        }}
                      >
                        <Save className="h-4 w-4 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {goals.length === 0 && (
              <p className="text-muted-foreground text-center">Nenhuma meta definida ainda. Clique em "Nova Meta" para começar.</p>
            )}
          </div>
        </div>

        {/* Dialogo para adicionar nova meta */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Meta</DialogTitle>
              <DialogDescription>Defina um objetivo e o valor que deseja atingir</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="goal-name">Nome da Meta</Label>
                <Input
                  id="goal-name"
                  placeholder="Ex.: Viagem, Casa própria"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-target">Valor Alvo</Label>
                <CurrencyInput
                  value={newGoalTarget}
                  onBlur={(value) => setNewGoalTarget(value)}
                  className="w-full"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={addGoal}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}