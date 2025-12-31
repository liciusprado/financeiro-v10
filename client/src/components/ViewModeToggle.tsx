import { useViewMode } from '@/contexts/ViewModeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Zap, Sparkles, Info } from 'lucide-react';

export function ViewModeToggle() {
  const { mode, toggleMode, isSimpleMode } = useViewMode();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {isSimpleMode ? (
            <>
              <Zap className="h-4 w-4" />
              Modo Simples
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Modo Avançado
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modo de Visualização</DialogTitle>
          <DialogDescription>
            Escolha entre interface simples ou completa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isSimpleMode ? (
                <Zap className="h-5 w-5 text-blue-600" />
              ) : (
                <Sparkles className="h-5 w-5 text-purple-600" />
              )}
              <div>
                <Label className="text-base font-semibold">
                  {isSimpleMode ? 'Modo Simples' : 'Modo Avançado'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isSimpleMode
                    ? 'Interface limpa e focada no essencial'
                    : 'Todos os recursos e funcionalidades'}
                </p>
              </div>
            </div>
            <Switch
              checked={!isSimpleMode}
              onCheckedChange={toggleMode}
              className="data-[state=checked]:bg-purple-600"
            />
          </div>

          {/* Modo Simples */}
          <Card className={isSimpleMode ? 'border-blue-600 border-2' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Modo Simples
              </CardTitle>
              <CardDescription>
                Ideal para iniciantes e uso diário rápido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Menu reduzido com apenas o essencial</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Dashboard com 3-4 widgets principais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Formulários simples e rápidos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span>Menos opções, mais foco</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Modo Avançado */}
          <Card className={!isSimpleMode ? 'border-purple-600 border-2' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Modo Avançado
              </CardTitle>
              <CardDescription>
                Para usuários experientes e power users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">✓</span>
                  <span>Menu completo com todos os recursos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">✓</span>
                  <span>Dashboard personalizável com 8+ widgets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">✓</span>
                  <span>Open Banking, Gamificação, IA, Colaborativo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">✓</span>
                  <span>Filtros avançados, ações em lote, exportação</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 flex gap-2">
              <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Você pode alternar entre os modos a qualquer momento. Suas preferências são salvas automaticamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Badge indicador do modo atual
 */
export function ViewModeBadge() {
  const { isSimpleMode } = useViewMode();

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm">
      {isSimpleMode ? (
        <>
          <Zap className="h-3 w-3 text-blue-600" />
          <span>Simples</span>
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3 text-purple-600" />
          <span>Avançado</span>
        </>
      )}
    </div>
  );
}
