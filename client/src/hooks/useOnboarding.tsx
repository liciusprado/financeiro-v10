import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

/**
 * Hook de Onboarding - Tour guiado interativo
 * Usa react-joyride para mostrar passos na primeira vez
 */

export interface OnboardingStep extends Step {
  target: string;
  content: string;
  title?: string;
  disableBeacon?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    target: 'body',
    content: '👋 Bem-vindo ao seu Sistema de Planejamento Financeiro! Vamos fazer um tour rápido de 2 minutos para você conhecer as principais funcionalidades.',
    title: 'Bem-vindo!',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard"]',
    content: '📊 Este é seu Dashboard. Aqui você vê um resumo de tudo: saldo, despesas, receitas, gráficos e muito mais!',
    title: 'Dashboard',
    placement: 'right',
  },
  {
    target: '[data-tour="add-transaction"]',
    content: '➕ Use este botão para adicionar despesas e receitas rapidamente. Você também pode usar os atalhos no menu lateral.',
    title: 'Adicionar Transações',
    placement: 'bottom',
  },
  {
    target: '[data-tour="sidebar-despesas"]',
    content: '💸 Aqui você gerencia todas as suas despesas. Pode filtrar por categoria, período e muito mais!',
    title: 'Despesas',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-receitas"]',
    content: '💰 E aqui ficam suas receitas. Salário, freelances, investimentos - tudo organizado!',
    title: 'Receitas',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-orcamentos"]',
    content: '🎯 Crie orçamentos para controlar quanto você quer gastar em cada categoria. O sistema avisa quando você ultrapassar!',
    title: 'Orçamentos',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-metas"]',
    content: '🏆 Defina metas financeiras (ex: "Economizar R$ 10.000") e acompanhe seu progresso!',
    title: 'Metas',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-gamificacao"]',
    content: '🎮 Ganhe XP, suba de nível, desbloqueie conquistas e complete desafios! Finanças podem ser divertidas!',
    title: 'Gamificação',
    placement: 'right',
  },
  {
    target: '[data-tour="user-menu"]',
    content: '⚙️ No menu do usuário você encontra Configurações, modo Simples/Avançado, FAQ e muito mais.',
    title: 'Menu do Usuário',
    placement: 'bottom',
  },
  {
    target: 'body',
    content: '🎉 Pronto! Agora você já conhece o básico. Explore à vontade e use o botão "?" para ajuda. Boa gestão financeira!',
    title: 'Tour Completo!',
    placement: 'center',
  },
];

interface UseOnboardingReturn {
  Onboarding: React.FC;
  startTour: () => void;
  resetTour: () => void;
  skipTour: () => void;
}

export function useOnboarding(
  steps: OnboardingStep[] = ONBOARDING_STEPS,
  autoStart: boolean = false
): UseOnboardingReturn {
  const [run, setRun] = useState(autoStart);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Verificar se usuário já completou onboarding
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed && autoStart) {
      // Delay de 1 segundo para página carregar
      setTimeout(() => setRun(true), 1000);
    }
  }, [autoStart]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      // Tour finalizado ou pulado
      setRun(false);
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem(
        'onboarding_completed_at',
        new Date().toISOString()
      );

      if (status === STATUS.SKIPPED) {
        localStorage.setItem('onboarding_skipped', 'true');
      }
    }

    // Salvar progresso
    if (type === 'step:after') {
      setStepIndex(index + (action === 'prev' ? -1 : 1));
      localStorage.setItem('onboarding_step', String(index + 1));
    }
  };

  const startTour = () => {
    setStepIndex(0);
    setRun(true);
  };

  const resetTour = () => {
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_skipped');
    localStorage.removeItem('onboarding_step');
    setStepIndex(0);
    setRun(true);
  };

  const skipTour = () => {
    setRun(false);
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_skipped', 'true');
  };

  const Onboarding: React.FC = () => (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#2563eb',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 20,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          fontSize: '1.2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
        },
        tooltipContent: {
          fontSize: '0.95rem',
          lineHeight: '1.5',
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          borderRadius: 6,
          padding: '8px 16px',
        },
        buttonBack: {
          marginRight: 10,
          color: '#6b7280',
        },
        buttonSkip: {
          color: '#6b7280',
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular tour',
      }}
    />
  );

  return {
    Onboarding,
    startTour,
    resetTour,
    skipTour,
  };
}
