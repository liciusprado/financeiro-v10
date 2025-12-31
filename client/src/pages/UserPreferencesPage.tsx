import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';
import {
  Zap,
  Settings2,
  Eye,
  Bell,
  Palette,
  Globe,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

export default function UserPreferencesPage() {
  const preferences = useUserPreferences();
  const { resetTour } = useOnboarding();

  const handleModeChange = (mode: 'simple' | 'advanced') => {
    preferences.setUIMode(mode);
    toast.success(
      mode === 'simple'
        ? 'Modo Simples ativado! Interface simplificada.'
        : 'Modo Avançado ativado! Todos recursos disponíveis.'
    );
  };

  const handleResetOnboarding = () => {
    resetTour();
    toast.success('Tour guiado reiniciado! Recarregue a página para ver novamente.');
  };

  const handleResetAll = () => {
    if (confirm('Tem certeza? Todas as preferências voltarão ao padrão.')) {
      preferences.resetPreferences();
      toast.success('Preferências restauradas ao padrão!');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Preferências</h1>
        <p className="text-muted-foreground">
          Personalize sua experiência no sistema
        </p>
      </div>

      {/* Modo de Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <CardTitle>Modo de Interface</CardTitle>
          </div>
          <CardDescription>
            Escolha entre interface simples (essencial) ou avançada (todos recursos)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card
              className={`cursor-pointer transition-all ${
                preferences.uiMode === 'simple'
                  ? 'border-primary ring-2 ring-primary'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleModeChange('simple')}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Modo Simples
                  {preferences.uiMode === 'simple' && (
                    <Badge variant="default">Ativo</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Interface limpa com apenas o essencial:
                </p>
                <ul className="text-sm space-y-1">
                  <li>✅ Receitas e Despesas</li>
                  <li>✅ Orçamentos e Metas</li>
                  <li>✅ Dashboard básico</li>
                  <li>✅ Gráficos essenciais</li>
                  <li>✅ Gamificação</li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${
                preferences.uiMode === 'advanced'
                  ? 'border-primary ring-2 ring-primary'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleModeChange('advanced')}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Modo Avançado
                  {preferences.uiMode === 'advanced' && (
                    <Badge variant="default">Ativo</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Todos os recursos disponíveis:
                </p>
                <ul className="text-sm space-y-1">
                  <li>✅ Tudo do Modo Simples +</li>
                  <li>✅ Open Banking</li>
                  <li>✅ IA Avançada</li>
                  <li>✅ Modo Colaborativo</li>
                  <li>✅ Projetos</li>
                  <li>✅ Multi-moeda</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm">
              💡 <strong>Dica:</strong> Comece no Modo Simples e depois mude para
              Avançado quando se sentir confortável!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recursos Visíveis */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <CardTitle>Recursos Visíveis</CardTitle>
          </div>
          <CardDescription>
            Personalize quais funcionalidades aparecem no menu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="gamification">Gamificação</Label>
                <p className="text-sm text-muted-foreground">
                  XP, níveis, conquistas e desafios
                </p>
              </div>
              <Switch
                id="gamification"
                checked={preferences.showGamification}
                onCheckedChange={() => preferences.toggleFeature('showGamification')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="open-banking">Open Banking</Label>
                <p className="text-sm text-muted-foreground">
                  Conectar bancos e importar transações
                </p>
              </div>
              <Switch
                id="open-banking"
                checked={preferences.showOpenBanking}
                onCheckedChange={() => preferences.toggleFeature('showOpenBanking')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai">IA Avançada</Label>
                <p className="text-sm text-muted-foreground">
                  Classificação automática e insights
                </p>
              </div>
              <Switch
                id="ai"
                checked={preferences.showAIFeatures}
                onCheckedChange={() => preferences.toggleFeature('showAIFeatures')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="collaboration">Modo Colaborativo</Label>
                <p className="text-sm text-muted-foreground">
                  Grupos, aprovações e chat
                </p>
              </div>
              <Switch
                id="collaboration"
                checked={preferences.showCollaboration}
                onCheckedChange={() => preferences.toggleFeature('showCollaboration')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="projects">Projetos</Label>
                <p className="text-sm text-muted-foreground">
                  Gerenciar projetos financeiros
                </p>
              </div>
              <Switch
                id="projects"
                checked={preferences.showProjects}
                onCheckedChange={() => preferences.toggleFeature('showProjects')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="multi-currency">Multi-moeda</Label>
                <p className="text-sm text-muted-foreground">
                  Suporte para 12+ moedas
                </p>
              </div>
              <Switch
                id="multi-currency"
                checked={preferences.showMultiCurrency}
                onCheckedChange={() => preferences.toggleFeature('showMultiCurrency')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Aparência</CardTitle>
          </div>
          <CardDescription>Personalize cores e tema visual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="theme">Tema</Label>
              <p className="text-sm text-muted-foreground">
                Escolha entre claro, escuro ou automático
              </p>
            </div>
            <Select value={preferences.theme} onValueChange={preferences.setTheme}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">☀️ Claro</SelectItem>
                <SelectItem value="dark">🌙 Escuro</SelectItem>
                <SelectItem value="auto">🌗 Automático</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tooltips">Dicas (Tooltips)</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar dicas ao passar o mouse
              </p>
            </div>
            <Switch
              id="tooltips"
              checked={preferences.showTooltips}
              onCheckedChange={preferences.toggleTooltips}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notificações</CardTitle>
          </div>
          <CardDescription>Configure como quer ser avisado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Alertas no navegador/app
              </p>
            </div>
            <Switch
              id="push"
              checked={preferences.enablePushNotifications}
              onCheckedChange={() =>
                preferences.toggleFeature('enablePushNotifications')
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email">Email</Label>
              <p className="text-sm text-muted-foreground">
                Notificações por email
              </p>
            </div>
            <Switch
              id="email"
              checked={preferences.enableEmailNotifications}
              onCheckedChange={() =>
                preferences.toggleFeature('enableEmailNotifications')
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Ajuda */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <CardTitle>Ajuda e Tutorial</CardTitle>
          </div>
          <CardDescription>Refazer tour ou resetar configurações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={handleResetOnboarding} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            Refazer Tour Guiado
          </Button>

          <Button variant="outline" onClick={handleResetAll} className="w-full">
            <Settings2 className="mr-2 h-4 w-4" />
            Restaurar Preferências Padrão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
