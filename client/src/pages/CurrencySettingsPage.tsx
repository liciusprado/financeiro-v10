import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  TrendingUp,
  RefreshCw,
  Settings,
  Plus,
  History,
  DollarSign,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CurrencySettingsPage() {
  const [showAddRateDialog, setShowAddRateDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedCurrencyPair, setSelectedCurrencyPair] = useState({ from: "USD", to: "BRL" });
  
  const utils = trpc.useUtils();

  // Queries
  const { data: currencies = [] } = trpc.currency.listCurrencies.useQuery();
  const { data: preferences } = trpc.currency.getUserPreferences.useQuery();
  const { data: rateHistory = [] } = trpc.currency.getExchangeRateHistory.useQuery(
    selectedCurrencyPair,
    { enabled: showHistoryDialog }
  );

  // Mutations
  const updatePreferences = trpc.currency.updateUserPreferences.useMutation({
    onSuccess: () => {
      utils.currency.getUserPreferences.invalidate();
      toast.success("Preferências atualizadas!");
    },
  });

  const saveRate = trpc.currency.saveExchangeRate.useMutation({
    onSuccess: () => {
      toast.success("Taxa salva!");
      setShowAddRateDialog(false);
    },
  });

  const updateAllRates = trpc.currency.updateAllRates.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.updated} taxas atualizadas!`);
    },
  });

  const [rateForm, setRateForm] = useState({ from: "USD", to: "BRL", rate: "" });

  const handleUpdateBaseCurrency = (baseCurrency: string) => {
    updatePreferences.mutate({ baseCurrency });
  };

  const handleToggleDisplayCurrency = (code: string) => {
    const current = preferences?.displayCurrencies || [];
    const updated = current.includes(code)
      ? current.filter((c: string) => c !== code)
      : [...current, code];
    
    updatePreferences.mutate({ displayCurrencies: updated });
  };

  const handleSaveRate = () => {
    if (!rateForm.rate || parseFloat(rateForm.rate) <= 0) {
      toast.error("Digite uma taxa válida");
      return;
    }

    saveRate.mutate({
      from: rateForm.from,
      to: rateForm.to,
      rate: parseFloat(rateForm.rate),
    });
  };

  // Principais pares de moedas
  const mainPairs = [
    { from: "USD", to: "BRL", name: "Dólar → Real" },
    { from: "EUR", to: "BRL", name: "Euro → Real" },
    { from: "GBP", to: "BRL", name: "Libra → Real" },
    { from: "BRL", to: "USD", name: "Real → Dólar" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Coins className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Multi-moeda</h1>
                <p className="text-sm text-muted-foreground">
                  Configure moedas e taxas de câmbio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => updateAllRates.mutate()}
                disabled={updateAllRates.isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${updateAllRates.isLoading ? "animate-spin" : ""}`} />
                Atualizar Taxas
              </Button>
              <Button onClick={() => setShowAddRateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Taxa
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <Tabs defaultValue="preferences" className="space-y-6">
          <TabsList>
            <TabsTrigger value="preferences">Preferências</TabsTrigger>
            <TabsTrigger value="rates">Taxas de Câmbio</TabsTrigger>
            <TabsTrigger value="currencies">Moedas</TabsTrigger>
          </TabsList>

          {/* Tab: Preferências */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Moeda Base</CardTitle>
                <CardDescription>
                  Moeda principal para conversões e exibições
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={preferences?.baseCurrency}
                  onValueChange={handleUpdateBaseCurrency}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency: any) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Moedas de Exibição</CardTitle>
                <CardDescription>
                  Selecione quais moedas deseja visualizar no dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {currencies.map((currency: any) => (
                    <div
                      key={currency.code}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{currency.code}</p>
                        <p className="text-sm text-muted-foreground">{currency.name}</p>
                      </div>
                      <Switch
                        checked={preferences?.displayCurrencies?.includes(currency.code)}
                        onCheckedChange={() => handleToggleDisplayCurrency(currency.code)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversão Automática</CardTitle>
                <CardDescription>
                  Converter automaticamente valores para moeda base
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Ativar Conversão Automática</p>
                    <p className="text-sm text-muted-foreground">
                      Todos os valores serão convertidos automaticamente
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.autoConvert}
                    onCheckedChange={(checked) => updatePreferences.mutate({ autoConvert: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Taxas de Câmbio */}
          <TabsContent value="rates" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {mainPairs.map((pair) => (
                <CurrencyPairCard
                  key={`${pair.from}-${pair.to}`}
                  pair={pair}
                  onShowHistory={() => {
                    setSelectedCurrencyPair({ from: pair.from, to: pair.to });
                    setShowHistoryDialog(true);
                  }}
                />
              ))}
            </div>
          </TabsContent>

          {/* Tab: Moedas */}
          <TabsContent value="currencies">
            <Card>
              <CardHeader>
                <CardTitle>Moedas Disponíveis</CardTitle>
                <CardDescription>
                  {currencies.length} moedas suportadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {currencies.map((currency: any) => (
                    <div
                      key={currency.code}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-emerald-600">
                            {currency.symbol}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{currency.name}</p>
                          <p className="text-sm text-muted-foreground">{currency.code}</p>
                        </div>
                      </div>
                      <Badge variant="outline">Ativa</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog: Adicionar Taxa */}
      <Dialog open={showAddRateDialog} onOpenChange={setShowAddRateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Taxa Manual</DialogTitle>
            <DialogDescription>
              Defina uma taxa de câmbio customizada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>De</Label>
                <Select value={rateForm.from} onValueChange={(v) => setRateForm({ ...rateForm, from: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c: any) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Para</Label>
                <Select value={rateForm.to} onValueChange={(v) => setRateForm({ ...rateForm, to: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c: any) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Taxa</Label>
              <Input
                type="number"
                step="0.0001"
                value={rateForm.rate}
                onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                placeholder="5.0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRate}>Salvar Taxa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Histórico */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Histórico {selectedCurrencyPair.from}/{selectedCurrencyPair.to}
            </DialogTitle>
            <DialogDescription>Últimos 30 dias</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {rateHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={rateHistory.reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Sem histórico disponível
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente auxiliar para card de par de moedas
function CurrencyPairCard({ pair, onShowHistory }: any) {
  const { data: rateData } = trpc.currency.getExchangeRate.useQuery({
    from: pair.from,
    to: pair.to,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{pair.name}</CardTitle>
          <Badge variant="outline">{pair.from}/{pair.to}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-emerald-600">
              {rateData?.rate.toFixed(4) || "-"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Taxa atual</p>
          </div>
          <Button variant="outline" size="sm" onClick={onShowHistory}>
            <History className="h-4 w-4 mr-2" />
            Histórico
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
