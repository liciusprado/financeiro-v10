import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import RoleSelection from "@/pages/RoleSelection";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SelectedUserProvider, useSelectedUser } from "./contexts/SelectedUserContext";
import { ViewModeProvider } from "./contexts/ViewModeContext";
import { OfflineBanner, InstallPWAButton } from "./components/OfflineBanner";
import { OnboardingTour } from "./components/OnboardingTour";
import { FAQDialog } from "./components/FAQDialog";
import { ViewModeToggle } from "./components/ViewModeToggle";
import { BottomNavigation } from "./components/BottomNavigation";
import { FloatingActionButton } from "./components/FloatingActionButton";
import { useEffect } from "react";
import { registerServiceWorker } from "./lib/serviceWorker";
import Dashboard from "./pages/Dashboard";
import DashboardModern from "./pages/DashboardModern";
import CustomDashboardPage from "./pages/CustomDashboardPage";
import ReceitasPage from "./pages/ReceitasPage";
import DespesasPage from "./pages/DespesasPage";
import InvestimentosPage from "./pages/InvestimentosPage";
import AlertasPage from "./pages/AlertasPage";
import BackupPage from "./pages/BackupPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import CustomAlertsPage from "./pages/CustomAlertsPage";
import Charts from "./pages/Charts";
import CurrencySettingsPage from "./pages/CurrencySettingsPage";
import GamificationPage from "./pages/GamificationPage";
import OpenBankingPage from "./pages/OpenBankingPage";
import CollaborationPage from "./pages/CollaborationPage";
import SecurityPage from "./pages/SecurityPage";
import Annual from "./pages/Annual";
import Comparative from "./pages/Comparative";
import History from "./pages/History";
import AIAnalysis from "./pages/AIAnalysis";
import AILearning from "./pages/AILearning";
import AIInsights from "./pages/AIInsights";
import NotificationSettings from "./pages/NotificationSettings";
import ManageCategories from "./pages/ManageCategories";
import Settings from "./pages/Settings";
import GoalsDashboard from "./pages/GoalsDashboard";
import GoalsAdvanced from "./pages/GoalsAdvanced";
import ImportCSVPage from "./pages/ImportCSV";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import { AppLayout } from "./components/AppLayout";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import { Button } from "./components/ui/button";

function Router() {
  const { user, loading } = useAuth();

  // Obtenha o usuário selecionado (Lícius ou Marielly) do contexto
  const { selectedUser } = useSelectedUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Planejamento Financeiro Familiar</h1>
          <p className="text-muted-foreground mb-6">Faça login para acessar seu planejamento financeiro</p>
          <Button asChild size="lg">
            <a href={getLoginUrl()}>Entrar</a>
          </Button>
        </div>
      </div>
    );
  }

  // Se o usuário já se autenticou, mas ainda não escolheu um perfil (Lícius ou Marielly),
  // exiba a tela de seleção de usuário. Isso permite perfis distintos sem
  // modificar o sistema de autenticação do Manus.
  if (!selectedUser) {
    return <RoleSelection />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path={"/"} component={DashboardModern} />
        <Route path={"/dashboard-tabela"} component={Dashboard} />
        <Route path={"/dashboard/personalizar"} component={CustomDashboardPage} />
        <Route path={"/receitas"} component={ReceitasPage} />
        <Route path={"/despesas"} component={DespesasPage} />
        <Route path={"/investimentos"} component={InvestimentosPage} />
        <Route path={"/alertas"} component={AlertasPage} />
        <Route path={"/alertas/gerenciar"} component={CustomAlertsPage} />
        <Route path={"/backup"} component={BackupPage} />
        <Route path={"/projetos"} component={ProjectsPage} />
        <Route path={"/projetos/:id"} component={ProjectDetailPage} />
        <Route path={"/graficos"} component={Charts} />
        <Route path={"/analitico"} component={AdvancedAnalytics} />
        <Route path={"/anual"} component={Annual} />
        <Route path={"/comparativo"} component={Comparative} />
        <Route path={"/historico"} component={History} />
        <Route path={"/analise-ia"} component={AIAnalysis} />
        <Route path={"/ia-aprendizado"} component={AILearning} />
        <Route path={"/insights"} component={AIInsights} />
        <Route path={"/notificacoes"} component={NotificationSettings} />
        <Route path={"/categorias"} component={ManageCategories} />
        <Route path={"/configuracoes"} component={Settings} />
        <Route path={"/moedas"} component={CurrencySettingsPage} />
        <Route path={"/gamificacao"} component={GamificationPage} />
        <Route path={"/open-banking"} component={OpenBankingPage} />
        <Route path={"/colaborativo"} component={CollaborationPage} />
        <Route path={"/seguranca"} component={SecurityPage} />
        {/* Página de Metas (painel avançado com banco de dados) */}
        <Route path={"/metas"} component={GoalsAdvanced} />
        {/* Página de importação de CSV */}
        <Route path={"/importar"} component={ImportCSVPage} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  // Registrar Service Worker para PWA
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        {/*
         * Envolvemos a aplicação no SelectedUserProvider para gerenciar
         * o perfil selecionado (Lícius ou Marielly). Isso permite
         * alternar entre usuários sem alterar a autenticação externa.
         */}
        <SelectedUserProvider>
          <ViewModeProvider>
            <TooltipProvider>
              <OfflineBanner />
              <InstallPWAButton />
              <OnboardingTour />
              <BottomNavigation />
              <FloatingActionButton />
              <Toaster />
              <Router />
            </TooltipProvider>
          </ViewModeProvider>
        </SelectedUserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
