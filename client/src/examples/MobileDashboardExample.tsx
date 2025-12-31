/**
 * Exemplo de Dashboard Mobile-First
 * Demonstra uso de todos os componentes mobile
 */

import { useState } from 'react';
import {
  MobileContainer,
  MobileHeader,
  MobileSection,
} from '@/components/mobile/MobileLayout';
import {
  TouchCard,
  TouchButton,
  BigNumber,
} from '@/components/mobile/MobileComponents';
import { SwipeableItem, SWIPE_ACTIONS } from '@/hooks/useSwipe';
import { Card, CardContent } from '@/components/ui/card';
import {
  DashboardSkeleton,
  TransactionListSkeleton,
  StatsCardSkeleton,
} from '@/components/Skeleton';
import { EmptyDespesas, MiniEmptyState } from '@/components/EmptyStates';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useViewMode } from '@/contexts/ViewModeContext';

export default function MobileDashboardExample() {
  const { isSimpleMode } = useViewMode();
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([
    { id: 1, description: 'Supermercado', amount: -150.00, date: '30/12' },
    { id: 2, description: 'Salário', amount: 5000.00, date: '29/12' },
    { id: 3, description: 'Netflix', amount: -45.90, date: '28/12' },
  ]);

  const handleDeleteTransaction = (id: number) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleEditTransaction = (id: number) => {
    console.log('Edit:', id);
  };

  if (isLoading) {
    return (
      <MobileContainer>
        <DashboardSkeleton />
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      {/* Mobile Header */}
      <MobileHeader
        title="Dashboard"
        subtitle="Dezembro 2025"
        rightAction={
          <TouchButton
            variant="ghost"
            size="sm"
            onClick={() => console.log('Settings')}
          >
            ⚙️
          </TouchButton>
        }
      />

      {/* Balance Section */}
      <MobileSection title="Saldo Atual" className="pt-6">
        <TouchCard className="bg-gradient-to-br from-primary to-primary/80 text-white border-0">
          <CardContent className="pt-6 pb-8">
            <p className="text-sm opacity-80 mb-2">Saldo Total</p>
            <BigNumber
              value={12543.80}
              prefix="R$"
              size="3xl"
              color="default"
            />
            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/20">
              <div>
                <p className="text-xs opacity-80">Receitas</p>
                <p className="text-lg font-semibold">R$ 15.000</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Despesas</p>
                <p className="text-lg font-semibold">R$ 2.456</p>
              </div>
            </div>
          </CardContent>
        </TouchCard>
      </MobileSection>

      {/* Stats Cards */}
      <MobileSection title="Resumo do Mês" className="pt-6">
        <div className="grid grid-cols-2 gap-3">
          <TouchCard onClick={() => console.log('Receitas')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-xs text-muted-foreground">+12%</span>
              </div>
              <p className="text-2xl font-bold text-green-600">R$ 5.000</p>
              <p className="text-sm text-muted-foreground">Receitas</p>
            </CardContent>
          </TouchCard>

          <TouchCard onClick={() => console.log('Despesas')}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span className="text-xs text-muted-foreground">-8%</span>
              </div>
              <p className="text-2xl font-bold text-red-600">R$ 2.456</p>
              <p className="text-sm text-muted-foreground">Despesas</p>
            </CardContent>
          </TouchCard>
        </div>
      </MobileSection>

      {/* Recent Transactions */}
      <MobileSection
        title="Transações Recentes"
        action={
          <TouchButton
            variant="ghost"
            size="sm"
            onClick={() => console.log('Ver todas')}
          >
            Ver todas
            <ArrowRight className="h-4 w-4 ml-1" />
          </TouchButton>
        }
        className="pt-6"
      >
        {transactions.length === 0 ? (
          <MiniEmptyState
            icon={Wallet}
            message="Nenhuma transação recente"
            action={{
              label: 'Adicionar',
              onClick: () => console.log('Add'),
            }}
          />
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <SwipeableItem
                key={transaction.id}
                leftAction={{
                  ...SWIPE_ACTIONS.DELETE,
                  onClick: () => handleDeleteTransaction(transaction.id),
                }}
                rightAction={{
                  ...SWIPE_ACTIONS.EDIT,
                  onClick: () => handleEditTransaction(transaction.id),
                }}
              >
                <TouchCard>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction.amount > 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.date}
                          </p>
                        </div>
                      </div>
                      <p className={`font-semibold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}
                        R$ {Math.abs(transaction.amount).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </TouchCard>
              </SwipeableItem>
            ))}
          </div>
        )}
      </MobileSection>

      {/* Quick Actions (only in simple mode) */}
      {isSimpleMode && (
        <MobileSection title="Ações Rápidas" className="pt-6 pb-24">
          <div className="grid grid-cols-2 gap-3">
            <TouchButton
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => console.log('Nova Receita')}
            >
              <TrendingUp className="h-6 w-6 text-green-600" />
              <span>Nova Receita</span>
            </TouchButton>

            <TouchButton
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => console.log('Nova Despesa')}
            >
              <TrendingDown className="h-6 w-6 text-red-600" />
              <span>Nova Despesa</span>
            </TouchButton>
          </div>
        </MobileSection>
      )}

      {/* Spacer for bottom nav */}
      <div className="h-20" />
    </MobileContainer>
  );
}

/**
 * INSTRUÇÕES DE USO:
 * 
 * 1. Import no App.tsx:
 *    import MobileDashboardExample from './examples/MobileDashboardExample';
 * 
 * 2. Adicionar rota:
 *    <Route path="/dashboard-mobile" component={MobileDashboardExample} />
 * 
 * 3. Testar no mobile:
 *    - Abra DevTools (F12)
 *    - Toggle device toolbar (Ctrl+Shift+M)
 *    - Selecione iPhone/Android
 *    - Navegue para /dashboard-mobile
 * 
 * 4. Testar gestos:
 *    - Swipe left nas transações = Delete
 *    - Swipe right nas transações = Edit
 *    - Tap nos cards = Navegar
 *    - Bottom nav = Trocar página
 *    - FAB = Quick add
 */
