import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ViewMode = 'simple' | 'advanced';

interface ViewModeContextType {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  isSimpleMode: boolean;
  isAdvancedMode: boolean;
  toggleMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>('simple');

  // Carregar modo salvo
  useEffect(() => {
    const savedMode = localStorage.getItem('view_mode') as ViewMode;
    if (savedMode === 'simple' || savedMode === 'advanced') {
      setModeState(savedMode);
    } else {
      // Novo usuário: começar no modo simples
      setModeState('simple');
    }
  }, []);

  const setMode = (newMode: ViewMode) => {
    setModeState(newMode);
    localStorage.setItem('view_mode', newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'simple' ? 'advanced' : 'simple';
    setMode(newMode);
  };

  const value: ViewModeContextType = {
    mode,
    setMode,
    isSimpleMode: mode === 'simple',
    isAdvancedMode: mode === 'advanced',
    toggleMode,
  };

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within ViewModeProvider');
  }
  return context;
}

/**
 * Componente para mostrar apenas no modo avançado
 */
export function AdvancedOnly({ children }: { children: ReactNode }) {
  const { isAdvancedMode } = useViewMode();
  return isAdvancedMode ? <>{children}</> : null;
}

/**
 * Componente para mostrar apenas no modo simples
 */
export function SimpleOnly({ children }: { children: ReactNode }) {
  const { isSimpleMode } = useViewMode();
  return isSimpleMode ? <>{children}</> : null;
}

/**
 * Componente condicional baseado no modo
 */
export function ViewModeSwitch({
  simple,
  advanced,
}: {
  simple: ReactNode;
  advanced: ReactNode;
}) {
  const { isSimpleMode } = useViewMode();
  return <>{isSimpleMode ? simple : advanced}</>;
}

/**
 * Configuração de features por modo
 */
export const FEATURE_CONFIG = {
  simple: {
    // Visível no modo simples
    dashboard: {
      widgets: ['balance', 'monthSummary', 'recentTransactions'],
      charts: ['expensesByCategory'],
    },
    sidebar: {
      items: [
        'dashboard',
        'receitas',
        'despesas',
        'metas',
        'relatorios',
        'configuracoes',
      ],
    },
    transactions: {
      fields: ['date', 'amount', 'category', 'description'],
      showAdvancedFilters: false,
      showBulkActions: false,
    },
    goals: {
      showMilestones: false,
      showAutoSave: false,
    },
  },
  advanced: {
    // Visível no modo avançado
    dashboard: {
      widgets: [
        'balance',
        'monthSummary',
        'recentTransactions',
        'budgetProgress',
        'savingsRate',
        'goalsProgress',
        'upcomingBills',
        'investments',
      ],
      charts: [
        'expensesByCategory',
        'incomeVsExpense',
        'trendAnalysis',
        'cashFlow',
      ],
    },
    sidebar: {
      items: [
        'dashboard',
        'receitas',
        'despesas',
        'investimentos',
        'cartoes',
        'metas',
        'orcamentos',
        'projetos',
        'relatorios',
        'alertas',
        'backup',
        'importar',
        'open-banking',
        'gamificacao',
        'colaborativo',
        'ia-aprendizado',
        'insights',
        'moedas',
        'configuracoes',
      ],
    },
    transactions: {
      fields: [
        'date',
        'amount',
        'category',
        'description',
        'tags',
        'recurring',
        'notes',
        'attachments',
      ],
      showAdvancedFilters: true,
      showBulkActions: true,
      showImportExport: true,
    },
    goals: {
      showMilestones: true,
      showAutoSave: true,
      showProjections: true,
    },
  },
};

/**
 * Hook para verificar se feature está disponível no modo atual
 */
export function useFeatureAvailable(feature: string): boolean {
  const { mode } = useViewMode();
  const config = FEATURE_CONFIG[mode];

  // Navegar pela config usando dot notation
  const path = feature.split('.');
  let current: any = config;

  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }

  return Boolean(current);
}
