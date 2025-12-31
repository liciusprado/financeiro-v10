import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-grid-layout/css/resizable.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layout,
  Plus,
  Save,
  RotateCcw,
  Edit,
  Trash2,
  Star,
  StarOff,
  Grid3x3,
  Settings,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

// Import widgets
import { BalanceWidget } from "@/components/widgets/BalanceWidget";
import { ExpensesSummaryWidget } from "@/components/widgets/ExpensesSummaryWidget";
import { IncomeSummaryWidget } from "@/components/widgets/IncomeSummaryWidget";
import { ChartExpensesWidget } from "@/components/widgets/ChartExpensesWidget";
import { RecentTransactionsWidget } from "@/components/widgets/RecentTransactionsWidget";
import { BudgetProgressWidget } from "@/components/widgets/BudgetProgressWidget";

type WidgetType = 
  | "balance"
  | "expenses-summary"
  | "income-summary"
  | "chart-expenses"
  | "chart-income"
  | "recent-transactions"
  | "budget-progress"
  | "goals-summary"
  | "projects-summary"
  | "alerts-summary"
  | "category-breakdown"
  | "monthly-comparison"
  | "quick-actions";

interface WidgetConfig {
  id: string;
  type: WidgetType;
  title?: string;
  position: {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
  };
  config?: Record<string, any>;
}

