import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Target,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Info,
} from "lucide-react";
import { useLocation } from "wouter";

const SEVERITY_CONFIG = {
  danger: {
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  success: {
    icon: Trophy,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  info: {
    icon: Info,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
};

const TYPE_LABELS = {
  alert: "Alerta",
  achievement: "Conquista",
  suggestion: "Sugestão",
  trend: "Tendência",
  comparison: "Comparação",
};

export default function AIInsights() {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: insights = [], isLoading, refetch } = trpc.finance.generateFinancialInsights.useQuery();

  const filteredInsights =
    selectedType === "all"
      ? insights
      : insights.filter((i: any) => i.type === selectedType);

  const insightsByType = {
    all: insights.length,
    alert: insights.filter((i: any) => i.type === "alert").length,
    achievement: insights.filter((i: any) => i.type === "achievement").length,
    suggestion: insights.filter((i: any) => i.type === "suggestion").length,
    trend: insights.filter((i: any) => i.type === "trend").length,
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-purple-500" />
              Insights Financeiros com IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Análises automáticas dos seus hábitos financeiros
            </p>
          </div>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{insightsByType.alert}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Requerem atenção
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-green-500" />
                Conquistas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{insightsByType.achievement}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Parabéns!
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Sugestões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{insightsByType.suggestion}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Oportunidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Tendências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{insightsByType.trend}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Previsões
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Tabs value={selectedType} onValueChange={setSelectedType} className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              Todos ({insightsByType.all})
            </TabsTrigger>
            <TabsTrigger value="alert">
              Alertas ({insightsByType.alert})
            </TabsTrigger>
            <TabsTrigger value="achievement">
              Conquistas ({insightsByType.achievement})
            </TabsTrigger>
            <TabsTrigger value="suggestion">
              Sugestões ({insightsByType.suggestion})
            </TabsTrigger>
            <TabsTrigger value="trend">
              Tendências ({insightsByType.trend})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Insights List */}
        {!isLoading && filteredInsights.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {selectedType === "all"
                  ? "Nenhum insight disponível no momento. Continue usando o app para gerar insights!"
                  : `Nenhum insight do tipo "${TYPE_LABELS[selectedType as keyof typeof TYPE_LABELS]}" disponível.`}
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && (
          <div className="space-y-4">
            {filteredInsights.map((insight: any) => {
              const config = SEVERITY_CONFIG[insight.severity as keyof typeof SEVERITY_CONFIG];
              const Icon = config.icon;

              return (
                <Alert key={insight.id} className={config.bg}>
                  <div className="flex items-start gap-4">
                    <div className={`rounded-full p-2 ${config.badge}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <AlertTitle className="flex items-center gap-2 mb-2">
                        {insight.title}
                        <Badge variant="outline" className={config.badge}>
                          {TYPE_LABELS[insight.type as keyof typeof TYPE_LABELS]}
                        </Badge>
                        {insight.impact === "high" && (
                          <Badge variant="outline">Alto Impacto</Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription className="text-sm">
                        {insight.message}
                      </AlertDescription>

                      {/* Category Badge */}
                      {insight.category && (
                        <div className="mt-3">
                          <Badge variant="secondary" className="text-xs">
                            <Target className="h-3 w-3 mr-1" />
                            {insight.category}
                          </Badge>
                        </div>
                      )}

                      {/* Action Button */}
                      {insight.actionable && insight.action && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm">
                            {insight.action === "review_spending" && "Revisar Gastos"}
                            {insight.action === "adjust_budget" && "Ajustar Orçamento"}
                            {insight.action === "reduce_expenses" && "Reduzir Despesas"}
                            {insight.action === "increase_savings" && "Aumentar Poupança"}
                            {insight.action === "review_subscription" && "Revisar Assinatura"}
                            {insight.action === "optimize_transport" && "Otimizar Transporte"}
                            {!["review_spending", "adjust_budget", "reduce_expenses", "increase_savings", "review_subscription", "optimize_transport"].includes(insight.action) && "Ver Detalhes"}
                          </Button>
                        </div>
                      )}

                      {/* Additional Data */}
                      {insight.data && Object.keys(insight.data).length > 0 && (
                        <details className="mt-3">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver detalhes técnicos
                          </summary>
                          <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                            {JSON.stringify(insight.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </Alert>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-6 border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Como Funciona?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-purple-800 dark:text-purple-200">
            <ul className="space-y-2 list-disc list-inside">
              <li>
                A IA analisa seus últimos <strong>3-6 meses</strong> de dados financeiros
              </li>
              <li>
                Compara gastos mês-a-mês para detectar <strong>tendências</strong> e <strong>anomalias</strong>
              </li>
              <li>
                Calcula sua <strong>taxa de poupança</strong> e faz <strong>projeções futuras</strong>
              </li>
              <li>
                Identifica <strong>oportunidades de economia</strong> em categorias específicas
              </li>
              <li>
                Usa <strong>LLM (Claude)</strong> para gerar insights personalizados e contextualizados
              </li>
              <li>
                Os insights são ordenados por <strong>impacto</strong> e <strong>urgência</strong>
              </li>
            </ul>

            <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900 rounded">
              <p className="font-medium mb-1">💡 Dica:</p>
              <p className="text-xs">
                Quanto mais você usar o app e registrar seus gastos, mais precisos e relevantes
                serão os insights gerados pela IA!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
