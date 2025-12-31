import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Circle,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  MoreVertical,
  Archive,
  RotateCcw,
  XCircle,
  PieChart,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

export default function ProjectDetailPage() {
  const [, params] = useRoute("/projetos/:id");
  const [, setLocation] = useLocation();
  const projectId = parseInt(params?.id || "0");

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: project, isLoading } = trpc.project.getProject.useQuery({ projectId });
  const { data: analysis } = trpc.project.getProjectAnalysis.useQuery({ projectId });

  // Mutations
  const addCategory = trpc.project.addCategory.useMutation({
    onSuccess: () => {
      utils.project.getProject.invalidate();
      toast.success("Categoria adicionada!");
      setShowAddCategory(false);
    },
  });

  const addExpense = trpc.project.addExpense.useMutation({
    onSuccess: () => {
      utils.project.getProject.invalidate();
      utils.project.getProjectAnalysis.invalidate();
      toast.success("Despesa adicionada!");
      setShowAddExpense(false);
    },
  });

  const addMilestone = trpc.project.addMilestone.useMutation({
    onSuccess: () => {
      utils.project.getProject.invalidate();
      toast.success("Marco adicionado!");
      setShowAddMilestone(false);
    },
  });

  const markExpensePaid = trpc.project.markExpensePaid.useMutation({
    onSuccess: () => {
      utils.project.getProject.invalidate();
      toast.success("Status atualizado!");
    },
  });

  const completeMilestone = trpc.project.completeMilestone.useMutation({
    onSuccess: () => {
      utils.project.getProject.invalidate();
      toast.success("Marco atualizado!");
    },
  });

  const archiveProject = trpc.project.archiveProject.useMutation({
    onSuccess: () => {
      utils.project.getProject.invalidate();
      toast.success("Projeto arquivado!");
    },
  });

  const cancelProject = trpc.project.cancelProject.useMutation({
    onSuccess: () => {
      utils.project.getProject.invalidate();
      toast.success("Projeto cancelado!");
    },
  });

  const deleteExpense = trpc.project.deleteExpense.useMutation({
    onSuccess: () => {
      utils.project.getProject.invalidate();
      toast.success("Despesa deletada!");
    },
  });

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: "", budget: "", color: "#6b7280" });
  const [expenseForm, setExpenseForm] = useState({
    categoryId: "",
    description: "",
    plannedValue: "",
    actualValue: "",
    date: "",
    paid: false,
    notes: "",
  });
  const [milestoneForm, setMilestoneForm] = useState({
    name: "",
    description: "",
    dueDate: "",
  });

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
      year: "numeric",
    });
  };

  const handleAddCategory = () => {
    if (!categoryForm.name || !categoryForm.budget) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    addCategory.mutate({
      projectId,
      name: categoryForm.name,
      budget: Math.round(parseFloat(categoryForm.budget) * 100),
      color: categoryForm.color,
    });
  };

  const handleAddExpense = () => {
    if (!expenseForm.description || !expenseForm.plannedValue || !expenseForm.date) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    addExpense.mutate({
      projectId,
      categoryId: expenseForm.categoryId ? parseInt(expenseForm.categoryId) : undefined,
      description: expenseForm.description,
      plannedValue: Math.round(parseFloat(expenseForm.plannedValue) * 100),
      actualValue: expenseForm.actualValue ? Math.round(parseFloat(expenseForm.actualValue) * 100) : 0,
      date: expenseForm.date,
      paid: expenseForm.paid,
      notes: expenseForm.notes,
    });
  };

  const handleAddMilestone = () => {
    if (!milestoneForm.name || !milestoneForm.dueDate) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    addMilestone.mutate({
      projectId,
      ...milestoneForm,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando projeto...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Projeto não encontrado</h2>
          <Button onClick={() => setLocation("/projetos")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Projetos
          </Button>
        </div>
      </div>
    );
  }

  const budgetPercentage = project.totalBudget > 0 ? (project.stats.totalActual / project.totalBudget) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/projetos")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {formatDate(project.startDate)}
                  {project.endDate && ` - ${formatDate(project.endDate)}`}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {project.status !== "completed" && (
                  <DropdownMenuItem onClick={() => archiveProject.mutate({ projectId })}>
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                )}
                {project.status !== "cancelled" && (
                  <DropdownMenuItem onClick={() => cancelProject.mutate({ projectId })}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Orçamento Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(project.totalBudget)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Gasto Real</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(project.stats.totalActual)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-600">Restante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(project.stats.remaining)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600">Progresso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{budgetPercentage.toFixed(0)}%</div>
              <Progress value={budgetPercentage} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
            <TabsTrigger value="milestones">Marcos</TabsTrigger>
            <TabsTrigger value="analysis">Análise</TabsTrigger>
          </TabsList>

          {/* Tab: Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Categorias */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Categorias</CardTitle>
                    <CardDescription>Organize o orçamento por categoria</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddCategory(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {project.categories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma categoria ainda. Adicione uma para começar.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {project.categories.map((cat: any) => (
                      <div key={cat.id} className="flex items-center gap-4">
                        <div
                          className="w-1 h-12 rounded"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{cat.name}</span>
                            <span className="text-sm">
                              {formatCurrency(cat.actual)} / {formatCurrency(cat.budget)}
                            </span>
                          </div>
                          <Progress value={cat.percentage} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Milestones Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Marcos do Projeto</CardTitle>
                <CardDescription>
                  {project.stats.completedMilestones} de {project.stats.totalMilestones} concluídos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={project.stats.milestoneProgress} className="mb-4" />
                <p className="text-sm text-muted-foreground">
                  {project.stats.milestoneProgress.toFixed(0)}% completo
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Despesas */}
          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Despesas</CardTitle>
                    <CardDescription>
                      {project.expenses.length} despesas registradas
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddExpense(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Despesa
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {project.expenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma despesa registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {project.expenses.map((expense: any) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={expense.paid}
                            onCheckedChange={(checked) =>
                              markExpensePaid.mutate({
                                expenseId: expense.id,
                                paid: !!checked,
                              })
                            }
                          />
                          <div className="flex-1">
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(expense.date)}
                              {expense.notes && ` • ${expense.notes}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Planejado: {formatCurrency(expense.plannedValue)}
                            </p>
                            <p className="font-medium">
                              Real: {formatCurrency(expense.actualValue)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Deletar esta despesa?")) {
                                deleteExpense.mutate({ expenseId: expense.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Milestones */}
          <TabsContent value="milestones">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Marcos do Projeto</CardTitle>
                    <CardDescription>Entregas e objetivos principais</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddMilestone(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Marco
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {project.milestones.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum marco definido ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {project.milestones.map((milestone: any) => (
                      <div
                        key={milestone.id}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                      >
                        <button
                          onClick={() =>
                            completeMilestone.mutate({
                              milestoneId: milestone.id,
                              completed: !milestone.completed,
                            })
                          }
                        >
                          {milestone.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className={`font-medium ${milestone.completed ? "line-through text-muted-foreground" : ""}`}>
                            {milestone.name}
                          </p>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground">{milestone.description}</p>
                          )}
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(milestone.dueDate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Análise */}
          <TabsContent value="analysis">
            {analysis && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo Financeiro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Orçamento</p>
                        <p className="text-2xl font-bold">{formatCurrency(analysis.summary.totalBudget)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gasto Total</p>
                        <p className="text-2xl font-bold">{formatCurrency(analysis.summary.totalSpent)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Variância</p>
                        <p className={`text-2xl font-bold ${analysis.summary.variance > 0 ? "text-red-500" : "text-green-500"}`}>
                          {analysis.summary.variance > 0 ? "+" : ""}
                          {formatCurrency(analysis.summary.variance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className={analysis.summary.onBudget ? "bg-green-500" : "bg-red-500"}>
                          {analysis.summary.onBudget ? "Dentro do Orçamento" : "Acima do Orçamento"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Despesas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysis.topExpenses.slice(0, 10).map((expense: any, idx: number) => (
                        <div key={expense.id} className="flex items-center justify-between">
                          <span className="text-sm">
                            {idx + 1}. {expense.description}
                          </span>
                          <span className="font-medium">{formatCurrency(expense.actualValue)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Ex: Buffet, Decoração, Transporte"
              />
            </div>
            <div>
              <Label>Orçamento (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={categoryForm.budget}
                onChange={(e) => setCategoryForm({ ...categoryForm, budget: e.target.value })}
              />
            </div>
            <div>
              <Label>Cor</Label>
              <Input
                type="color"
                value={categoryForm.color}
                onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCategory}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Categoria</Label>
              <select
                className="w-full border rounded-md p-2"
                value={expenseForm.categoryId}
                onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
              >
                <option value="">Sem categoria</option>
                {project?.categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Planejado (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.plannedValue}
                  onChange={(e) => setExpenseForm({ ...expenseForm, plannedValue: e.target.value })}
                />
              </div>
              <div>
                <Label>Valor Real (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.actualValue}
                  onChange={(e) => setExpenseForm({ ...expenseForm, actualValue: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={expenseForm.paid}
                onCheckedChange={(checked) => setExpenseForm({ ...expenseForm, paid: !!checked })}
              />
              <Label>Pago</Label>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExpense(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddExpense}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddMilestone} onOpenChange={setShowAddMilestone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Marco</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={milestoneForm.name}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                placeholder="Ex: Reservar local, Contratar fotógrafo"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Data Limite *</Label>
              <Input
                type="date"
                value={milestoneForm.dueDate}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMilestone(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMilestone}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
