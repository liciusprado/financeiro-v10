import {
  Inbox,
  Search,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  CreditCard,
  FileText,
  Users,
  Bell,
  Calendar,
  Package,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Empty State Base
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground mb-8 max-w-sm">
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick} size="lg">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="lg">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Empty States Predefinidos
 */

// Receitas
export function EmptyReceitas({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={TrendingUp}
      title="Nenhuma receita ainda"
      description="Comece a registrar suas receitas para acompanhar suas entradas financeiras."
      action={{
        label: 'Adicionar Primeira Receita',
        onClick: onCreate,
      }}
    />
  );
}

// Despesas
export function EmptyDespesas({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={TrendingDown}
      title="Nenhuma despesa registrada"
      description="Adicione suas despesas para ter controle total dos seus gastos."
      action={{
        label: 'Adicionar Primeira Despesa',
        onClick: onCreate,
      }}
    />
  );
}

// Metas
export function EmptyMetas({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={Target}
      title="Sem metas definidas"
      description="Defina metas financeiras para alcançar seus objetivos. Comprar um carro, fazer uma viagem, economizar para emergências..."
      action={{
        label: 'Criar Primeira Meta',
        onClick: onCreate,
      }}
    />
  );
}

// Cartões
export function EmptyCartoes({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={CreditCard}
      title="Nenhum cartão cadastrado"
      description="Adicione seus cartões de crédito para controlar faturas e limites."
      action={{
        label: 'Adicionar Cartão',
        onClick: onCreate,
      }}
    />
  );
}

// Relatórios
export function EmptyRelatorios() {
  return (
    <EmptyState
      icon={FileText}
      title="Sem dados para relatório"
      description="Adicione algumas transações para gerar relatórios e análises financeiras."
    />
  );
}

// Busca sem resultados
export function EmptySearchResults({ query, onClear }: { query: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="Nenhum resultado encontrado"
      description={`Não encontramos resultados para "${query}". Tente buscar com outros termos.`}
      action={
        onClear
          ? {
              label: 'Limpar Busca',
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

// Erro genérico
export function EmptyError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Algo deu errado"
      description="Não conseguimos carregar os dados. Tente novamente."
      action={
        onRetry
          ? {
              label: 'Tentar Novamente',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

// Alertas
export function EmptyAlertas() {
  return (
    <EmptyState
      icon={Bell}
      title="Nenhum alerta ativo"
      description="Você está em dia! Configure alertas para ser notificado sobre gastos importantes."
    />
  );
}

// Colaboradores
export function EmptyColaboradores({ onInvite }: { onInvite: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="Sem colaboradores"
      description="Convide familiares ou parceiros para gerenciar finanças juntos."
      action={{
        label: 'Convidar Pessoa',
        onClick: onInvite,
      }}
    />
  );
}

// Período sem dados
export function EmptyPeriodo({ onChangePeriod }: { onChangePeriod?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="Sem transações neste período"
      description="Não há transações registradas no período selecionado. Tente outro período."
      action={
        onChangePeriod
          ? {
              label: 'Mudar Período',
              onClick: onChangePeriod,
            }
          : undefined
      }
    />
  );
}

// Investimentos
export function EmptyInvestimentos({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={TrendingUp}
      title="Sem investimentos"
      description="Registre seus investimentos para acompanhar rentabilidade e diversificação."
      action={{
        label: 'Adicionar Investimento',
        onClick: onCreate,
      }}
    />
  );
}

// Backup
export function EmptyBackup({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={Package}
      title="Nenhum backup criado"
      description="Crie backups regulares dos seus dados para não perder informações importantes."
      action={{
        label: 'Criar Backup Agora',
        onClick: onCreate,
      }}
    />
  );
}

// Orçamentos
export function EmptyOrcamentos({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={DollarSign}
      title="Sem orçamentos definidos"
      description="Crie orçamentos para controlar seus gastos por categoria. É a melhor forma de não estourar!"
      action={{
        label: 'Criar Orçamento',
        onClick: onCreate,
      }}
    />
  );
}

/**
 * Mini Empty State (para widgets/cards menores)
 */
export function MiniEmptyState({
  icon: Icon = Inbox,
  message,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <Icon className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
