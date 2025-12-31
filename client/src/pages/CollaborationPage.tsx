import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { client } from '@/lib/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Shield,
  Eye,
  Edit,
  Activity,
} from 'lucide-react';

export default function CollaborationPage() {
  const [message, setMessage] = useState('');
  const [comment, setComment] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['collab-stats'],
    queryFn: () => client.collaboration.getStats.query(),
  });

  const { data: approvals, refetch: refetchApprovals } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => client.collaboration.getPendingApprovals.query(),
  });

  const { data: activities } = useQuery({
    queryKey: ['activities'],
    queryFn: () => client.collaboration.getActivities.query({ limit: 20 }),
  });

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => client.collaboration.listGroups.query(),
  });

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: (data: { groupId: number; message: string }) =>
      client.collaboration.sendMessage.mutate(data),
    onSuccess: () => {
      toast.success('Mensagem enviada!');
      setMessage('');
    },
  });

  const respondApprovalMutation = useMutation({
    mutationFn: (data: { approvalId: number; status: 'approved' | 'rejected'; comment?: string }) =>
      client.collaboration.respondApproval.mutate(data),
    onSuccess: (data) => {
      toast.success(data.message);
      refetchApprovals();
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { groupId: number; email: string; role: 'admin' | 'editor' | 'viewer' }) =>
      client.collaboration.addMember.mutate(data),
    onSuccess: () => {
      toast.success('Convite enviado!');
      setNewMemberEmail('');
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Modo Colaborativo</h1>
        <p className="text-muted-foreground">
          Gerencie suas finanças em família ou equipe
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.totalGroups || 0}</div>
            <p className="text-xs text-muted-foreground">ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.totalMembers || 0}</div>
            <p className="text-xs text-muted-foreground">no total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovações</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.pendingApprovals || 0}</div>
            <p className="text-xs text-muted-foreground">pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.unreadMessages || 0}</div>
            <p className="text-xs text-muted-foreground">não lidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="approvals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approvals">Aprovações</TabsTrigger>
          <TabsTrigger value="activity">Atividades</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        {/* Tab: Aprovações */}
        <TabsContent value="approvals" className="space-y-4">
          {approvals?.approvals?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma aprovação pendente</h3>
                <p className="text-muted-foreground">
                  Todas as solicitações foram respondidas!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {approvals?.approvals?.map((approval: any) => (
                <Card key={approval.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          R$ {(approval.amount / 100).toFixed(2)}
                        </CardTitle>
                        <CardDescription>{approval.description}</CardDescription>
                        <p className="text-sm text-muted-foreground mt-2">
                          Solicitado por: {approval.requestedBy}
                          <br />
                          {new Date(approval.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          approval.status === 'pending'
                            ? 'secondary'
                            : approval.status === 'approved'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {approval.status === 'pending' && 'Pendente'}
                        {approval.status === 'approved' && 'Aprovado'}
                        {approval.status === 'rejected' && 'Rejeitado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  {approval.status === 'pending' && (
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            respondApprovalMutation.mutate({
                              approvalId: approval.id,
                              status: 'approved',
                            })
                          }
                          disabled={respondApprovalMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            respondApprovalMutation.mutate({
                              approvalId: approval.id,
                              status: 'rejected',
                            })
                          }
                          disabled={respondApprovalMutation.isPending}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Rejeitar
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Atividades */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de Atividades</CardTitle>
              <CardDescription>Tudo que aconteceu recentemente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities?.activities?.slice(0, 10).map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhuma atividade recente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Grupos */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Meus Grupos</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar Membro</DialogTitle>
                  <DialogDescription>
                    Adicione um novo membro ao grupo
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Permissão</Label>
                    <Select value={memberRole} onValueChange={(v: any) => setMemberRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Admin - Controle total
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Editor - Criar e editar
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Visualizador - Apenas ver
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() =>
                      addMemberMutation.mutate({
                        groupId: 1,
                        email: newMemberEmail,
                        role: memberRole,
                      })
                    }
                    disabled={!newMemberEmail || addMemberMutation.isPending}
                    className="w-full"
                  >
                    Enviar Convite
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Recurso em desenvolvimento</h3>
              <p className="text-muted-foreground">
                Grupos e membros estarão disponíveis em breve!
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Chat */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat do Grupo</CardTitle>
              <CardDescription>Converse com os membros em tempo real</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-96 border rounded-lg p-4 overflow-y-auto bg-muted/10">
                  <p className="text-center text-muted-foreground">
                    Nenhuma mensagem ainda. Seja o primeiro a enviar!
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && message.trim()) {
                        sendMessageMutation.mutate({
                          groupId: 1,
                          message: message.trim(),
                        });
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (message.trim()) {
                        sendMessageMutation.mutate({
                          groupId: 1,
                          message: message.trim(),
                        });
                      }
                    }}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
