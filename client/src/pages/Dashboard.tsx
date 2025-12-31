import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, TrendingDown, TrendingUp, Wallet, BarChart3, Download, Trash2, AlertTriangle, Search, Filter, Calendar, Copy, FileText, Sparkles, Pencil, GripVertical, Database, Settings, Archive, ArrowLeft, Eye, EyeOff, Flag, MessageCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { ExpensePieChart } from "@/components/ExpensePieChart";
import { AttachmentUpload } from "@/components/AttachmentUpload";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Importar o contexto de usuário selecionado para definir a visualização
import { useSelectedUser } from "@/contexts/SelectedUserContext";

// Componente para indicador de tendência (↑ ↓ →)
function TrendIndicator({ currentValue, previousValue }: { currentValue: number; previousValue: number }) {
  const diff = currentValue - previousValue;
  const percentChange = previousValue !== 0 ? Math.abs((diff / previousValue) * 100) : 0;
  
  // Threshold de 1% para considerar como "sem mudança"
  if (Math.abs(percentChange) < 1) {
    return (
      <span className="inline-flex items-center text-muted-foreground mr-1" title="Sem mudança significativa">
        →
      </span>
    );
  }
  
  if (diff > 0) {
    return (
      <span className="inline-flex items-center text-green-600 dark:text-green-400 mr-1" title={`Aumentou ${percentChange.toFixed(1)}%`}>
        ↑
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center text-red-600 dark:text-red-400 mr-1" title={`Diminuiu ${percentChange.toFixed(1)}%`}>
      ↓
    </span>
  );
}

// Componente para linha sortable
function SortableTableRow({ id, dragHandle, children }: { id: number; dragHandle: React.ReactNode; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="w-8 cursor-grab active:cursor-grabbing" {...listeners}>
        {dragHandle}
      </TableCell>
      {children}
    </TableRow>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCustomCategory, setFilterCustomCategory] = useState("all");
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isCopyPreviousDialogOpen, setIsCopyPreviousDialogOpen] = useState(false);
  const [duplicateTargetMonth, setDuplicateTargetMonth] = useState(selectedMonth);
  const [duplicateTargetYear, setDuplicateTargetYear] = useState(selectedYear);
  const [copyActualValues, setCopyActualValues] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archiveItemId, setArchiveItemId] = useState<number | null>(null);
  const [archiveMonth, setArchiveMonth] = useState(selectedMonth);
  const [archiveYear, setArchiveYear] = useState(selectedYear);
  const [valuesHidden, setValuesHidden] = useState(false);

  // View filter for individual vs total. Allows switching between viewing
  // all entries, only Lícius or only Marielly. This state controls what
  // data is included in summaries, charts and tables. Default is "all".
  const [personView, setPersonView] = useState<"all" | "licius" | "marielly">("all");

  // Obter o usuário selecionado via contexto (definido após a tela de seleção)
  const { selectedUser } = useSelectedUser();

  // Quando o componente monta ou o usuário selecionado muda, definimos a visualização padrão
  // para o usuário atual. Isso permite que, ao entrar como Lícius ou Marielly,
  // o dashboard já comece mostrando apenas seus lançamentos, mas ainda permite
  // alternar para "all" para ver o total da família.
  useEffect(() => {
    if (selectedUser) {
      setPersonView(selectedUser);
    }
  }, [selectedUser]);

  // Queries
  const { data: categories = [], isLoading: categoriesLoading } = trpc.finance.listCategories.useQuery();
  const { data: items = [], isLoading: itemsLoading } = trpc.finance.listItems.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });
  const { data: entries = [], isLoading: entriesLoading } = trpc.finance.getMonthEntries.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });

  // Query para mês anterior (para calcular tendências)
  const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const previousYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const { data: previousEntries = [] } = trpc.finance.getMonthEntries.useQuery({
    month: previousMonth,
    year: previousYear,
  });

  // Filtered entries based on the selected person view. If "all" is selected,
  // all entries are used. Otherwise, only entries belonging to the selected
  // person are included in summaries, charts and tables.
  const filteredEntries = useMemo(() => {
    if (personView === "all") return entries;
    return entries.filter((e) => e.person === personView);
  }, [entries, personView]);
  
  const { data: alerts = [] } = trpc.finance.getBudgetAlerts.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });

  const utils = trpc.useUtils();

  // Mutations
  const upsertEntry = trpc.finance.upsertEntry.useMutation({
    onSuccess: () => {
      utils.finance.getMonthEntries.invalidate();
      toast.success("Lançamento salvo com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar lançamento: " + error.message);
    },
  });

  const createItem = trpc.finance.createItem.useMutation({
    onSuccess: () => {
      utils.finance.listItems.invalidate();
      setIsAddDialogOpen(false);
      setNewItemName("");
      setNewItemCategory("");
      toast.success("Item criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar item: " + error.message);
    },
  });

  const deleteItem = trpc.finance.deleteItem.useMutation({
    onSuccess: () => {
      utils.finance.listItems.invalidate();
      toast.success("Item excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir item: " + error.message);
    },
  });

  const updateItemName = trpc.finance.updateItemName.useMutation({
    onSuccess: () => {
      utils.finance.listItems.invalidate();
      setEditingItemId(null);
      setEditItemName("");
      toast.success("Item atualizado com sucesso!");
    },
  });

  const updateItem = trpc.finance.updateItem.useMutation({
    onSuccess: () => {
      utils.finance.listItems.invalidate();
      utils.finance.getMonthEntries.invalidate();
      toast.success("Categoria atualizada com sucesso!");
    },
  });

  const reorderItems = trpc.finance.reorderItems.useMutation({
    onSuccess: () => {
      utils.finance.listItems.invalidate();
      toast.success("Ordem atualizada!");
    },
  });

  // Mutation to request a review of an entry. When successful, refetch entries and show a toast.
  const requestReview = trpc.finance.requestReview.useMutation({
    onSuccess: () => {
      utils.finance.getMonthEntries.invalidate();
      toast.success("Revisão solicitada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao solicitar revisão: " + error.message);
    },
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const checkNotificationsMutation = trpc.finance.checkAndSendNotifications.useMutation();

  const duplicateMonth = trpc.finance.duplicateMonth.useMutation({
    onSuccess: (data) => {
      utils.finance.getMonthEntries.invalidate();
      setIsDuplicateDialogOpen(false);
      toast.success(`${data.count} lançamentos duplicados com sucesso!`);
    },
    onError: (error) => {
      toast.error("Erro ao duplicar mês: " + error.message);
    },
  });

  const copyPreviousMonthMutation = trpc.finance.copyPreviousMonthPlanned.useMutation({
    onSuccess: (data) => {
      utils.finance.getMonthEntries.invalidate();
      setIsCopyPreviousDialogOpen(false);
      toast.success(`${data.copiedCount} valores planejados copiados com sucesso!`);
    },
    onError: (error) => {
      toast.error("Erro ao copiar mês anterior: " + error.message);
    },
  });

  const createBackup = trpc.finance.createBackup.useMutation({
    onSuccess: (data) => {
      toast.success(`Backup criado com sucesso! ${data.itemsCount} itens, ${data.categoriesCount} categorias, ${data.entriesCount} lançamentos.`);
    },
    onError: (error) => {
      toast.error("Erro ao criar backup: " + error.message);
    },
  });

  const archiveItem = trpc.finance.archiveItem.useMutation({
    onSuccess: () => { utils.finance.listItems.invalidate();
      toast.success("Item arquivado com sucesso!");
      setIsArchiveDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao arquivar item: " + error.message);
    },
  });

  // Helpers
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  // Navegação de mês
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

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // Calcular totais
  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalInvestment = 0;

    filteredEntries.forEach((entry) => {
      const item = items.find((i) => i.id === entry.itemId);
      if (!item) return;
      const category = categories.find((c) => c.id === item.categoryId);
      if (!category) return;

      const value = entry.actualValue || 0;

      if (category.type === "income") {
        totalIncome += value;
      } else if (category.type === "expense") {
        totalExpense += value;
      } else if (category.type === "investment") {
        totalInvestment += value;
      }
    });

    const balance = totalIncome - totalExpense - totalInvestment;

    return {
      totalIncome,
      totalExpense,
      totalInvestment,
      balance,
    };
  }, [filteredEntries, items, categories]);

  // Dados para gráfico de pizza
  const expensePieData = useMemo(() => {
    const expenseCategories = categories.filter((c) => c.type === "expense");
    const total = expenseCategories.reduce((sum, cat) => {
      const catItems = items.filter((i) => i.categoryId === cat.id);
      const catTotal = catItems.reduce((itemSum, item) => {
        const itemEntries = filteredEntries.filter((e) => e.itemId === item.id);
        return itemSum + itemEntries.reduce((entrySum, e) => entrySum + (e.actualValue || 0), 0);
      }, 0);
      return sum + catTotal;
    }, 0);

    if (total === 0) return [];

    return expenseCategories
      .map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        const catTotal = catItems.reduce((itemSum, item) => {
          const itemEntries = filteredEntries.filter((e) => e.itemId === item.id);
          return itemSum + itemEntries.reduce((entrySum, e) => entrySum + (e.actualValue || 0), 0);
        }, 0);
        return {
          name: cat.name,
          value: catTotal,
          percentage: (catTotal / total) * 100,
        };
      })
      .filter((d) => d.value > 0);
  }, [categories, items, filteredEntries]);

  // Organizar dados por categoria
  const categorizedData = useMemo(() => {
    return categories.map((category) => {
      let categoryItems = items.filter((item) => item.categoryId === category.id);

      // Aplicar filtro de busca
      if (searchTerm) {
        categoryItems = categoryItems.filter((item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.customCategory && item.customCategory.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      // Aplicar filtro de categoria customizada
      if (filterCustomCategory !== "all") {
        categoryItems = categoryItems.filter((item) => item.customCategory === filterCustomCategory);
      }

      const itemsWithEntries = categoryItems.map((item) => {
        // Find entries for this item in the filtered entries list
        const itemEntries = filteredEntries.filter((e) => e.itemId === item.id);
        const liciusEntry = itemEntries.find((e) => e.person === "licius");
        const mariellyEntry = itemEntries.find((e) => e.person === "marielly");

        const liciusPlanned = liciusEntry?.plannedValue || 0;
        const liciusActual = liciusEntry?.actualValue || 0;
        const mariellyPlanned = mariellyEntry?.plannedValue || 0;
        const mariellyActual = mariellyEntry?.actualValue || 0;

        // Buscar valores do mês anterior para comparação de tendências
        const previousItemEntries = previousEntries.filter((e) => e.itemId === item.id);
        const previousLiciusEntry = previousItemEntries.find((e) => e.person === "licius");
        const previousMariellyEntry = previousItemEntries.find((e) => e.person === "marielly");
        
        const previousLiciusPlanned = previousLiciusEntry?.plannedValue || 0;
        const previousLiciusActual = previousLiciusEntry?.actualValue || 0;
        const previousMariellyPlanned = previousMariellyEntry?.plannedValue || 0;
        const previousMariellyActual = previousMariellyEntry?.actualValue || 0;

        // Compute total based on the selected view
        let totalActual = 0;
        let previousTotalActual = 0;
        if (personView === "all") {
          totalActual = liciusActual + mariellyActual;
          previousTotalActual = previousLiciusActual + previousMariellyActual;
        } else if (personView === "licius") {
          totalActual = liciusActual;
          previousTotalActual = previousLiciusActual;
        } else {
          totalActual = mariellyActual;
          previousTotalActual = previousMariellyActual;
        }

        // Extract additional info for notes and review flags
        const liciusEntryId = liciusEntry?.id;
        const mariellyEntryId = mariellyEntry?.id;
        const liciusNotes = liciusEntry?.notes || "";
        const mariellyNotes = mariellyEntry?.notes || "";
        const liciusReviewRequested = liciusEntry?.reviewRequested || false;
        const mariellyReviewRequested = mariellyEntry?.reviewRequested || false;

        return {
          item,
          liciusPlanned,
          liciusActual,
          mariellyPlanned,
          mariellyActual,
          totalActual,
          liciusEntryId,
          mariellyEntryId,
          liciusNotes,
          mariellyNotes,
          liciusReviewRequested,
          mariellyReviewRequested,
          // Valores do mês anterior para tendências
          previousLiciusPlanned,
          previousLiciusActual,
          previousMariellyPlanned,
          previousMariellyActual,
          previousTotalActual,
        };
      });

      return {
        category,
        items: itemsWithEntries,
      };
    });
  }, [categories, items, filteredEntries, previousEntries, searchTerm, filterCustomCategory, personView]);

  const handleUpdateEntry = (
    itemId: number,
    person: "licius" | "marielly",
    field: "plannedValue" | "actualValue",
    cents: number // Recebe centavos diretamente do CurrencyInput
  ) => {
    // Restringir que um usuário edite valores da outra pessoa. Se um perfil
    // estiver selecionado e a pessoa do campo for diferente, exibimos um aviso
    // e não enviamos a mutação.
    if (selectedUser && selectedUser !== person) {
      toast.error("Você não tem permissão para editar os valores de outra pessoa.");
      return;
    }

    const existingEntry = entries.find(
      (e) => e.itemId === itemId && e.person === person && e.month === selectedMonth && e.year === selectedYear
    );

    upsertEntry.mutate({
      id: existingEntry?.id,
      itemId,
      month: selectedMonth,
      year: selectedYear,
      person,
      [field]: cents,
    });
  };

  const handleDragEnd = (event: DragEndEvent, categoryId: number) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const categoryData = categorizedData.find((c) => c.category.id === categoryId);
    if (!categoryData) return;

    const oldIndex = categoryData.items.findIndex((i) => i.item.id === active.id);
    const newIndex = categoryData.items.findIndex((i) => i.item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedItems = arrayMove(categoryData.items, oldIndex, newIndex);
    const itemIds = reorderedItems.map((i) => i.item.id);

    reorderItems.mutate({ categoryId, itemIds });
  };

  if (categoriesLoading || itemsLoading || entriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-7xl">
        {/* Header */}
        {/* Título */}
        <div className="mb-6">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">
            PLANEJAMENTO FINANCEIRO
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Controle suas finanças mensais</p>
        </div>

        {/* Busca e Filtros */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCustomCategory} onValueChange={setFilterCustomCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {Array.from(new Set(items.map(i => i.customCategory).filter(Boolean))).map((cat) => (
                <SelectItem key={cat} value={cat!}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Toggle de visualização por pessoa (Todos, Lícius, Marielly) */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm font-medium">Visualizar:</span>
          <Button
            variant={personView === "all" ? "default" : "outline"}
            onClick={() => setPersonView("all")}
            className="px-4"
          >
            Todos
          </Button>
          <Button
            variant={personView === "licius" ? "default" : "outline"}
            onClick={() => setPersonView("licius")}
            className="px-4"
          >
            Lícius
          </Button>
          <Button
            variant={personView === "marielly" ? "default" : "outline"}
            onClick={() => setPersonView("marielly")}
            className="px-4"
          >
            Marielly
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          {/* Navegação de mês */}
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
              onClick={() => setLocation("/graficos")}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Gráficos
            </Button>
            <Button 
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
              onClick={() => setLocation("/anual")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Visão Anual
            </Button>
            <Button 
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
              onClick={() => setLocation("/comparativo")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Comparativo
            </Button>
            <Button 
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
              onClick={() => setLocation("/historico")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Histórico
            </Button>
            <Button 
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white border-0"
              onClick={async () => {
                const result = await checkNotificationsMutation.mutateAsync({
                  month: selectedMonth,
                  year: selectedYear,
                });
                if (result.notificationsSent > 0) {
                  toast.success(`${result.notificationsSent} notificação(s) enviada(s)!`);
                } else {
                  toast.info('Nenhum alerta de orçamento detectado.');
                }
              }}
              disabled={checkNotificationsMutation.isPending}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {checkNotificationsMutation.isPending ? 'Verificando...' : 'Verificar Alertas'}
            </Button>
            <Button 
              className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white border-0"
              onClick={() => setIsDuplicateDialogOpen(true)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicar Mês
            </Button>
            <Button 
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0"
              onClick={() => setIsCopyPreviousDialogOpen(true)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Copiar Mês Anterior
            </Button>
            <Button 
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-0"
              onClick={() => setLocation("/analise-ia")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Análise IA
            </Button>
            <Button 
              className="bg-gradient-to-r from-slate-600 to-gray-600 hover:from-slate-700 hover:to-gray-700 text-white border-0"
              onClick={async () => {
                await createBackup.mutateAsync();
              }}
              disabled={createBackup.isPending}
            >
              <Database className="h-4 w-4 mr-2" />
              {createBackup.isPending ? 'Criando...' : 'Fazer Backup'}
            </Button>
            <Button 
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0"
              onClick={() => setLocation("/categorias")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar Categorias
            </Button>
            <Button 
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white border-0"
              onClick={() => setLocation("/configuracoes")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>

            {/* Botão para acessar o painel de Metas */}
            <Button 
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
              onClick={() => setLocation("/metas")}
            >
              <Flag className="h-4 w-4 mr-2" />
              Metas
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                exportToExcel({
                  categories,
                  items,
                  entries,
                  month: selectedMonth,
                  year: selectedYear,
                });
                toast.success("Relatório Excel exportado!");
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                exportToPDF({
                  categories,
                  items,
                  entries,
                  month: selectedMonth,
                  year: selectedYear,
                });
                toast.success("Relatório PDF exportado!");
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setValuesHidden(!valuesHidden)}
              title={valuesHidden ? "Mostrar valores" : "Ocultar valores"}
            >
              {valuesHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToPreviousMonth}
              className="touch-manipulation min-h-[44px] min-w-[44px]"
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold capitalize min-w-[200px] text-center">
              {monthName}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNextMonth}
              className="touch-manipulation min-h-[44px] min-w-[44px]"
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-blue-500/20 border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-400">Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-300">{valuesHidden ? '•••' : formatCurrency(summary.totalIncome)}</div>
            </CardContent>
          </Card>

          <Card className="bg-red-600/20 border-red-600/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-400">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-300">{valuesHidden ? '•••' : formatCurrency(summary.totalExpense)}</div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/20 border-green-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-400">Investimentos</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-300">{valuesHidden ? '•••' : formatCurrency(summary.totalInvestment)}</div>
            </CardContent>
          </Card>

          <Card className={`${summary.balance >= 0 ? 'bg-amber-500/20 border-amber-500/50' : 'bg-red-600/20 border-red-600/50'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-sm font-medium ${summary.balance >= 0 ? 'text-amber-400' : 'text-red-400'}`}>Saldo</CardTitle>
              <Wallet className={`h-4 w-4 ${summary.balance >= 0 ? 'text-amber-400' : 'text-red-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-amber-300' : 'text-red-300'}`}>{valuesHidden ? '•••' : formatCurrency(summary.balance)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Pizza de Despesas */}
        {expensePieData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Distribuição de Despesas</CardTitle>
              <CardDescription>Percentual de gastos por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpensePieChart data={expensePieData} />
            </CardContent>
          </Card>
        )}

        {/* Alertas de orçamento */}
        {alerts.length > 0 && (
          <Card className="mb-8 border-yellow-500/50 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Orçamento
              </CardTitle>
              <CardDescription>Itens com gastos acima da meta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                    <div>
                      <div className="font-medium">{alert.itemName}</div>
                      <div className="text-sm text-muted-foreground">{alert.categoryName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">Meta: {formatCurrency(alert.planned)}</div>
                      <div className="text-sm font-semibold text-yellow-400">
                        Real: {formatCurrency(alert.actual)} (+{formatCurrency(alert.difference)})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabelas por categoria */}
        <div className="space-y-6">
          {categorizedData.map(({ category, items: categoryItems }) => {
            if (categoryItems.length === 0) return null;

            let borderColor = "border-l-primary";
            let textColor = "";
            
            if (category.type === "income") {
              borderColor = "border-l-blue-500";
              textColor = "text-blue-400";
            } else if (category.type === "expense") {
              borderColor = "border-l-red-500";
              textColor = "text-red-400";
            } else if (category.type === "investment") {
              borderColor = "border-l-green-500";
              textColor = "text-green-400";
            }

            return (
              <Card key={category.id} className={`border-l-4 ${borderColor}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className={textColor}>{category.name}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
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
                  <div className="overflow-x-auto -mx-6 px-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    <Table className="min-w-[1000px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 min-w-[48px]"></TableHead>
                          <TableHead className="min-w-[200px]">Item</TableHead>
                          <TableHead className="text-center min-w-[140px]">Categoria</TableHead>
                          {/* Condicionalmente renderizar colunas conforme a pessoa selecionada */}
                          {personView !== "marielly" && (
                            <>
                              <TableHead className="text-center min-w-[140px]">Meta (Lícius)</TableHead>
                              <TableHead className="text-center min-w-[140px]">Real (Lícius)</TableHead>
                            </>
                          )}
                          {personView !== "licius" && (
                            <>
                              <TableHead className="text-center min-w-[140px]">Meta (Marielly)</TableHead>
                              <TableHead className="text-center min-w-[140px]">Real (Marielly)</TableHead>
                            </>
                          )}
                          {/* A coluna de total sempre aparece. O texto muda conforme a visualização */}
                          <TableHead className={`text-center font-semibold min-w-[140px] ${textColor}`}>
                            {personView === "all" ? "Total (Real)" : "Real"}
                          </TableHead>
                          <TableHead className="text-center min-w-[110px]">Comentários</TableHead>
                          <TableHead className="text-center min-w-[80px]">Anexos</TableHead>
                          <TableHead className="text-center min-w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(event, category.id)}
                        >
                          <SortableContext
                            items={categoryItems.map((i) => i.item.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {categoryItems.map(({ 
                              item, 
                              liciusPlanned, 
                              liciusActual, 
                              mariellyPlanned, 
                              mariellyActual, 
                              totalActual, 
                              liciusEntryId, 
                              mariellyEntryId, 
                              liciusNotes, 
                              mariellyNotes, 
                              liciusReviewRequested, 
                              mariellyReviewRequested,
                              previousLiciusPlanned,
                              previousLiciusActual,
                              previousMariellyPlanned,
                              previousMariellyActual,
                              previousTotalActual,
                            }) => (
                              <SortableTableRow key={item.id} id={item.id} dragHandle={<GripVertical className="h-4 w-4 text-muted-foreground" />}>
                                <TableCell className={`font-medium ${category.type === 'investment' ? textColor : ''}`}>{item.name}</TableCell>
                                <TableCell className="text-center text-sm">
                                  <Select
                                    value={item.customCategory || "none"}
                                    onValueChange={(value) => {
                                      if (value === "new") {
                                        const newCat = prompt("Digite o nome da nova categoria:");
                                        if (newCat && newCat.trim()) {
                                          updateItem.mutate({
                                            itemId: item.id,
                                            name: item.name,
                                            customCategory: newCat.trim(),
                                          });
                                        }
                                      } else {
                                        updateItem.mutate({
                                          itemId: item.id,
                                          name: item.name,
                                          customCategory: value === "none" ? undefined : value,
                                        });
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">-</SelectItem>
                                      <SelectItem value="Receita">Receita</SelectItem>
                                      <SelectItem value="Renda">Renda</SelectItem>
                                      <SelectItem value="Salário">Salário</SelectItem>
                                      <SelectItem value="Moradia">Moradia</SelectItem>
                                      <SelectItem value="Transporte">Transporte</SelectItem>
                                      <SelectItem value="Alimentação">Alimentação</SelectItem>
                                      <SelectItem value="Saúde">Saúde</SelectItem>
                                      <SelectItem value="Educação">Educação</SelectItem>
                                      <SelectItem value="Lazer">Lazer</SelectItem>
                                      <SelectItem value="Outros">Outros</SelectItem>
                                      {Array.from(new Set(items.map(i => i.customCategory).filter(Boolean))).map((cat) => (
                                        <SelectItem key={cat} value={cat!}>
                                          {cat}
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="new" className="text-primary font-semibold">
                                        + Criar nova categoria
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                {/* Colunas de Lícius: planejado e real. Renderizar somente se a visualização não for exclusiva de Marielly */}
                                {personView !== "marielly" && (
                                  <>
                                    <TableCell className="text-center">
                                      {valuesHidden ? (
                                        <div className="w-28 text-center">•••</div>
                                      ) : (
                                        <div className="flex items-center justify-center">
                                          <TrendIndicator 
                                            currentValue={liciusPlanned} 
                                            previousValue={previousLiciusPlanned} 
                                          />
                                          <CurrencyInput
                                            value={liciusPlanned}
                                            className="w-28 text-center"
                                            onBlur={(value) =>
                                              handleUpdateEntry(item.id, "licius", "plannedValue", value)
                                            }
                                          />
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {valuesHidden ? (
                                        <div className="w-28 text-center">•••</div>
                                      ) : (
                                        <div className="flex items-center justify-center">
                                          <TrendIndicator 
                                            currentValue={liciusActual} 
                                            previousValue={previousLiciusActual} 
                                          />
                                          <CurrencyInput
                                            value={liciusActual}
                                            className="w-28 text-center"
                                            onBlur={(value) =>
                                              handleUpdateEntry(item.id, "licius", "actualValue", value)
                                            }
                                          />
                                        </div>
                                      )}
                                    </TableCell>
                                  </>
                                )}
                                {/* Colunas de Marielly: planejado e real. Renderizar somente se a visualização não for exclusiva de Lícius */}
                                {personView !== "licius" && (
                                  <>
                                    <TableCell className="text-center">
                                      {valuesHidden ? (
                                        <div className="w-28 text-center">•••</div>
                                      ) : (
                                        <div className="flex items-center justify-center">
                                          <TrendIndicator 
                                            currentValue={mariellyPlanned} 
                                            previousValue={previousMariellyPlanned} 
                                          />
                                          <CurrencyInput
                                            value={mariellyPlanned}
                                            className="w-28 text-center"
                                            onBlur={(value) =>
                                              handleUpdateEntry(item.id, "marielly", "plannedValue", value)
                                            }
                                          />
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {valuesHidden ? (
                                        <div className="w-28 text-center">•••</div>
                                      ) : (
                                        <div className="flex items-center justify-center">
                                          <TrendIndicator 
                                            currentValue={mariellyActual} 
                                            previousValue={previousMariellyActual} 
                                          />
                                          <CurrencyInput
                                            value={mariellyActual}
                                            className="w-28 text-center"
                                            onBlur={(value) =>
                                              handleUpdateEntry(item.id, "marielly", "actualValue", value)
                                            }
                                          />
                                        </div>
                                      )}
                                    </TableCell>
                                  </>
                                )}
                                {/* Coluna de total real (ou real único quando filtrado). Sempre renderizada */}
                                <TableCell className={`text-center font-bold ${textColor}`}>
                                  {valuesHidden ? (
                                    '•••'
                                  ) : (
                                    <div className="flex items-center justify-center">
                                      <TrendIndicator 
                                        currentValue={totalActual} 
                                        previousValue={previousTotalActual} 
                                      />
                                      <span>{formatCurrency(totalActual)}</span>
                                    </div>
                                  )}
                                </TableCell>
                                {/* Coluna de comentários e revisão */}
                                <TableCell className="text-center">
                                  {/* Mostrar botão para solicitar revisão do parceiro correspondente. Se não houver entry para a outra pessoa, não mostrar. */}
                                  {(() => {
                                    if (!selectedUser) return null;
                                    // Quando o usuário atual é Lícius, ele pode solicitar revisão da entrada da Marielly
                                    if (selectedUser === 'licius' && mariellyEntryId) {
                                      const alreadyRequested = mariellyReviewRequested;
                                      return (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          title={alreadyRequested ? 'Revisão já solicitada' : 'Solicitar revisão'}
                                          onClick={() => {
                                            if (alreadyRequested) {
                                              toast.info('Revisão já solicitada para este lançamento.');
                                              return;
                                            }
                                            const note = prompt('Deixe um comentário para seu parceiro:');
                                            requestReview.mutate({ entryId: mariellyEntryId, notes: note || undefined });
                                          }}
                                        >
                                          <MessageCircle
                                            className={alreadyRequested ? 'h-4 w-4 text-red-500' : 'h-4 w-4 text-green-600'}
                                          />
                                        </Button>
                                      );
                                    }
                                    // Quando o usuário atual é Marielly, pode solicitar revisão da entrada de Lícius
                                    if (selectedUser === 'marielly' && liciusEntryId) {
                                      const alreadyRequested = liciusReviewRequested;
                                      return (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          title={alreadyRequested ? 'Revisão já solicitada' : 'Solicitar revisão'}
                                          onClick={() => {
                                            if (alreadyRequested) {
                                              toast.info('Revisão já solicitada para este lançamento.');
                                              return;
                                            }
                                            const note = prompt('Deixe um comentário para seu parceiro:');
                                            requestReview.mutate({ entryId: liciusEntryId, notes: note || undefined });
                                          }}
                                        >
                                          <MessageCircle
                                            className={alreadyRequested ? 'h-4 w-4 text-red-500' : 'h-4 w-4 text-green-600'}
                                          />
                                        </Button>
                                      );
                                    }
                                    return null;
                                  })()}
                                </TableCell>
                                <TableCell className="text-center">
                                  <AttachmentUpload itemId={item.id} month={selectedMonth} year={selectedYear} />
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setEditingItemId(item.id);
                                        setEditItemName(item.name);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-blue-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setArchiveItemId(item.id);
                                        setArchiveMonth(selectedMonth);
                                        setArchiveYear(selectedYear);
                                        setIsArchiveDialogOpen(true);
                                      }}
                                      title="Arquivar item"
                                    >
                                      <Archive className="h-4 w-4 text-orange-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        if (confirm(`Deseja realmente excluir "${item.name}"?`)) {
                                          deleteItem.mutate({ id: item.id });
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </SortableTableRow>
                            ))}
                          </SortableContext>
                        </DndContext>
                        {/* Linha de Totais */}
                        <TableRow className="font-bold bg-muted/50 border-t-2">
                          <TableCell colSpan={3} className="text-right">TOTAL:</TableCell>
                          {/* Totais de Lícius: renderizados apenas se esta coluna estiver visível */}
                          {personView !== "marielly" && (
                            <>
                              <TableCell className="text-center">
                                {valuesHidden ? '•••' : formatCurrency(
                                  categoryItems.reduce((sum, { liciusPlanned }) => sum + liciusPlanned, 0)
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {valuesHidden ? '•••' : formatCurrency(
                                  categoryItems.reduce((sum, { liciusActual }) => sum + liciusActual, 0)
                                )}
                              </TableCell>
                            </>
                          )}
                          {/* Totais de Marielly: renderizados apenas se esta coluna estiver visível */}
                          {personView !== "licius" && (
                            <>
                              <TableCell className="text-center">
                                {valuesHidden ? '•••' : formatCurrency(
                                  categoryItems.reduce((sum, { mariellyPlanned }) => sum + mariellyPlanned, 0)
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {valuesHidden ? '•••' : formatCurrency(
                                  categoryItems.reduce((sum, { mariellyActual }) => sum + mariellyActual, 0)
                                )}
                              </TableCell>
                            </>
                          )}
                          {/* Total geral (ou total da pessoa filtrada) */}
                          <TableCell className="text-center text-primary">
                            {valuesHidden ? '•••' : formatCurrency(
                              categoryItems.reduce((sum, { totalActual }) => sum + totalActual, 0)
                            )}
                          </TableCell>
                          {/* Coluna vazia para Comentários no total */}
                          <TableCell></TableCell>
                          {/* Coluna vazia para Anexos no total */}
                          <TableCell></TableCell>
                          {/* Coluna vazia para Ações no total */}
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Dialog para duplicar mês */}
        <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicar Mês</DialogTitle>
              <DialogDescription>
                Copie os lançamentos do mês atual para outro mês
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="target-month">Mês de Destino</Label>
                <Select
                  value={duplicateTargetMonth.toString()}
                  onValueChange={(v) => setDuplicateTargetMonth(parseInt(v))}
                >
                  <SelectTrigger id="target-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2024, month - 1).toLocaleDateString("pt-BR", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-year">Ano de Destino</Label>
                <Select
                  value={duplicateTargetYear.toString()}
                  onValueChange={(v) => setDuplicateTargetYear(parseInt(v))}
                >
                  <SelectTrigger id="target-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => selectedYear - 1 + i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-actual"
                  checked={copyActualValues}
                  onCheckedChange={(checked) => setCopyActualValues(checked === true)}
                />
                <Label htmlFor="copy-actual" className="text-sm font-normal cursor-pointer">
                  Copiar também valores reais (não apenas metas)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  duplicateMonth.mutate({
                    sourceMonth: selectedMonth,
                    sourceYear: selectedYear,
                    targetMonth: duplicateTargetMonth,
                    targetYear: duplicateTargetYear,
                    copyActualValues,
                  });
                }}
                disabled={duplicateMonth.isPending}
              >
                {duplicateMonth.isPending ? "Duplicando..." : "Duplicar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para copiar mês anterior */}
        <Dialog open={isCopyPreviousDialogOpen} onOpenChange={setIsCopyPreviousDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Copiar Mês Anterior</DialogTitle>
              <DialogDescription>
                Copiar todos os valores planejados do mês anterior para o mês atual?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Esta ação copiará apenas os valores planejados (Meta Lícius e Meta Marielly) de <strong>{new Date(selectedMonth === 1 ? selectedYear - 1 : selectedYear, selectedMonth === 1 ? 11 : selectedMonth - 2).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong> para <strong>{new Date(selectedYear, selectedMonth - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Os valores reais permanecerão em branco para preenchimento manual.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCopyPreviousDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  copyPreviousMonthMutation.mutate({
                    month: selectedMonth,
                    year: selectedYear,
                  });
                }}
                disabled={copyPreviousMonthMutation.isPending}
              >
                {copyPreviousMonthMutation.isPending ? "Copiando..." : "Copiar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para arquivar item */}
        <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Arquivar Item</DialogTitle>
              <DialogDescription>
                Selecione a partir de qual mês/ano este item ficará inativo. O item continuará visível em meses anteriores.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="archive-month">Mês de Início do Arquivamento</Label>
                <Select
                  value={archiveMonth.toString()}
                  onValueChange={(v) => setArchiveMonth(parseInt(v))}
                >
                  <SelectTrigger id="archive-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2024, month - 1).toLocaleDateString("pt-BR", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="archive-year">Ano de Início do Arquivamento</Label>
                <Select
                  value={archiveYear.toString()}
                  onValueChange={(v) => setArchiveYear(parseInt(v))}
                >
                  <SelectTrigger id="archive-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => selectedYear - 1 + i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (archiveItemId) {
                    archiveItem.mutate({
                      id: archiveItemId,
                      month: archiveMonth,
                      year: archiveYear,
                    });
                  }
                }}
                disabled={archiveItem.isPending}
              >
                {archiveItem.isPending ? "Arquivando..." : "Arquivar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para adicionar item */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Item</DialogTitle>
              <DialogDescription>
                Crie um novo item de orçamento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item-name">Nome do Item</Label>
                <Input
                  id="item-name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Ex: Aluguel, Salário, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-category">Categoria (opcional)</Label>
                <Input
                  id="item-category"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  placeholder="Ex: Moradia, Alimentação, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!selectedCategoryId || !newItemName.trim()) {
                    toast.error("Preencha o nome do item");
                    return;
                  }
                  createItem.mutate({
                    categoryId: selectedCategoryId,
                    name: newItemName.trim(),
                    customCategory: newItemCategory.trim() || undefined,
                  });
                }}
                disabled={createItem.isPending}
              >
                {createItem.isPending ? "Criando..." : "Criar Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar nome do item */}
        <Dialog open={editingItemId !== null} onOpenChange={(open) => !open && setEditingItemId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Item</DialogTitle>
              <DialogDescription>
                Altere o nome do item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-item-name">Nome do Item</Label>
                <Input
                  id="edit-item-name"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  placeholder="Digite o novo nome"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItemId(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!editItemName.trim()) {
                    toast.error("O nome não pode estar vazio");
                    return;
                  }
                  updateItemName.mutate({
                    itemId: editingItemId!,
                    name: editItemName.trim(),
                  });
                }}
                disabled={updateItemName.isPending}
              >
                {updateItemName.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
