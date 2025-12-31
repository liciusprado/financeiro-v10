import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart 
} from "recharts";
import { 
  TrendingUp, TrendingDown, AlertTriangle, Calendar, 
  Target, Activity, ArrowLeft, Minus, ArrowUp, ArrowDown 
} from "lucide-react";
import { useLocation } from "wouter";

export default function AdvancedAnalytics() {
  const [, setLocation] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear] = useState(new Date().getFullYear());
  const [movingAverageMonths, setMovingAverageMonths] = useState(6);
  const [movingAverageWindow, setMovingAverageWindow] = useState<"3" | "6" | "12">("3");
  const [forecastMonths, setForecastMonths] = useState(3);
  const [categoryAnalysisMonths, setCategoryAnalysisMonths] = useState(6);
  const [seasonalityYears, setSeasonalityYears] = useState(2);
  const [alertThreshold, setAlertThreshold] = useState(15);

  // Queries
  const { data: yoyData = [], isLoading: yoyLoading } = trpc.finance.getYearOverYearComparison.useQuery({
    month: selectedMonth,
    years: 3,
  });

  const { data: movingAvgData = [], isLoading: maLoading } = trpc.finance.getMovingAverage.useQuery({
    months: movingAverageMonths,
    window: movingAverageWindow,
  });

  const { data: forecastData, isLoading: forecastLoading } = trpc.finance.getFinancialForecast.useQuery({
    historicalMonths: 6,
    forecastMonths: forecastMonths,
  });

  const { data: smartAlerts = [], isLoading: alertsLoading } = trpc.finance.getSmartAlerts.useQuery({
    month: selectedMonth,
    year: selectedYear,
    threshold: alertThreshold,
  });

  const { data: categoryAnalysis = [], isLoading: categoryLoading } = trpc.finance.getCategoryAnalysis.useQuery({
    months: categoryAnalysisMonths,
  });

  const { data: seasonalityData, isLoading: seasonalityLoading } = trpc.finance.getSeasonalityAnalysis.useQuery({
    years: seasonalityYears,
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{payload[0].payload.month || payload[0].payload.year}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "down": return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Dashboard Analítico Avançado</h1>
            <p className="text-muted-foreground mt-1">
              Análises profundas, previsões e insights inteligentes
            </p>
          </div>
        </div>

        <Tabs defaultValue="yoy" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="yoy">Ano-a-Ano</TabsTrigger>
            <TabsTrigger value="moving">Média Móvel</TabsTrigger>
            <TabsTrigger value="forecast">Previsões</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
            <TabsTrigger value="category">Categorias</TabsTrigger>
            <TabsTrigger value="seasonal">Sazonalidade</TabsTrigger>
          </TabsList>

          {/* Year-over-Year Comparison */}
          <TabsContent value="yoy" className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(2024, i);
                    return (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {date.toLocaleDateString("pt-BR", { month: "long" })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Comparação Ano sobre Ano</CardTitle>
                <CardDescription>
                  Compare o desempenho do mesmo mês em anos diferentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {yoyLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="text-muted-foreground">Carregando...</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={yoyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="income" name="Receitas" fill="hsl(var(--chart-1))" />
                      <Bar dataKey="expense" name="Despesas" fill="hsl(var(--destructive))" />
                      <Line 
                        type="monotone" 
                        dataKey="balance" 
                        name="Saldo" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Year-over-Year Insights */}
            {yoyData.length >= 2 && (
              <div className="grid gap-4 md:grid-cols-3">
                {(() => {
                  const current = yoyData[yoyData.length - 1];
                  const previous = yoyData[yoyData.length - 2];
                  const incomeGrowth = previous.income === 0 
                    ? 0 
                    : ((current.income - previous.income) / previous.income) * 100;
                  const expenseGrowth = previous.expense === 0 
                    ? 0 
                    : ((current.expense - previous.expense) / previous.expense) * 100;
                  const balanceGrowth = previous.balance === 0 
                    ? 0 
                    : ((current.balance - previous.balance) / Math.abs(previous.balance)) * 100;

                  return (
                    <>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Crescimento de Receitas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold flex items-center gap-2">
                            {incomeGrowth > 0 ? (
                              <ArrowUp className="h-5 w-5 text-green-500" />
                            ) : (
                              <ArrowDown className="h-5 w-5 text-red-500" />
                            )}
                            {incomeGrowth.toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            vs {previous.year}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Variação de Despesas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold flex items-center gap-2">
                            {expenseGrowth > 0 ? (
                              <ArrowUp className="h-5 w-5 text-red-500" />
                            ) : (
                              <ArrowDown className="h-5 w-5 text-green-500" />
                            )}
                            {expenseGrowth.toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            vs {previous.year}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Evolução do Saldo</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold flex items-center gap-2">
                            {balanceGrowth > 0 ? (
                              <ArrowUp className="h-5 w-5 text-green-500" />
                            ) : (
                              <ArrowDown className="h-5 w-5 text-red-500" />
                            )}
                            {Math.abs(balanceGrowth).toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            vs {previous.year}
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          {/* Moving Average */}
          <TabsContent value="moving" className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <Select value={movingAverageMonths.toString()} onValueChange={(v) => setMovingAverageMonths(parseInt(v))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="9">9 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
              <Select value={movingAverageWindow} onValueChange={(v: any) => setMovingAverageWindow(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Janela de 3 meses</SelectItem>
                  <SelectItem value="6">Janela de 6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Média Móvel e Tendências</CardTitle>
                <CardDescription>
                  Visualize tendências suavizadas ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {maLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="text-muted-foreground">Carregando...</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={movingAvgData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      {/* Linhas reais */}
                      <Line 
                        type="monotone" 
                        dataKey="income" 
                        name="Receitas (Real)" 
                        stroke="hsl(var(--chart-1))" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expense" 
                        name="Despesas (Real)" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      {/* Médias móveis */}
                      <Line 
                        type="monotone" 
                        dataKey="avgIncome" 
                        name="Receitas (Média)" 
                        stroke="hsl(var(--chart-1))" 
                        strokeWidth={3}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgExpense" 
                        name="Despesas (Média)" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forecast */}
          <TabsContent value="forecast" className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Target className="h-5 w-5 text-muted-foreground" />
              <Select value={forecastMonths.toString()} onValueChange={(v) => setForecastMonths(parseInt(v))}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Próximo 1 mês</SelectItem>
                  <SelectItem value="3">Próximos 3 meses</SelectItem>
                  <SelectItem value="6">Próximos 6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {forecastData && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Previsões Financeiras</CardTitle>
                    <CardDescription>
                      Projeções baseadas em média e tendência histórica
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {forecastLoading ? (
                      <div className="h-[400px] flex items-center justify-center">
                        <div className="text-muted-foreground">Carregando...</div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={[...forecastData.historical, ...forecastData.forecasts]}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(v) => formatCurrency(v)} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="income" 
                            name="Receitas (Histórico)" 
                            fill="hsl(var(--chart-1))" 
                            stroke="hsl(var(--chart-1))"
                            fillOpacity={0.3}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="projectedIncome" 
                            name="Receitas (Projeção)" 
                            fill="hsl(var(--chart-1))" 
                            stroke="hsl(var(--chart-1))"
                            fillOpacity={0.1}
                            strokeDasharray="5 5"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="expense" 
                            name="Despesas (Histórico)" 
                            stroke="hsl(var(--destructive))" 
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="projectedExpense" 
                            name="Despesas (Projeção)" 
                            stroke="hsl(var(--destructive))" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Forecast Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Receita Média</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(forecastData.averages.avgIncome)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Baseado em {forecastData.historical.length} meses
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Despesa Média</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(forecastData.averages.avgExpense)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Baseado em {forecastData.historical.length} meses
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Saldo Médio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(forecastData.averages.avgBalance)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Projeção mensal esperada
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Smart Alerts */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(2024, i);
                    return (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {date.toLocaleDateString("pt-BR", { month: "long" })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={alertThreshold.toString()} onValueChange={(v) => setAlertThreshold(parseInt(v))}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Variação > 10%</SelectItem>
                  <SelectItem value="15">Variação > 15%</SelectItem>
                  <SelectItem value="20">Variação > 20%</SelectItem>
                  <SelectItem value="30">Variação > 30%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Alertas Inteligentes</CardTitle>
                <CardDescription>
                  Variações significativas em relação ao mês anterior
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Carregando...</div>
                ) : smartAlerts.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhum alerta encontrado para este mês
                  </div>
                ) : (
                  <div className="space-y-3">
                    {smartAlerts.map((alert, index) => (
                      <Alert key={index}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {alert.type === "increase" ? (
                              <TrendingUp className="h-5 w-5 text-red-500 mt-0.5" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-green-500 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <AlertDescription className="text-sm">
                                <span className="font-semibold">{alert.categoryName}</span>
                                {" "}
                                {alert.type === "increase" ? "aumentou" : "diminuiu"}
                                {" "}
                                <span className="font-bold">{Math.abs(alert.variation)}%</span>
                                {" "}
                                em relação ao mês anterior
                              </AlertDescription>
                              <div className="mt-2 text-xs text-muted-foreground flex gap-4">
                                <span>Anterior: {formatCurrency(alert.previousValue)}</span>
                                <span>Atual: {formatCurrency(alert.currentValue)}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity === "high" ? "Alta" : alert.severity === "medium" ? "Média" : "Baixa"}
                          </Badge>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Analysis */}
          <TabsContent value="category" className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <Select 
                value={categoryAnalysisMonths.toString()} 
                onValueChange={(v) => setCategoryAnalysisMonths(parseInt(v))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                  <SelectItem value="12">Últimos 12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Análise por Categoria</CardTitle>
                <CardDescription>
                  Tendências e comparativos de cada categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Carregando...</div>
                ) : categoryAnalysis.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categoryAnalysis.slice(0, 10).map((category, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{category.categoryName}</h4>
                            <Badge variant="outline" className="text-xs">
                              {category.categoryType === "income" ? "Receita" : 
                               category.categoryType === "expense" ? "Despesa" : "Investimento"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex gap-4">
                            <span>Total: {formatCurrency(category.total)}</span>
                            <span>Média: {formatCurrency(category.average)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            {getTrendIcon(category.trendDirection)}
                            <span className={`font-bold ${
                              category.trend > 0 ? "text-red-500" : 
                              category.trend < 0 ? "text-green-500" : 
                              "text-muted-foreground"
                            }`}>
                              {category.trend > 0 ? "+" : ""}{category.trend}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {category.trendDirection === "up" ? "Em crescimento" :
                             category.trendDirection === "down" ? "Em queda" : "Estável"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seasonality */}
          <TabsContent value="seasonal" className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Select 
                value={seasonalityYears.toString()} 
                onValueChange={(v) => setSeasonalityYears(parseInt(v))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último 1 ano</SelectItem>
                  <SelectItem value="2">Últimos 2 anos</SelectItem>
                  <SelectItem value="3">Últimos 3 anos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {seasonalityData && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Padrões Sazonais</CardTitle>
                    <CardDescription>
                      Identifique meses com gastos tipicamente mais altos ou baixos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {seasonalityLoading ? (
                      <div className="h-[400px] flex items-center justify-center">
                        <div className="text-muted-foreground">Carregando...</div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={seasonalityData.seasonality}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="month" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tickFormatter={(v) => formatCurrency(v)} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar 
                            dataKey="avgExpense" 
                            name="Despesa Média" 
                            fill="hsl(var(--destructive))" 
                          />
                          <Bar 
                            dataKey="avgIncome" 
                            name="Receita Média" 
                            fill="hsl(var(--chart-1))" 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Seasonality Insights */}
                {seasonalityData.insights.peakExpenseMonths.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Meses de Pico:</strong> Seus gastos costumam ser maiores em{" "}
                      <strong>{seasonalityData.insights.peakExpenseMonths.join(", ")}</strong>.
                      Considere planejar com antecedência para estes períodos.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