export default function CustomDashboardPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showPresetsDialog, setShowPresetsDialog] = useState(false);
  const [showLayoutsDialog, setShowLayoutsDialog] = useState(false);
  const [layoutName, setLayoutName] = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: currentLayout, isLoading } = trpc.dashboard.getDefaultLayout.useQuery();
  const { data: layouts = [] } = trpc.dashboard.listLayouts.useQuery();
  const { data: presets = [] } = trpc.dashboard.listPresets.useQuery();

  // Mutations
  const updateLayout = trpc.dashboard.updateLayout.useMutation({
    onSuccess: () => {
      utils.dashboard.getDefaultLayout.invalidate();
      utils.dashboard.listLayouts.invalidate();
      toast.success("Layout atualizado!");
      setIsEditing(false);
    },
  });

  const createLayout = trpc.dashboard.createLayout.useMutation({
    onSuccess: () => {
      utils.dashboard.listLayouts.invalidate();
      toast.success("Layout salvo!");
      setShowSaveDialog(false);
      setLayoutName("");
    },
  });

  const deleteLayout = trpc.dashboard.deleteLayout.useMutation({
    onSuccess: () => {
      utils.dashboard.listLayouts.invalidate();
      toast.success("Layout deletado!");
    },
  });

  const setDefaultLayout = trpc.dashboard.setDefaultLayout.useMutation({
    onSuccess: () => {
      utils.dashboard.getDefaultLayout.invalidate();
      utils.dashboard.listLayouts.invalidate();
      toast.success("Layout padrão definido!");
    },
  });

  const createFromPreset = trpc.dashboard.createFromPreset.useMutation({
    onSuccess: () => {
      utils.dashboard.getDefaultLayout.invalidate();
      utils.dashboard.listLayouts.invalidate();
      toast.success("Layout criado do preset!");
      setShowPresetsDialog(false);
    },
  });

  const [tempLayout, setTempLayout] = useState<WidgetConfig[]>([]);

  // Atualizar tempLayout quando currentLayout mudar
  useState(() => {
    if (currentLayout?.layout) {
      setTempLayout(currentLayout.layout);
    }
  });

  const handleLayoutChange = useCallback((layout: any[]) => {
    if (!isEditing) return;

    setTempLayout((prev) =>
      prev.map((widget) => {
        const updated = layout.find((l) => l.i === widget.id);
        if (updated) {
          return {
            ...widget,
            position: {
              ...widget.position,
              x: updated.x,
              y: updated.y,
              w: updated.w,
              h: updated.h,
            },
          };
        }
        return widget;
      })
    );
  }, [isEditing]);

  const handleSaveLayout = () => {
    if (!currentLayout) return;

    updateLayout.mutate({
      layoutId: currentLayout.id,
      layout: tempLayout,
    });
  };

  const handleSaveAsNew = () => {
    if (!layoutName.trim()) {
      toast.error("Digite um nome para o layout");
      return;
    }

    createLayout.mutate({
      name: layoutName,
      layout: tempLayout,
    });
  };

  const handleResetLayout = () => {
    if (currentLayout?.layout) {
      setTempLayout(currentLayout.layout);
      toast.info("Layout resetado");
    }
  };

  const renderWidget = (widget: WidgetConfig) => {
    const commonProps = {
      title: widget.title,
      config: widget.config,
    };

    switch (widget.type) {
      case "balance":
        return <BalanceWidget {...commonProps} />;
      case "expenses-summary":
        return <ExpensesSummaryWidget {...commonProps} />;
      case "income-summary":
        return <IncomeSummaryWidget {...commonProps} />;
      case "chart-expenses":
        return <ChartExpensesWidget {...commonProps} />;
      case "recent-transactions":
        return <RecentTransactionsWidget {...commonProps} />;
      case "budget-progress":
        return <BudgetProgressWidget {...commonProps} />;
      default:
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{widget.title || widget.type}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Widget em desenvolvimento</p>
            </CardContent>
          </Card>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  const gridLayout = tempLayout.map((w) => w.position);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Layout className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Dashboard Personalizável</h1>
                <p className="text-sm text-muted-foreground">
                  {currentLayout?.name || "Layout Padrão"}
                  {isEditing && (
                    <Badge variant="outline" className="ml-2">
                      Editando
                    </Badge>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setShowPresetsDialog(true)}>
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    Presets
                  </Button>
                  <Button variant="outline" onClick={() => setShowLayoutsDialog(true)}>
                    <Layout className="h-4 w-4 mr-2" />
                    Layouts
                  </Button>
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleResetLayout}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Resetar
                  </Button>
                  <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Salvar Como
                  </Button>
                  <Button onClick={handleSaveLayout} disabled={updateLayout.isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                  <Button variant="ghost" onClick={() => { setIsEditing(false); handleResetLayout(); }}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {isEditing && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Modo de Edição Ativo
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Arraste os widgets para reorganizar. Redimensione pelos cantos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <GridLayout
          className="layout"
          layout={gridLayout}
          cols={12}
          rowHeight={80}
          width={1200}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={handleLayoutChange}
          compactType="vertical"
          preventCollision={false}
        >
          {tempLayout.map((widget) => (
            <div key={widget.id} className={isEditing ? "cursor-move" : ""}>
              {renderWidget(widget)}
            </div>
          ))}
        </GridLayout>
      </div>

      {/* Dialog: Salvar Como */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Layout</DialogTitle>
            <DialogDescription>
              Salve o layout atual com um novo nome
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Nome do Layout</Label>
            <Input
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="Meu Layout Personalizado"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAsNew}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Presets */}
      <Dialog open={showPresetsDialog} onOpenChange={setShowPresetsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Layouts Pré-Configurados</DialogTitle>
            <DialogDescription>Escolha um template para começar</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {presets.map((preset: any) => (
              <Card key={preset.id} className="cursor-pointer hover:border-primary">
                <CardHeader>
                  <CardTitle className="text-base">{preset.name}</CardTitle>
                  {preset.description && (
                    <CardDescription>{preset.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => createFromPreset.mutate({ presetId: preset.id })}
                  >
                    Usar Este Layout
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Meus Layouts */}
      <Dialog open={showLayoutsDialog} onOpenChange={setShowLayoutsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Meus Layouts</DialogTitle>
            <DialogDescription>Gerencie seus layouts salvos</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {layouts.map((layout: any) => (
              <Card key={layout.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{layout.name}</CardTitle>
                      {layout.isDefault && (
                        <Badge className="bg-blue-500">Padrão</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!layout.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDefaultLayout.mutate({ layoutId: layout.id })}
                        >
                          <StarOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Deletar este layout?")) {
                            deleteLayout.mutate({ layoutId: layout.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
