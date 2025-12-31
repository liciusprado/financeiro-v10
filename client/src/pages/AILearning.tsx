import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, TrendingUp, Target, Award } from "lucide-react";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";

export default function AILearning() {
  const [, setLocation] = useLocation();

  const { data: stats, isLoading } = trpc.finance.getClassificationStats.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando estatísticas...</div>
      </div>
    );
  }

  const accuracyRate = stats
    ? Math.round((stats.highConfidenceCount / Math.max(stats.totalClassifications, 1)) * 100)
    : 0;

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
              <Brain className="h-8 w-8 text-primary" />
              Aprendizado da IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe como a IA está aprendendo com seus hábitos financeiros
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Classificações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalClassifications || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Transações aprendidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Alta Confiança
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.highConfidenceCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Classificações ≥80%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-500" />
                Taxa de Acurácia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{accuracyRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Confiança geral
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Learning Progress */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Progresso do Aprendizado</CardTitle>
            <CardDescription>
              A IA melhora suas sugestões conforme você usa o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Nível de Aprendizado</span>
                  <span className="text-sm text-muted-foreground">
                    {stats && stats.totalClassifications < 10
                      ? "Iniciante"
                      : stats && stats.totalClassifications < 50
                      ? "Intermediário"
                      : stats && stats.totalClassifications < 100
                      ? "Avançado"
                      : "Expert"}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, ((stats?.totalClassifications || 0) / 100) * 100)}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {stats && stats.totalClassifications >= 100
                    ? "Parabéns! A IA está altamente treinada com seus dados."
                    : `Faltam ${100 - (stats?.totalClassifications || 0)} classificações para nível Expert`}
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Acurácia</span>
                  <span className="text-sm text-muted-foreground">{accuracyRate}%</span>
                </div>
                <Progress value={accuracyRate} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {accuracyRate >= 80
                    ? "Excelente! A IA está muito precisa."
                    : accuracyRate >= 60
                    ? "Boa precisão. Continue usando para melhorar."
                    : "Continue confirmando sugestões para treinar a IA."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Categories */}
        {stats && stats.topCategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Categorias Mais Usadas</CardTitle>
              <CardDescription>
                Categorias que você mais classifica transações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium">{category.categoryName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {category.count} {category.count === 1 ? "vez" : "vezes"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it Works */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Como Funciona?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  1
                </div>
                <div>
                  <strong className="text-foreground">Você classifica transações</strong>
                  <p>Ao importar ou criar lançamentos, você escolhe categorias</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  2
                </div>
                <div>
                  <strong className="text-foreground">A IA aprende padrões</strong>
                  <p>
                    O sistema analisa descrições, valores e suas escolhas anteriores
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  3
                </div>
                <div>
                  <strong className="text-foreground">Sugestões inteligentes</strong>
                  <p>
                    Para transações similares, a IA sugere categorias com alta
                    confiança
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  4
                </div>
                <div>
                  <strong className="text-foreground">Melhoria contínua</strong>
                  <p>
                    Cada confirmação ou correção torna as sugestões mais precisas
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="mt-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">💡 Dicas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-200">
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <strong>Seja consistente:</strong> Sempre use a mesma categoria para
                transações similares
              </li>
              <li>
                <strong>Confirme sugestões:</strong> Quando a IA acerta, confirme para
                aumentar a confiança
              </li>
              <li>
                <strong>Corrija erros:</strong> Se a IA errar, escolha a categoria
                correta para ela aprender
              </li>
              <li>
                <strong>Descrições claras:</strong> Quanto mais específica a descrição,
                melhor a IA aprende
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
