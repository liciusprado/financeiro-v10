import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  TrendingUp,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle2,
  ArrowLeft,
  Trophy,
  Wallet,
  Trash2,
  Edit,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, string> = {
  emergency: "🚨",
  travel: "✈️",
  purchase: "🛍️",
  education: "📚",
  retirement: "👴",
  investment: "📈",
  debt: "💳",
  other: "🎯",
};

const CATEGORY_LABELS: Record<string, string> = {
  emergency: "Emergência",
  travel: "Viagem",
  purchase: "Compra",
  education: "Educação",
  retirement: "Aposentadoria",
  investment: "Investimento",
  debt: "Dívida",
  other: "Outro",
};

export default function GoalsAdvanced() {
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  // Form states
  const [goalName, setGoalName] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [goalCategory, setGoalCategory] = useState<string>("other");
  const [goalPriority, setGoalPriority] = useState<string>("medium");
  const [goalIcon, setGoalIcon] = useState("🎯");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");

  // Queries
  const { data: goals = [], refetch: refetchGoals } = trpc.finance.getUserGoals.useQuery();
  const { data: stats } = trpc.finance.getGoalsStats.useQuery();

  // Mutations
  const createMutation = trpc.finance.createGoal.useMutation();
  const deleteMutation = trpc.finance.deleteGoal.useMutation();
  const addTransactionMutation = trpc.finance.addGoalTransaction.useMutation();
  const updateMutation = trpc.finance.updateGoal.useMutation();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const handleCreateGoal = async () => {
    if (!goalName || !goalTarget) {
      toast.error("Preencha nome e valor alvo");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: goalName,
        description: goalDescription || undefined,
        targetAmount: Math.round(parseFloat(goalTarget) * 100),
        targetDate: goalDate ? new Date(goalDate) : undefined,
        category: goalCategory as any,
        priority: goalPriority as any,
        icon: goalIcon,
        isShared: false,
      });

      toast.success("Meta criada com sucesso!");
      setCreateDialogOpen(false);
      resetForm();
      refetchGoals();
    } catch (error) {
      toast.error("Erro ao criar meta");
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return;

    try {
      await deleteMutation.mutateAsync({ goalId });
      toast.success("Meta excluída");
      refetchGoals();
    } catch (error) {
      toast.error("Erro ao excluir meta");
    }
  };

  const handleDeposit = async () => {
    if (!selectedGoalId || !depositAmount) {
      toast.error("Preencha o valor");
      return;
    }

    try {
      await addTransactionMutation.mutateAsync({
        goalId: selectedGoalId,
        amount: Math.round(parseFloat(depositAmount) * 100),
        type: "deposit",
        note: depositNote || undefined,
      });

      toast.success("Depósito realizado!");
      setDepositDialogOpen(false);
      setDepositAmount("");
      setDepositNote("");
      refetchGoals();
    } catch (error) {
      toast.error("Erro ao fazer depósito");
    }
  };

  const handlePauseGoal = async (goalId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await updateMutation.mutateAsync({
        goalId,
        status: newStatus as any,
      });
      toast.success(newStatus === "paused" ? "Meta pausada" : "Meta reativada");
      refetchGoals();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const resetForm = () => {
    setGoalName("");
    setGoalDescription("");
    setGoalTarget("");
    setGoalDate("");
    setGoalCategory("other");
    setGoalPriority("medium");
    setGoalIcon("🎯");
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const pausedGoals = goals.filter((g) => g.status === "paused");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              Metas Financeiras
            </h1>
            <p className="text-muted-foreground mt-1">
              Defina e acompanhe seus objetivos financeiros
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Nova Meta</DialogTitle>
                <DialogDescription>
                  Defina um objetivo financeiro para alcançar
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Nome da Meta *</Label>
                  <Input
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder="Ex: Viagem para Europa"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    placeholder="Detalhes sobre a meta..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor Alvo (R$) *</Label>
                    <Input
                      type="number"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      placeholder="10000"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label>Data Alvo</Label>
                    <Input
                      type="date"
                      value={goalDate}
                      onChange={(e) => setGoalDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoria</Label>
                    <Select value={goalCategory} onValueChange={setGoalCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {CATEGORY_ICONS[key]} {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Prioridade</Label>
                    <Select value={goalPriority} onValueChange={setGoalPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Ícone</Label>
                  <Input
                    value={goalIcon}
                    onChange={(e) => setGoalIcon(e.target.value)}
                    placeholder="🎯"
                    maxLength={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateGoal} disabled={createMutation.isPending}>
                  Criar Meta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Total de Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalGoals}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activeGoals} ativas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Concluídas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.completedGoals}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Objetivos alcançados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-500" />
                  Total Economizado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalSaved)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  de {formatCurrency(stats.totalTarget)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  Progresso Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.overallProgress}%</div>
                <Progress value={stats.overallProgress} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Goals Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">
              Ativas ({activeGoals.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Concluídas ({completedGoals.length})
            </TabsTrigger>
            <TabsTrigger value="paused">
              Pausadas ({pausedGoals.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Goals */}
          <TabsContent value="active" className="space-y-4">
            {activeGoals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma meta ativa. Crie sua primeira meta!
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeGoals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const remaining = goal.targetAmount - goal.currentAmount;

                return (
                  <Card key={goal.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{goal.icon}</div>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {goal.name}
                              <Badge variant="outline">
                                {CATEGORY_LABELS[goal.category]}
                              </Badge>
                              {goal.priority === "high" && (
                                <Badge variant="destructive">Prioridade Alta</Badge>
                              )}
                            </CardTitle>
                            {goal.description && (
                              <CardDescription className="mt-1">
                                {goal.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePauseGoal(goal.id, goal.status)}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-sm mt-2">
                            <span>{formatCurrency(goal.currentAmount)}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(goal.targetAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Faltam: </span>
                            <span className="font-bold">{formatCurrency(remaining)}</span>
                            {goal.targetDate && (
                              <>
                                <span className="text-muted-foreground mx-2">•</span>
                                <Calendar className="h-4 w-4 inline mr-1" />
                                {new Date(goal.targetDate).toLocaleDateString("pt-BR")}
                              </>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedGoalId(goal.id);
                              setDepositDialogOpen(true);
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Depositar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Completed Goals */}
          <TabsContent value="completed" className="space-y-4">
            {completedGoals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma meta concluída ainda
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedGoals.map((goal) => (
                <Card key={goal.id} className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{goal.icon}</div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {goal.name}
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Concluída
                            </Badge>
                          </CardTitle>
                          {goal.description && (
                            <CardDescription>{goal.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <span>Valor Alcançado:</span>
                      <span className="font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Paused Goals */}
          <TabsContent value="paused" className="space-y-4">
            {pausedGoals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma meta pausada</p>
                </CardContent>
              </Card>
            ) : (
              pausedGoals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;

                return (
                  <Card key={goal.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{goal.icon}</div>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {goal.name}
                              <Badge variant="outline">Pausada</Badge>
                            </CardTitle>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePauseGoal(goal.id, goal.status)}
                          >
                            Reativar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-sm mt-2">
                        <span>{formatCurrency(goal.currentAmount)}</span>
                        <span>{formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* Deposit Dialog */}
        <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fazer Depósito</DialogTitle>
              <DialogDescription>
                Adicione dinheiro para esta meta
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="100.00"
                  step="0.01"
                />
              </div>

              <div>
                <Label>Observação (opcional)</Label>
                <Input
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="Ex: Bônus do trabalho"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDepositDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleDeposit} disabled={addTransactionMutation.isPending}>
                Depositar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
