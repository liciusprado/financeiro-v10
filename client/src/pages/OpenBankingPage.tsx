import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { client } from '@/lib/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Building2,
  CreditCard,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowDownToLine,
} from 'lucide-react';

export default function OpenBankingPage() {
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);

  // Queries
  const { data: institutions } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => client.openBanking.listInstitutions.query({ country: 'BR' }),
  });

  const { data: connections, refetch: refetchConnections } = useQuery({
    queryKey: ['bank-connections'],
    queryFn: () => client.openBanking.listConnections.query(),
  });

  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['imported-transactions'],
    queryFn: () =>
      client.openBanking.listImportedTransactions.query({
        status: 'pending',
        limit: 100,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['import-stats'],
    queryFn: () => client.openBanking.getImportStats.query(),
  });

  // Mutations
  const createConnectionMutation = useMutation({
    mutationFn: (data: { institution: string; username: string; password: string }) =>
      client.openBanking.createConnection.mutate(data),
    onSuccess: () => {
      toast.success('Conexão criada com sucesso!');
      setIsConnectDialogOpen(false);
      setUsername('');
      setPassword('');
      refetchConnections();
    },
    onError: (error: any) => {
      toast.error('Erro ao conectar: ' + error.message);
    },
  });

  const syncTransactionsMutation = useMutation({
    mutationFn: (connectionId: number) =>
      client.openBanking.syncTransactions.mutate({ connectionId }),
    onSuccess: (data) => {
      toast.success(
        `Sincronização completa! ${data.transactionsFetched} transações encontradas.`
      );
      refetchTransactions();
    },
    onError: (error: any) => {
      toast.error('Erro ao sincronizar: ' + error.message);
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (connectionId: number) =>
      client.openBanking.deleteConnection.mutate({ connectionId }),
    onSuccess: () => {
      toast.success('Conexão removida!');
      refetchConnections();
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  const importBulkMutation = useMutation({
    mutationFn: (transactionIds: number[]) =>
      client.openBanking.importBulkTransactions.mutate({ transactionIds }),
    onSuccess: (data) => {
      toast.success(`${data.imported} de ${data.total} transações importadas!`);
      setSelectedTransactions([]);
      refetchTransactions();
    },
    onError: (error: any) => {
      toast.error('Erro ao importar: ' + error.message);
    },
  });

  const handleConnect = () => {
    if (!selectedInstitution || !username || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    createConnectionMutation.mutate({
      institution: selectedInstitution,
      username,
      password,
    });
  };

  const handleSync = (connectionId: number) => {
    syncTransactionsMutation.mutate(connectionId);
  };

  const handleImportSelected = () => {
    if (selectedTransactions.length === 0) {
      toast.error('Selecione pelo menos uma transação');
      return;
    }

    importBulkMutation.mutate(selectedTransactions);
  };

  const toggleTransaction = (id: number) => {
    setSelectedTransactions((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const selectAllTransactions = () => {
    if (!transactions?.transactions) return;
    const allIds = transactions.transactions.map((t: any) => t.id);
    setSelectedTransactions(allIds);
  };

  const deselectAllTransactions = () => {
    setSelectedTransactions([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Open Banking</h1>
          <p className="text-muted-foreground">
            Conecte suas contas bancárias e importe transações automaticamente
          </p>
        </div>

        <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Building2 className="mr-2 h-4 w-4" />
              Conectar Banco
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conectar Conta Bancária</DialogTitle>
              <DialogDescription>
                Conecte-se ao seu banco usando suas credenciais de internet banking
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="institution">Instituição</Label>
                <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions?.institutions?.map((inst: any) => (
                      <SelectItem key={inst.code} value={inst.code}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="CPF ou usuário"
                />
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha do banco"
                />
              </div>

              <Button
                onClick={handleConnect}
                disabled={createConnectionMutation.isPending}
                className="w-full"
              >
                {createConnectionMutation.isPending ? 'Conectando...' : 'Conectar'}
              </Button>

              <p className="text-xs text-muted-foreground">
                🔒 Suas credenciais são criptografadas e armazenadas com segurança pela Belvo
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conexões Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.activeConnections || 0}</div>
            <p className="text-xs text-muted-foreground">
              de {stats?.stats?.totalConnections || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transações Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.pendingTransactions || 0}</div>
            <p className="text-xs text-muted-foreground">aguardando importação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Importadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.importedTransactions || 0}</div>
            <p className="text-xs text-muted-foreground">no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Sincronização</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.stats?.lastSync
                ? new Date(stats.stats.lastSync).toLocaleDateString()
                : 'Nunca'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.stats?.lastSync ? new Date(stats.stats.lastSync).toLocaleTimeString() : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connections">Conexões</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
        </TabsList>

        {/* Tab: Conexões */}
        <TabsContent value="connections" className="space-y-4">
          {connections?.connections?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma conexão ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Conecte seu banco para começar a importar transações automaticamente
                </p>
                <Button onClick={() => setIsConnectDialogOpen(true)}>
                  Conectar Primeiro Banco
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {connections?.connections?.map((conn: any) => (
                <Card key={conn.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle>{conn.institutionName}</CardTitle>
                          <CardDescription>
                            Última sync:{' '}
                            {conn.lastSync
                              ? new Date(conn.lastSync).toLocaleString()
                              : 'Nunca'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            conn.status === 'active'
                              ? 'default'
                              : conn.status === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {conn.status === 'active' && 'Ativo'}
                          {conn.status === 'error' && 'Erro'}
                          {conn.status === 'invalid' && 'Inválido'}
                          {conn.status === 'pending' && 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(conn.id)}
                        disabled={syncTransactionsMutation.isPending}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sincronizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteConnectionMutation.mutate(conn.id)}
                        disabled={deleteConnectionMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Transações */}
        <TabsContent value="transactions" className="space-y-4">
          {transactions?.transactions?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowDownToLine className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma transação pendente</h3>
                <p className="text-muted-foreground">
                  Sincronize suas conexões para importar transações
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllTransactions}
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllTransactions}
                  >
                    Limpar Seleção
                  </Button>
                </div>
                <Button
                  onClick={handleImportSelected}
                  disabled={
                    selectedTransactions.length === 0 || importBulkMutation.isPending
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Importar Selecionadas ({selectedTransactions.length})
                </Button>
              </div>

              <div className="space-y-2">
                {transactions?.transactions?.map((trans: any) => (
                  <Card key={trans.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedTransactions.includes(trans.id)}
                        onCheckedChange={() => toggleTransaction(trans.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{trans.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(trans.date).toLocaleDateString()} •{' '}
                              {trans.merchant || 'Sem comerciante'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-lg font-bold ${
                                trans.amount > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {trans.amount > 0 ? '+' : ''}
                              R$ {Math.abs(trans.amount).toFixed(2)}
                            </p>
                            {trans.suggestedCategory && (
                              <Badge variant="outline" className="text-xs">
                                {trans.suggestedCategory}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
