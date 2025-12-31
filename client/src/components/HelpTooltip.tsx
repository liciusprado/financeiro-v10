import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Info } from 'lucide-react';

interface HelpTooltipProps {
  content: string;
  title?: string;
  children?: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
  iconType?: 'help' | 'info';
  maxWidth?: string;
}

/**
 * Tooltip explicativo para ajudar usuários
 * Uso: <HelpTooltip content="Descrição">Botão</HelpTooltip>
 */
export function HelpTooltip({
  content,
  title,
  children,
  side = 'top',
  showIcon = true,
  iconType = 'help',
  maxWidth = '300px',
}: HelpTooltipProps) {
  const Icon = iconType === 'help' ? HelpCircle : Info;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-2">
            {children}
            {showIcon && (
              <Icon className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-[var(--max-width)]" style={{ '--max-width': maxWidth } as any}>
          <div className="space-y-2">
            {title && <p className="font-semibold">{title}</p>}
            <p className="text-sm">{content}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Tooltip para ações rápidas
 */
export function ActionTooltip({
  action,
  shortcut,
  children,
  side = 'top',
}: {
  action: string;
  shortcut?: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}>
          <div className="flex items-center gap-2">
            <span>{action}</span>
            {shortcut && (
              <kbd className="px-2 py-1 text-xs bg-muted rounded border">
                {shortcut}
              </kbd>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Dicas de funcionalidades para tooltips comuns
 */
export const TOOLTIP_MESSAGES = {
  // Dashboard
  dashboard: {
    totalBalance: 'Saldo atual considerando todas suas contas e transações',
    monthExpenses: 'Total de despesas do mês atual. Clique para ver detalhes por categoria',
    monthIncome: 'Total de receitas do mês atual. Inclui salários, rendimentos e outras entradas',
    budgetProgress: 'Porcentagem do orçamento mensal já utilizado. Verde = OK, Amarelo = Atenção, Vermelho = Estourado',
    savingsRate: 'Percentual da sua receita que está sendo economizado. Meta recomendada: 20%+',
  },

  // Transações
  transactions: {
    category: 'Categoria ajuda a organizar e analisar seus gastos. Use categorias consistentes!',
    recurring: 'Marque se é uma despesa recorrente (ex: aluguel, Netflix). Facilita previsões futuras',
    tags: 'Tags permitem organização adicional (ex: "urgente", "parcelado", "trabalho")',
    notes: 'Adicione observações para lembrar detalhes importantes depois',
    aiCategory: 'IA sugere categoria baseada na descrição. Aceite ou corrija para o sistema aprender!',
  },

  // Metas
  goals: {
    targetAmount: 'Valor que você quer atingir. Seja realista mas ambicioso!',
    deadline: 'Data limite para alcançar a meta. O sistema calcula quanto economizar por mês',
    autoSave: 'Economize automaticamente ao receber receitas. Sistema reserva a % configurada',
    milestone: 'Marcos intermediários motivam! Ex: 25%, 50%, 75% da meta',
  },

  // Orçamento
  budget: {
    categoryLimit: 'Limite de gastos para esta categoria no mês. Receba alertas ao aproximar',
    rollover: 'Sobras do mês passado são adicionadas ao orçamento atual',
    percentage: 'Ideal: Essenciais 50%, Quero 30%, Poupança 20% (regra 50-30-20)',
  },

  // Gamificação
  gamification: {
    xp: 'Pontos de experiência. Ganhe realizando ações: adicionar transações, atingir metas, etc',
    level: 'Seu nível atual. Suba de nível ganhando XP! Cada nível desbloqueia conquistas',
    streak: 'Dias consecutivos usando o app. Não perca! Streaks longas dão bonus de XP',
    achievements: 'Conquistas desbloqueadas. Cada uma dá XP e mostra seu progresso',
  },

  // Open Banking
  openBanking: {
    connect: 'Conecte seu banco para importar transações automaticamente. Seguro via Belvo',
    sync: 'Sincroniza transações dos últimos 90 dias. Faz categorização automática!',
    credentials: 'Suas credenciais são criptografadas end-to-end. Nunca armazenadas no servidor',
  },

  // Colaborativo
  collaborative: {
    admin: 'Admin tem controle total: adicionar/remover membros, aprovar despesas, deletar',
    editor: 'Editor pode criar e editar transações, mas não deletar ou aprovar',
    viewer: 'Viewer apenas visualiza. Não pode criar, editar ou deletar nada',
    approval: 'Despesas acima de X valor requerem aprovação do Admin. Configure as regras',
  },

  // Geral
  general: {
    export: 'Exportar dados para Excel/CSV. Útil para análises externas ou backup',
    import: 'Importar transações de arquivo CSV ou planilha. Formato deve ter: data, valor, descrição',
    backup: 'Backup automático cria cópia de segurança. Restaure se algo der errado',
    offline: 'Sistema funciona offline! Dados sincronizam quando voltar online',
  },
};
