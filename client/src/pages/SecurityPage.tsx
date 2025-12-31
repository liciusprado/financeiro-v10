import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { client } from '@/lib/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Shield,
  Smartphone,
  Clock,
  MapPin,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Key,
  Activity,
  Bell,
  Download,
  Copy,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SecurityPage() {
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Queries
  const { data: twoFAStatus } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: () => client.security.get2FAStatus.query(),
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => client.security.getSessions.query(),
  });

  const { data: alerts } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: () => client.security.getSecurityAlerts.query({ limit: 10 }),
  });

  const { data: auditStats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => client.security.getAuditStats.query({ days: 30 }),
  });

  // Mutations - 2FA
  const generate2FAMutation = useMutation({
    mutationFn: () => client.security.generate2FASecret.mutate(),
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setBackupCodes(data.backupCodes);
      toast.success('QR Code gerado! Configure no Google Authenticator');
    },
  });

  const enable2FAMutation = useMutation({
    mutationFn: (data: any) => client.security.enable2FA.mutate(data),
    onSuccess: () => {
      toast.success('2FA habilitado com sucesso!');
      setShowBackupCodes(true);
      setQrCode('');
      setVerificationCode('');
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: (code: string) => client.security.disable2FA.mutate({ verificationCode: code }),
    onSuccess: () => {
      toast.success('2FA desabilitado');
      setVerificationCode('');
    },
  });

  // Mutations - Sessions
  const terminateSessionMutation = useMutation({
    mutationFn: (sessionId: number) =>
      client.security.terminateSession.mutate({ sessionId }),
    onSuccess: () => {
      toast.success('Sessão encerrada');
    },
  });

  const terminateAllMutation = useMutation({
    mutationFn: () => client.security.terminateOtherSessions.mutate(),
    onSuccess: () => {
      toast.success('Todas as outras sessões foram encerradas');
    },
  });

  // Mutations - Alerts
  const markReadMutation = useMutation({
    mutationFn: (alertId: number) =>
      client.security.markAlertAsRead.mutate({ alertId }),
  });

  const dismissAlertMutation = useMutation({
    mutationFn: (alertId: number) =>
      client.security.dismissAlert.mutate({ alertId }),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Central de Segurança
        </h1>
        <p className="text-muted-foreground">
          Gerencie a segurança da sua conta
        </p>
      </div>

      <Tabs defaultValue="2fa" className="space-y-4">
        <TabsList>
          <TabsTrigger value="2fa">Autenticação 2FA</TabsTrigger>
          <TabsTrigger value="sessions">Sessões Ativas</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="audit">Histórico</TabsTrigger>
        </TabsList>

        {/* Tab: 2FA */}
        <TabsContent value="2fa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Autenticação de Dois Fatores (2FA)
              </CardTitle>
              <CardDescription>
                Adicione uma camada extra de segurança com Google Authenticator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Status do 2FA</p>
                  <p className="text-sm text-muted-foreground">
                    {twoFAStatus?.enabled
                      ? 'Habilitado e protegendo sua conta'
                      : 'Desabilitado - recomendamos habilitar'}
                  </p>
                </div>
                <Badge
                  variant={twoFAStatus?.enabled ? 'default' : 'secondary'}
                  className={
                    twoFAStatus?.enabled ? 'bg-green-600' : 'bg-gray-400'
                  }
                >
                  {twoFAStatus?.enabled ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ativo
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Inativo
                    </>
                  )}
                </Badge>
              </div>

              {/* Habilitar 2FA */}
              {!twoFAStatus?.enabled && (
                <div className="space-y-4">
                  {!qrCode ? (
                    <Button
                      onClick={() => generate2FAMutation.mutate()}
                      disabled={generate2FAMutation.isPending}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Configurar 2FA
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="font-medium mb-2">
                          1. Escaneie o QR Code
                        </p>
                        <img
                          src={qrCode}
                          alt="QR Code"
                          className="mx-auto border rounded-lg p-4 bg-white"
                        />
                      </div>

                      <div>
                        <p className="font-medium mb-2">
                          2. Digite o código do app
                        </p>
                        <Input
                          placeholder="000000"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          maxLength={6}
                        />
                      </div>

                      <Button
                        onClick={() =>
                          enable2FAMutation.mutate({
                            secret: 'SECRET_FROM_GENERATION', // TODO: Store this
                            verificationCode,
                            backupCodes,
                          })
                        }
                        disabled={
                          verificationCode.length !== 6 ||
                          enable2FAMutation.isPending
                        }
                        className="w-full"
                      >
                        Ativar 2FA
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Desabilitar 2FA */}
              {twoFAStatus?.enabled && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-red-600">
                      Desabilitar 2FA
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Desabilitar 2FA</DialogTitle>
                      <DialogDescription>
                        Digite o código do Google Authenticator para confirmar
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={6}
                      />
                      <Button
                        variant="destructive"
                        onClick={() =>
                          disable2FAMutation.mutate(verificationCode)
                        }
                        disabled={verificationCode.length !== 6}
                        className="w-full"
                      >
                        Confirmar Desativação
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Códigos de Backup */}
              {showBackupCodes && backupCodes.length > 0 && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Códigos de Backup
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">
                      Guarde estes códigos em local seguro. Você pode usar cada
                      um apenas uma vez se perder acesso ao app.
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {backupCodes.map((code, i) => (
                        <div key={i} className="p-2 bg-white rounded border">
                          {code}
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        navigator.clipboard.writeText(backupCodes.join('\n'));
                        toast.success('Códigos copiados!');
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Códigos
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Sessions */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sessões Ativas</CardTitle>
                  <CardDescription>
                    Dispositivos conectados à sua conta
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => terminateAllMutation.mutate()}
                  disabled={terminateAllMutation.isPending}
                >
                  Encerrar Todas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions?.sessions?.map((session: any) => (
                  <Card key={session.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Monitor className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {session.deviceName || 'Dispositivo Desconhecido'}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {session.location || 'Localização desconhecida'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(
                                  new Date(session.lastActivity),
                                  "dd/MM 'às' HH:mm",
                                  { locale: ptBR }
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {session.browser} • {session.os}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            terminateSessionMutation.mutate(session.id)
                          }
                        >
                          Encerrar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {!sessions?.sessions?.length && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma sessão ativa
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Alerts */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertas de Segurança
              </CardTitle>
              <CardDescription>
                Notificações sobre atividades suspeitas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts?.alerts?.map((alert: any) => (
                  <Card
                    key={alert.id}
                    className={
                      alert.severity === 'critical'
                        ? 'border-red-200 bg-red-50'
                        : alert.severity === 'warning'
                        ? 'border-yellow-200 bg-yellow-50'
                        : ''
                    }
                  >
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(alert.createdAt), 'PPp', {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissAlertMutation.mutate(alert.id)}
                        >
                          Dispensar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {!alerts?.alerts?.length && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum alerta recente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Audit */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Histórico de Atividades
              </CardTitle>
              <CardDescription>Últimas 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold">
                      {auditStats?.totalActions || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total de Ações
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-green-600">
                      {auditStats?.successCount || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Sucessos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-red-600">
                      {auditStats?.failedCount || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Falhas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-2xl font-bold text-yellow-600">
                      {auditStats?.warningCount || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Avisos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Actions */}
              {auditStats?.topActions && auditStats.topActions.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Ações Mais Frequentes</h4>
                  <div className="space-y-2">
                    {auditStats.topActions.map((action: any) => (
                      <div
                        key={action.action}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <span className="text-sm">{action.action}</span>
                        <Badge>{action.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
