import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Download,
  Upload,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Calendar,
  FileArchive,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function BackupPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<number | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: backups = [], isLoading } = trpc.backup.listBackups.useQuery();
  const { data: schedule } = trpc.backup.getSchedule.useQuery();
  const { data: backupDetails } = trpc.backup.getBackup.useQuery(
    { backupId: selectedBackup! },
    { enabled: !!selectedBackup }
  );

  // Mutations
  const createBackup = trpc.backup.createBackup.useMutation({
    onSuccess: () => {
      utils.backup.listBackups.invalidate();
      toast.success("Backup criado com sucesso!");
      setIsCreating(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar backup: ${error.message}`);
      setIsCreating(false);
    },
  });

  const restoreBackup = trpc.backup.restoreBackup.useMutation({
    onSuccess: () => {
      toast.success("Backup restaurado com sucesso!");
      setShowRestoreDialog(false);
      setSelectedBackup(null);
    },
    onError: (error) => {
      toast.error(`Erro ao restaurar backup: ${error.message}`);
    },
  });

  const deleteBackup = trpc.backup.deleteBackup.useMutation({
    onSuccess: () => {
      utils.backup.listBackups.invalidate();
      toast.success("Backup deletado com sucesso!");
      setShowDeleteDialog(false);
      setSelectedBackup(null);
    },
    onError: (error) => {
      toast.error(`Erro ao deletar backup: ${error.message}`);
    },
  });

  const setSchedule = trpc.backup.setSchedule.useMutation({
    onSuccess: () => {
      utils.backup.getSchedule.invalidate();
      toast.success("Agendamento atualizado!");
      setShowScheduleDialog(false);
    },
    onError: (error) => {
      toast.error(`Erro ao configurar agendamento: ${error.message}`);
    },
  });

  // Schedule form state
  const [scheduleFrequency, setScheduleFrequency] = useState<"daily" | "weekly" | "monthly">(
    schedule?.frequency || "weekly"
  );
  const [scheduleTime, setScheduleTime] = useState(schedule?.time || "02:00:00");
  const [scheduleEnabled, setScheduleEnabled] = useState(schedule?.enabled ?? true);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    createBackup.mutate();
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    restoreBackup.mutate({ backupId: selectedBackup });
  };

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;
    deleteBackup.mutate({ backupId: selectedBackup });
  };

  const handleSaveSchedule = () => {
    setSchedule.mutate({
      frequency: scheduleFrequency,
      time: scheduleTime,
      enabled: scheduleEnabled,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completo</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "auto" ? (
      <Badge variant="outline">Automático</Badge>
    ) : (
      <Badge>Manual</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Backup e Restauração</h1>
                <p className="text-sm text-muted-foreground">
                  Proteja seus dados financeiros
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowScheduleDialog(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Agendamento
              </Button>
              <Button
                onClick={handleCreateBackup}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Criar Backup
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-600 flex items-center gap-2">
                <FileArchive className="h-5 w-5" />
                Total de Backups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {backups.length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Backups Completos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {backups.filter((b) => b.status === "completed").length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-purple-600 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-purple-600">
                {schedule?.enabled
                  ? `${schedule.frequency === "daily" ? "Diário" : schedule.frequency === "weekly" ? "Semanal" : "Mensal"} às ${schedule.time.substring(0, 5)}`
                  : "Desativado"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Backups */}
        <Card>
          <CardHeader>
            <CardTitle>Backups Disponíveis</CardTitle>
            <CardDescription>
              Clique em um backup para ver detalhes, restaurar ou deletar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Carregando backups...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum backup ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Crie seu primeiro backup para proteger seus dados
                </p>
                <Button onClick={handleCreateBackup} disabled={isCreating}>
                  <Download className="h-4 w-4 mr-2" />
                  Criar Primeiro Backup
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {backups.map((backup) => (
                  <Card
                    key={backup.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedBackup === backup.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedBackup(backup.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileArchive className="h-5 w-5 text-blue-500" />
                          <div>
                            <CardTitle className="text-base">
                              {backup.filename}
                            </CardTitle>
                            <CardDescription>
                              {formatDate(backup.createdAt)}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTypeBadge(backup.type)}
                          {getStatusBadge(backup.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Tamanho: {formatFileSize(backup.fileSize)}
                        </div>
                        {backup.status === "completed" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBackup(backup.id);
                                setShowRestoreDialog(true);
                              }}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Restaurar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBackup(backup.id);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Deletar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalhes do Backup Selecionado */}
        {selectedBackup && backupDetails && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Logs do Backup</CardTitle>
              <CardDescription>Histórico de operações</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {backupDetails.logs?.map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    {log.action === "completed" && (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    {log.action === "failed" && (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    {log.action === "started" && (
                      <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    {log.action === "restored" && (
                      <Upload className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: Restaurar Backup */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Restaurar Backup
            </DialogTitle>
            <DialogDescription>
              Esta ação irá substituir todos os dados atuais pelos dados do backup.
              Esta operação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja restaurar este backup?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRestoreDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRestoreBackup}
              disabled={restoreBackup.isLoading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {restoreBackup.isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Restaurar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Deletar Backup */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Deletar Backup
            </DialogTitle>
            <DialogDescription>
              Esta ação irá deletar permanentemente este backup.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja deletar este backup?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBackup}
              disabled={deleteBackup.isLoading}
            >
              {deleteBackup.isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurar Agendamento */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Configurar Agendamento
            </DialogTitle>
            <DialogDescription>
              Configure backups automáticos periódicos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={scheduleFrequency}
                onValueChange={(value: any) => setScheduleFrequency(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={scheduleTime.substring(0, 5)}
                onChange={(e) => setScheduleTime(e.target.value + ":00")}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Ativar agendamento</Label>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveSchedule} disabled={setSchedule.isLoading}>
              {setSchedule.isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
