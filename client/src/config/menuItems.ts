import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CreditCard,
  BarChart3,
  Calendar,
  Target,
  Bell,
  Settings,
  FileSpreadsheet,
  Sparkles,
  Users,
  Download,
  History,
  AlertTriangle,
  Copy,
  FolderOpen,
  Database,
  DollarSign,
  Trophy,
  Building2,
  Shield,
} from "lucide-react";

/**
 * Items do menu com controle de visibilidade por modo
 * simpleMode: true = visível apenas no modo simples
 * simpleMode: false = visível apenas no modo avançado
 * simpleMode: undefined/true = visível em ambos
 */
export const MENU_ITEMS = [
  // Dashboard
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
    color: "text-blue-500",
    simpleMode: true,
  },
  {
    title: "Dashboard Tabela",
    icon: FileSpreadsheet,
    path: "/dashboard-tabela",
    color: "text-slate-500",
    simpleMode: false,
  },
  {
    title: "Personalizar Dashboard",
    icon: Sparkles,
    path: "/dashboard/personalizar",
    color: "text-purple-500",
    simpleMode: false,
  },
  
  { separator: true },
  
  // Transações básicas
  {
    title: "Receitas",
    icon: TrendingUp,
    path: "/receitas",
    color: "text-green-500",
    simpleMode: true,
  },
  {
    title: "Despesas",
    icon: TrendingDown,
    path: "/despesas",
    color: "text-red-500",
    simpleMode: true,
  },
  {
    title: "Investimentos",
    icon: TrendingUp,
    path: "/investimentos",
    color: "text-purple-500",
    simpleMode: false,
  },
  {
    title: "Cartões",
    icon: CreditCard,
    path: "/cartoes",
    color: "text-orange-500",
    simpleMode: false,
  },
  
  { separator: true },
  
  // Planejamento
  {
    title: "Metas",
    icon: Target,
    path: "/metas",
    color: "text-blue-600",
    simpleMode: true,
  },
  {
    title: "Orçamentos",
    icon: PiggyBank,
    path: "/orcamentos",
    color: "text-emerald-600",
    simpleMode: false,
  },
  {
    title: "Projetos",
    icon: FolderOpen,
    path: "/projetos",
    color: "text-indigo-600",
    simpleMode: false,
  },
  
  { separator: true },
  
  // Relatórios
  {
    title: "Relatórios",
    icon: BarChart3,
    path: "/relatorios",
    color: "text-cyan-600",
    simpleMode: true,
  },
  {
    title: "Análise Anual",
    icon: Calendar,
    path: "/anual",
    color: "text-teal-600",
    simpleMode: false,
  },
  {
    title: "Comparativo",
    icon: Copy,
    path: "/comparativo",
    color: "text-violet-600",
    simpleMode: false,
  },
  {
    title: "Histórico",
    icon: History,
    path: "/historico",
    color: "text-slate-600",
    simpleMode: false,
  },
  
  { separator: true },
  
  // Ferramentas avançadas
  {
    title: "Análises IA",
    icon: Sparkles,
    path: "/insights",
    color: "text-purple-600",
    simpleMode: false,
  },
  {
    title: "IA Aprendizado",
    icon: Sparkles,
    path: "/ia-aprendizado",
    color: "text-purple-600",
    simpleMode: false,
  },
  {
    title: "Open Banking",
    icon: Building2,
    path: "/open-banking",
    color: "text-blue-600",
    simpleMode: false,
  },
  {
    title: "Modo Colaborativo",
    icon: Users,
    path: "/colaborativo",
    color: "text-pink-600",
    simpleMode: false,
  },
  {
    title: "Gamificação",
    icon: Trophy,
    path: "/gamificacao",
    color: "text-purple-500",
    simpleMode: false,
  },
  
  { separator: true },
  
  // Sistema
  {
    title: "Alertas",
    icon: Bell,
    path: "/alertas/gerenciar",
    color: "text-orange-600",
    simpleMode: false,
  },
  {
    title: "Backup",
    icon: Database,
    path: "/backup",
    color: "text-gray-600",
    simpleMode: false,
  },
  {
    title: "Importar",
    icon: Download,
    path: "/importar",
    color: "text-blue-600",
    simpleMode: false,
  },
  {
    title: "Multi-moeda",
    icon: DollarSign,
    path: "/moedas",
    color: "text-emerald-600",
    simpleMode: false,
  },
  {
    title: "Gerenciar Categorias",
    icon: AlertTriangle,
    path: "/categorias",
    color: "text-amber-600",
    simpleMode: false,
  },
  {
    title: "Segurança",
    icon: Shield,
    path: "/seguranca",
    color: "text-red-600",
    simpleMode: true,
  },
  {
    title: "Configurações",
    icon: Settings,
    path: "/configuracoes",
    color: "text-slate-500",
    simpleMode: true,
  },
];

/**
 * Filtrar items baseado no modo
 */
export function filterMenuItems(items: typeof MENU_ITEMS, isSimpleMode: boolean) {
  return items.filter(item => {
    if ("separator" in item) return true;
    if (isSimpleMode) return item.simpleMode === true;
    return true; // Modo avançado mostra tudo
  });
}
