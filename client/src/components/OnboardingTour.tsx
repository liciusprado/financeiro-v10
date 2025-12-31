import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Rocket,
  Wallet,
  TrendingUp,
  Target,
  Bell,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetElement?: string; // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: '🎉 Bem-vindo ao Planejamento Financeiro!',
    description: 'Vamos fazer um tour rápido de 2 minutos para você conhecer as principais funcionalidades. Você pode pular a qualquer momento.',
    icon: <Rocket className="h-12 w-12 text-primary" />,
  },
  {
    id: 'dashboard',
    title: '📊 Dashboard',
    description: 'Aqui você vê o resumo completo das suas finanças: saldo atual, gastos do mês, receitas e muito mais. É sua central de controle!',
    icon: <TrendingUp className="h-12 w-12 text-blue-600" />,
    targetElement: '[href="/"]',
    position: 'right',
  },
  {
    id: 'transactions',
    title: '💰 Receitas e Despesas',
    description: 'Adicione suas receitas e despesas facilmente. O sistema categoriza automaticamente usando IA! Acesse no menu lateral.',
    icon: <Wallet className="h-12 w-12 text-green-600" />,
    targetElement: '[href="/receitas"]',
    position: 'right',
  },
  {
    id: 'goals',
    title: '🎯 Metas Financeiras',
    description: 'Defina metas como "Economizar R$ 5.000 para viagem". O sistema te mostra o progresso e dá dicas para alcançar!',
    icon: <Target className="h-12 w-12 text-purple-600" />,
    targetElement: '[href="/metas"]',
    position: 'right',
  },
  {
    id: 'alerts',
    title: '🔔 Alertas Inteligentes',
    description: 'Receba notificações quando estiver perto de estourar o orçamento, quando atingir metas ou quando houver algo incomum.',
    icon: <Bell className="h-12 w-12 text-orange-600" />,
    targetElement: '[href="/alertas/gerenciar"]',
    position: 'right',
  },
  {
    id: 'gamification',
    title: '🎮 Gamificação',
    description: 'Ganhe XP, conquistas e suba de nível enquanto gerencia suas finanças! Torne o controle financeiro divertido.',
    icon: <CheckCircle2 className="h-12 w-12 text-yellow-600" />,
    targetElement: '[href="/gamificacao"]',
    position: 'right',
  },
  {
    id: 'collaborative',
    title: '👥 Modo Colaborativo',
    description: 'Gerencie finanças com sua família! Adicione membros, aprove despesas e converse em grupo. Perfeito para casais e famílias.',
    icon: <Users className="h-12 w-12 text-pink-600" />,
    targetElement: '[href="/colaborativo"]',
    position: 'right',
  },
  {
    id: 'complete',
    title: '✅ Tudo Pronto!',
    description: 'Você está pronto para começar! Comece adicionando sua primeira transação. Se precisar de ajuda, clique no ícone "?" no topo.',
    icon: <CheckCircle2 className="h-12 w-12 text-green-600" />,
  },
];

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    // Verificar se já viu o tour
    const seen = localStorage.getItem('onboarding_completed');
    if (!seen) {
      // Esperar 1 segundo após carregar para abrir
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setHasSeenTour(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setIsOpen(false);
    setHasSeenTour(true);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;
  const step = TOUR_STEPS[currentStep];

  // Botão para reabrir tour (visível após completar)
  if (hasSeenTour && !isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRestart}
        className="fixed bottom-4 right-4 z-50 bg-primary text-white hover:bg-primary/90"
        title="Refazer tour guiado"
      >
        <Rocket className="h-4 w-4 mr-2" />
        Tour
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{step.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Passo {currentStep + 1} de {TOUR_STEPS.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <Progress value={progress} className="h-2" />

          {/* Icon */}
          <div className="flex justify-center py-6">{step.icon}</div>

          {/* Description */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-lg">{step.description}</p>
            </CardContent>
          </Card>

          {/* Tips específicos por step */}
          {step.id === 'welcome' && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm">💡 Dica Rápida</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Este sistema funciona offline! Você pode usar mesmo sem internet e tudo sincroniza depois.
                </p>
              </CardContent>
            </Card>
          )}

          {step.id === 'dashboard' && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-sm">🎯 Comece Aqui</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  O dashboard mostra seu "pulso financeiro". Verifique diariamente para se manter no controle!
                </p>
              </CardContent>
            </Card>
          )}

          {step.id === 'transactions' && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-sm">🤖 IA Integrada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ao adicionar "UBER TRIP", o sistema automaticamente categoriza como "Transporte". Aprende com você!
                </p>
              </CardContent>
            </Card>
          )}

          {step.id === 'gamification' && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-sm">🏆 Ganhe Recompensas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Cada ação ganha XP! Login diário +10 XP, adicionar despesa +5 XP, completar meta +200 XP!
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            {currentStep < TOUR_STEPS.length - 1 ? (
              <>
                <Button variant="ghost" onClick={handleSkip} className="flex-1">
                  Pular Tour
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            ) : (
              <Button onClick={handleComplete} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Começar a Usar!
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook para controlar o tour programaticamente
export function useOnboardingTour() {
  const restartTour = () => {
    localStorage.removeItem('onboarding_completed');
    window.location.reload();
  };

  const markAsComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
  };

  const hasCompleted = () => {
    return localStorage.getItem('onboarding_completed') === 'true';
  };

  return {
    restartTour,
    markAsComplete,
    hasCompleted,
  };
}
