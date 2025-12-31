import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Plus,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Heart,
  Home,
  Plane,
  PartyPopper,
  MoreHorizontal,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ProjectsPage() {
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  const utils = trpc.useUtils();

  // Queries
  const { data: projects = [], isLoading } = trpc.project.listProjects.useQuery({ status: filterStatus });
  const { data: summary } = trpc.project.getProjectsSummary.useQuery();

  // Mutations
  const createProject = trpc.project.createProject.useMutation({
    onSuccess: (data) => {
      utils.project.listProjects.invalidate();
      utils.project.getProjectsSummary.invalidate();
      toast.success("Projeto criado!");
      setShowCreateDialog(false);
      // Navegar para o projeto
      setLocation(`/projetos/${data.projectId}`);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "other" as "wedding" | "renovation" | "travel" | "event" | "other",
    startDate: "",
    endDate: "",
    totalBudget: "",
    color: "#3b82f6",
    icon: "briefcase",
  });

  const handleCreate = () => {
    if (!formData.name || !formData.startDate || !formData.totalBudget) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    createProject.mutate({
      ...formData,
      totalBudget: Math.round(parseFloat(formData.totalBudget) * 100),
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "other",
      startDate: "",
      endDate: "",
      totalBudget: "",
      color: "#3b82f6",
      icon: "briefcase",
    });
  };

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "wedding":
        return <Heart className="h-5 w-5" />;
      case "renovation":
        return <Home className="h-5 w-5" />;
      case "travel":
        return <Plane className="h-5 w-5" />;
      case "event":
        return <PartyPopper className="h-5 w-5" />;
      default:
        return <Briefcase className="h-5 w-5" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "wedding":
        return "Casamento";
      case "renovation":
        return "Reforma";
      case "travel":
        return "Viagem";
      case "event":
        return "Evento";
      default:
        return "Outro";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "planning":
        return <Badge variant="outline" className="bg-blue-500/10"><Clock className="h-3 w-3 mr-1" />Planejando</Badge>;
      case "active":
        return <Badge className="bg-green-500"><TrendingUp className="h-3 w-3 mr-1" />Ativo</Badge>;
      case "completed":
        return <Badge className="bg-purple-500"><CheckCircle className="h-3 w-3 mr-1" />Concluído</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Projetos</h1>
                <p className="text-sm text-muted-foreground">
                  Orçamentos temporários para eventos específicos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? undefined : v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="planning">Planejando</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-600 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Planejando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{summary?.planning || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{summary?.active || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-purple-600 flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4" />
                Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{summary?.completed || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-orange-600 flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4" />
                Orçamento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary?.totalBudget || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando projetos...</p>
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum projeto ainda</h3>
              <p className="text-muted-foreground mb-4">
                Crie projetos para organizar orçamentos de eventos específicos
              </p>
              <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Projeto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-all hover:shadow-lg"
                onClick={() => setLocation(`/projetos/${project.id}`)}
                style={{ borderLeft: `4px solid ${project.color}` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${project.color}20` }}>
                        {getTypeIcon(project.type)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <CardDescription>{getTypeName(project.type)}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(project.startDate)}
                      {project.endDate && ` - ${formatDate(project.endDate)}`}
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Orçamento</span>
                        <span className="font-semibold">{formatCurrency(project.totalBudget)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: Criar Projeto */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
            <DialogDescription>
              Crie um orçamento temporário para um evento específico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome do Projeto *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Casamento, Reforma da Casa, Viagem Europa"
                />
              </div>

              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes do projeto..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Tipo *</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">Casamento</SelectItem>
                    <SelectItem value="renovation">Reforma</SelectItem>
                    <SelectItem value="travel">Viagem</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Orçamento Total (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.totalBudget}
                  onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                  placeholder="50000.00"
                />
              </div>

              <div>
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>

              <div>
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createProject.isLoading}>
              {createProject.isLoading ? "Criando..." : "Criar Projeto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
