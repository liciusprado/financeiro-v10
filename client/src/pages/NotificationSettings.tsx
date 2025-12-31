import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  Bell, BellOff, Check, AlertTriangle, Smartphone, 
  ArrowLeft, Send, Clock, CheckCircle2
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function NotificationSettings() {
  const [, setLocation] = useLocation();
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe 
  } = useNotifications();

  const [sendingTest, setSendingTest] = useState(false);

  const { data: subscriptions = [] } = trpc.finance.getPushSubscriptions.useQuery();
  const { data: history = [] } = trpc.finance.getNotificationHistory.useQuery({ limit: 20 });
  const testPushMutation = trpc.finance.sendTestPush.useMutation();

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribe();
      if (success) {
        toast.success("Notificações ativadas com sucesso!");
      } else {
        toast.error("Erro ao ativar notificações");
      }
    } else {
      const success = await unsubscribe();
      if (success) {
        toast.success("Notificações desativadas");
      } else {
        toast.error("Erro ao desativar notificações");
      }
    }
  };

  const handleSendTest = async () => {
    if (!isSubscribed) {
      toast.error("Ative as notificações primeiro");
      return;
    }

    setSendingTest(true);
    try {
      const result = await testPushMutation.mutateAsync();
      if (result.sent > 0) {
        toast.success("Notificação de teste enviada!");
      } else {
        toast.error("Falha ao enviar notificação");
      }
    } catch (error) {
      toast.error("Erro ao enviar notificação de teste");
    } finally {
      setSendingTest(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "budget_alert":
        return "⚠️";
      case "due_date_reminder":
        return "📅";
      case "monthly_summary":
        return "📊";
      case "goal_achieved":
        return "🎉";
      case "anomaly_detected":
        return "🔍";
      case "backup_complete":
        return "✅";
      default:
        return "🔔";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => setLocation("/configuracoes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-8 w-8 text-primary" />
              Notificações Push
            </h1>
            <p className="text-muted-foreground mt-1">
              Receba alertas importantes direto no seu dispositivo
            </p>
          </div>
        </div>

        {/* Support Check */}
        {!isSupported && (
          <Alert className="mb-6 border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Notificações push não são suportadas neste navegador. Use Chrome, Firefox, Safari ou Edge.
            </AlertDescription>
          </Alert>
        )}

        {/* Permission Status */}
        {isSupported && permission === "denied" && (
          <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              Você bloqueou as notificações. Para ativar, vá nas configurações do navegador e permita notificações para este site.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Toggle */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isSubscribed ? (
                  <Bell className="h-5 w-5 text-green-500" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                Notificações Push
              </div>
              <Switch
                checked={isSubscribed}
                onCheckedChange={handleToggle}
                disabled={!isSupported || isLoading || permission === "denied"}
              />
            </CardTitle>
            <CardDescription>
              {isSubscribed
                ? "Você receberá notificações importantes"
                : "Ative para receber alertas no seu dispositivo"}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Test Notification */}
        {isSubscribed && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Testar Notificação</CardTitle>
              <CardDescription>
                Envie uma notificação de teste para verificar se tudo está funcionando
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSendTest}
                disabled={sendingTest}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingTest ? "Enviando..." : "Enviar Notificação de Teste"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active Devices */}
        {subscriptions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Dispositivos Ativos</CardTitle>
              <CardDescription>
                Dispositivos que recebem notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subscriptions.map((sub, index) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">
                          {sub.userAgent?.includes("Mobile")
                            ? "Celular"
                            : sub.userAgent?.includes("Tablet")
                            ? "Tablet"
                            : "Desktop"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Último uso: {formatDate(sub.lastUsedAt)}
                        </div>
                      </div>
                    </div>
                    {sub.active && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <Check className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notification Types */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tipos de Notificações</CardTitle>
            <CardDescription>
              Você receberá notificações para os seguintes eventos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  icon: "⚠️",
                  title: "Meta Ultrapassada",
                  description: "Quando seus gastos ultrapassam 20% da meta",
                },
                {
                  icon: "📅",
                  title: "Lembrete de Vencimento",
                  description: "3 dias antes de vencimentos importantes",
                },
                {
                  icon: "📊",
                  title: "Resumo Mensal",
                  description: "Todo dia 1º com o resumo do mês anterior",
                },
                {
                  icon: "🎉",
                  title: "Meta Atingida",
                  description: "Quando você alcança uma meta financeira",
                },
                {
                  icon: "🔍",
                  title: "Gasto Atípico",
                  description: "Quando detectamos gastos acima do normal",
                },
                {
                  icon: "✅",
                  title: "Backup Concluído",
                  description: "Confirmação de backup bem-sucedido",
                },
              ].map((type, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50"
                >
                  <div className="text-2xl">{type.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium">{type.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {type.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Notificações</CardTitle>
              <CardDescription>
                Últimas {history.length} notificações enviadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50"
                  >
                    <div className="text-xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {notification.body}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(notification.sentAt)}
                        </span>
                        {notification.readAt && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Lida
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Info */}
        <Card className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              💡 Como Funciona?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-200">
            <ul className="space-y-2 list-disc list-inside">
              <li>
                As notificações funcionam mesmo quando o app está fechado
              </li>
              <li>
                Você pode ativar em múltiplos dispositivos (celular, tablet, PC)
              </li>
              <li>
                As notificações são enviadas automaticamente pelos eventos configurados
              </li>
              <li>
                Para desativar, basta usar o botão acima ou as configurações do navegador
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
