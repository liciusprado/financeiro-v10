import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevenir o prompt automático
      e.preventDefault();
      // Guardar o evento para usar depois
      setDeferredPrompt(e);
      
      // Verificar se já foi instalado ou rejeitado
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const installed = localStorage.getItem('pwa-installed');
      
      if (!dismissed && !installed) {
        // Esperar 30 segundos antes de mostrar
        setTimeout(() => {
          setShowPrompt(true);
        }, 30000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detectar se foi instalado
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('pwa-installed', 'true');
      setShowPrompt(false);
      toast.success('App instalado! 🎉', {
        description: 'Agora você pode usar offline!',
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Mostrar o prompt de instalação
    deferredPrompt.prompt();

    // Aguardar a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ Usuário aceitou instalar');
      localStorage.setItem('pwa-installed', 'true');
    } else {
      console.log('❌ Usuário recusou instalar');
    }

    // Resetar o prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    toast.info('OK! Você pode instalar depois nas configurações');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Instalar App</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm mt-2">
            Instale o app para usar offline e ter acesso rápido!
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Funciona offline
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Mais rápido
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Notificações push
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Ícone na tela inicial
            </li>
          </ul>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDismiss}
          >
            Agora não
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleInstall}
          >
            <Download className="h-4 w-4 mr-1" />
            Instalar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
