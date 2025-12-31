import { useLocation } from "wouter";
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
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  History,
  AlertTriangle,
  Copy,
  FolderOpen,
  Database,
  DollarSign,
  Trophy,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FAQDialog } from "@/components/FAQDialog";
import { ViewModeToggle, ViewModeBadge } from "@/components/ViewModeToggle";
import { useViewMode } from "@/contexts/ViewModeContext";
import { MENU_ITEMS, filterMenuItems } from "@/config/menuItems";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSimpleMode } = useViewMode();

  // Fechar drawer mobile ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Filtrar items baseado no modo
  const filteredMenuItems = filterMenuItems(MENU_ITEMS, isSimpleMode);
      color: "text-slate-500",
    },
  ];

  // Componente de conteúdo da sidebar (reutilizado para desktop e mobile)
  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Planejamento
            </h1>
            <p className="text-xs text-muted-foreground">Financeiro Familiar</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden lg:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Controles de Ajuda e Modo */}
      {!collapsed && (
        <div className="px-4 py-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <ViewModeToggle />
            <FAQDialog />
          </div>
          <ViewModeBadge />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredMenuItems
            .filter(item => {
              // Sempre mostrar separadores
              if ("separator" in item) return true;
              // No modo simples, mostrar apenas itens com simpleMode: true
              if (isSimpleMode) return item.simpleMode === true;
              // No modo avançado, mostrar tudo
              return true;
            })
            .map((item, index) => {
            if ("separator" in item) {
              return (
                <li key={`separator-${index}`} className="my-2">
                  <div className="border-t" />
                </li>
              );
            }

            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <li key={item.path}>
                <button
                  onClick={() => setLocation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                    "hover:bg-accent",
                    isActive && "bg-accent font-medium"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive ? item.color : "text-muted-foreground"
                    )}
                  />
                  {!collapsed && (
                    <span className={cn("text-sm", isActive && "font-semibold")}>
                      {item.title}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
              LP
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Lícius Prado</p>
              <p className="text-xs text-muted-foreground truncate">
                Dezembro 2025
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full bg-card">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden lg:flex relative flex-col h-screen border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          className
        )}
      >
        <SidebarContent />
      </div>
    </>
  );
}
