import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  History,
  Template,
  Settings,
  Play,
  AlertTriangle,
  CheckCircle,
  Mail,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

type AlertCondition = {
  field: string;
  operator: ">" | ">=" | "<" | "<=" | "==" | "!=" | "contains";
  value: number | string;
  type: "expense" | "income" | "balance" | "budget" | "category";
};

type AlertRule = {
  conditions: AlertCondition[];
  logic: "AND" | "OR";
  message: string;
};

export default function CustomAlertsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: alerts = [], isLoading } = trpc.customAlert.listAlerts.useQuery();
  const { data: templates = [] } = trpc.customAlert.listTemplates.useQuery();
  const { data: history = [] } = trpc.customAlert.getTriggerHistory.useQuery();
  const { data: channelsConfig } = trpc.customAlert.getChannelsConfig.useQuery();

  // Mutations
  const createAlert = trpc.customAlert.createAlert.useMutation({
    onSuccess: () => {
      utils.customAlert.listAlerts.invalidate();
      toast.success("Alerta criado!");
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateAlert = trpc.customAlert.updateAlert.useMutation({
    onSuccess: () => {
      utils.customAlert.listAlerts.invalidate();
      toast.success("Alerta atualizado!");
    },
  });

  const deleteAlert = trpc.customAlert.deleteAlert.useMutation({
    onSuccess: () => {
      utils.customAlert.listAlerts.invalidate();
      toast.success("Alerta deletado!");
    },
  });

  const saveTemplate = trpc.customAlert.saveTemplate.useMutation({
    onSuccess: () => {
      utils.customAlert.listTemplates.invalidate();
      toast.success("Template salvo!");
    },
  });

  const createFromTemplate = trpc.customAlert.createFromTemplate.useMutation({
    onSuccess: () => {
      utils.customAlert.listAlerts.invalidate();
      toast.success("Alerta criado do template!");
      setShowTemplatesDialog(false);
    },
  });

  const configureChannels = trpc.customAlert.configureChannels.useMutation({
    onSuccess: () => {
      utils.customAlert.getChannelsConfig.invalidate();
      toast.success("Canais configurados!");
      setShowConfigDialog(false);
    },
  });

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    conditions: AlertCondition[];
    logic: "AND" | "OR";
    message: string;
    channels: string[];
    frequency: "realtime" | "daily" | "weekly" | "monthly";
  }>({
    name: "",
    description: "",
    conditions: [],
    logic: "AND",
    message: "",
    channels: ["push"],
    frequency: "realtime",
  });

  const [currentCondition, setCurrentCondition] = useState<AlertCondition>({
    field: "expense.mercado",
    operator: ">",
    value: 0,
    type: "expense",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      conditions: [],
      logic: "AND",
      message: "",
      channels: ["push"],
      frequency: "realtime",
    });
    setCurrentCondition({
      field: "expense.mercado",
      operator: ">",
      value: 0,
      type: "expense",
    });
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [...formData.conditions, currentCondition],
    });
    setCurrentCondition({
      field: "expense.mercado",
      operator: ">",
      value: 0,
      type: "expense",
    });
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const handleCreate = () => {
    if (!formData.name || formData.conditions.length === 0 || !formData.message) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createAlert.mutate({
      name: formData.name,
      description: formData.description,
      conditions: {
        conditions: formData.conditions,
        logic: formData.logic,
        message: formData.message,
      },
      channels: formData.channels as any[],
      frequency: formData.frequency,
    });
  };

  const toggleAlert = (alertId: number, enabled: boolean) => {
    updateAlert.mutate({ alertId, enabled: !enabled });
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "push":
        return <Smartphone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getOperatorLabel = (op: string) => {
    const labels: Record<string, string> = {
      ">": "maior que",
      ">=": "maior ou igual",
      "<": "menor que",
      "<=": "menor ou igual",
      "==": "igual a",
      "!=": "diferente de",
      "contains": "contém",
    };
    return labels[op] || op;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Alertas Customizáveis</h1>
                <p className="text-sm text-muted-foreground">
                  Crie regras personalizadas de monitoramento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowTemplatesDialog(true)}>
                <Template className="h-4 w-4 mr-2" />
                Templates
              </Button>
              <Button variant="outline" onClick={() => setShowHistoryDialog(true)}>
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
              <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Canais
              </Button>
              <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Alerta
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="bg-green-500/10 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Alertas Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {alerts.filter((a) => a.enabled).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Total de Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{alerts.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600">Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{templates.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-600">Disparos Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {history.filter((h) => {
                  const today = new Date().toDateString();
                  return new Date(h.triggeredAt).toDateString() === today;
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Alertas */}
        <Card>
          <CardHeader>
            <CardTitle>Meus Alertas</CardTitle>
            <CardDescription>
              {alerts.length} alertas configurados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum alerta ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Crie seu primeiro alerta customizado
                </p>
                <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Alerta
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert: any) => (
                  <Card key={alert.id} className="border-l-4" style={{ borderLeftColor: alert.enabled ? "#22c55e" : "#94a3b8" }}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-base">{alert.name}</CardTitle>
                            {alert.enabled ? (
                              <Badge className="bg-green-500">Ativo</Badge>
                            ) : (
                              <Badge variant="outline">Inativo</Badge>
                            )}
                          </div>
                          {alert.description && (
                            <CardDescription className="mt-1">{alert.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleAlert(alert.id, alert.enabled)}
                          >
                            {alert.enabled ? (
                              <Power className="h-4 w-4 text-green-500" />
                            ) : (
                              <PowerOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Deletar este alerta?")) {
                                deleteAlert.mutate({ alertId: alert.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-2">Condições:</p>
                          <div className="space-y-1">
                            {alert.conditions.conditions.map((cond: AlertCondition, idx: number) => (
                              <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                {idx > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {alert.conditions.logic}
                                  </Badge>
                                )}
                                <span>
                                  {cond.field} {getOperatorLabel(cond.operator)} {cond.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center gap-2">
                            {alert.channels.map((ch: string) => (
                              <Badge key={ch} variant="outline" className="gap-1">
                                {getChannelIcon(ch)}
                                {ch}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {alert.triggerCount > 0 ? (
                              <span>Disparado {alert.triggerCount}x</span>
                            ) : (
                              <span>Nunca disparado</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Criar Alerta */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Alerta Customizado</DialogTitle>
            <DialogDescription>
              Configure condições personalizadas para monitoramento
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="conditions">Condições</TabsTrigger>
              <TabsTrigger value="channels">Canais</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label>Nome do Alerta *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Mercado Acima do Orçamento"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes do alerta..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Mensagem do Alerta *</Label>
                <Input
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Ex: Gasto com mercado passou de R$ 1.000!"
                />
              </div>

              <div>
                <Label>Frequência</Label>
                <Select value={formData.frequency} onValueChange={(v: any) => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Tempo Real</SelectItem>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4">
              <div>
                <Label>Lógica de Combinação</Label>
                <Select value={formData.logic} onValueChange={(v: "AND" | "OR") => setFormData({ ...formData, logic: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND (todas devem ser verdadeiras)</SelectItem>
                    <SelectItem value="OR">OR (pelo menos uma verdadeira)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Adicionar Condição</h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Campo</Label>
                    <Input
                      value={currentCondition.field}
                      onChange={(e) => setCurrentCondition({ ...currentCondition, field: e.target.value })}
                      placeholder="expense.mercado"
                    />
                  </div>

                  <div>
                    <Label>Operador</Label>
                    <Select
                      value={currentCondition.operator}
                      onValueChange={(v: any) => setCurrentCondition({ ...currentCondition, operator: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">Maior que (&gt;)</SelectItem>
                        <SelectItem value=">=">Maior ou igual (≥)</SelectItem>
                        <SelectItem value="<">Menor que (&lt;)</SelectItem>
                        <SelectItem value="<=">Menor ou igual (≤)</SelectItem>
                        <SelectItem value="==">Igual (=)</SelectItem>
                        <SelectItem value="!=">Diferente (≠)</SelectItem>
                        <SelectItem value="contains">Contém</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      value={currentCondition.value}
                      onChange={(e) => setCurrentCondition({ ...currentCondition, value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <Button onClick={addCondition} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Condição
                </Button>
              </div>

              {formData.conditions.length > 0 && (
                <div className="space-y-2">
                  <Label>Condições Adicionadas ({formData.conditions.length})</Label>
                  {formData.conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded">
                      {idx > 0 && <Badge variant="outline">{formData.logic}</Badge>}
                      <span className="flex-1 text-sm">
                        {cond.field} {getOperatorLabel(cond.operator)} {cond.value}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => removeCondition(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="channels" className="space-y-4">
              <div>
                <Label>Selecione os Canais de Notificação</Label>
                <div className="space-y-3 mt-3">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Push (App)</p>
                        <p className="text-sm text-muted-foreground">Notificação no navegador</p>
                      </div>
                    </div>
                    <Checkbox
                      checked={formData.channels.includes("push")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, channels: [...formData.channels, "push"] });
                        } else {
                          setFormData({ ...formData, channels: formData.channels.filter((c) => c !== "push") });
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">
                          {channelsConfig?.emailEnabled ? channelsConfig.emailAddress : "Configure nas opções"}
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      checked={formData.channels.includes("email")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, channels: [...formData.channels, "email"] });
                        } else {
                          setFormData({ ...formData, channels: formData.channels.filter((c) => c !== "email") });
                        }
                      }}
                      disabled={!channelsConfig?.emailEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5" />
                      <div>
                        <p className="font-medium">WhatsApp</p>
                        <p className="text-sm text-muted-foreground">
                          {channelsConfig?.whatsappEnabled ? channelsConfig.whatsappNumber : "Configure nas opções"}
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      checked={formData.channels.includes("whatsapp")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, channels: [...formData.channels, "whatsapp"] });
                        } else {
                          setFormData({ ...formData, channels: formData.channels.filter((c) => c !== "whatsapp") });
                        }
                      }}
                      disabled={!channelsConfig?.whatsappEnabled}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createAlert.isLoading}>
              {createAlert.isLoading ? "Criando..." : "Criar Alerta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Templates */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Galeria de Templates</DialogTitle>
            <DialogDescription>
              Crie alertas rapidamente usando templates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum template disponível
              </p>
            ) : (
              templates.map((template: any) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription>{template.description}</CardDescription>
                        )}
                      </div>
                      {template.isPublic && <Badge variant="outline">Público</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {template.conditions.conditions.length} condições
                      </span>
                      <Button
                        size="sm"
                        onClick={() => createFromTemplate.mutate({ templateId: template.id })}
                      >
                        Usar Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Histórico */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histórico de Disparos</DialogTitle>
            <DialogDescription>
              Últimos 50 alertas disparados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum disparo ainda
              </p>
            ) : (
              history.map((trigger: any) => (
                <div key={trigger.id} className="flex items-start gap-3 p-3 border rounded">
                  {trigger.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{trigger.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(trigger.triggeredAt)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {trigger.channelsSent.map((ch: string) => (
                        <Badge key={ch} variant="outline" className="text-xs gap-1">
                          {getChannelIcon(ch)}
                          {ch}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurar Canais */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Canais de Notificação</DialogTitle>
            <DialogDescription>
              Configure onde receber alertas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Push (App)</Label>
                <p className="text-sm text-muted-foreground">Notificações no navegador</p>
              </div>
              <Switch defaultChecked={channelsConfig?.pushEnabled} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email</Label>
                <Switch defaultChecked={channelsConfig?.emailEnabled} />
              </div>
              <Input
                type="email"
                placeholder="seu@email.com"
                defaultValue={channelsConfig?.emailAddress}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>WhatsApp</Label>
                <Switch defaultChecked={channelsConfig?.whatsappEnabled} />
              </div>
              <Input
                placeholder="+55 11 99999-9999"
                defaultValue={channelsConfig?.whatsappNumber}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => configureChannels.mutate({})}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
