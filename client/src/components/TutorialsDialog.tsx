import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'basico' | 'intermediario' | 'avancado';
  thumbnail: string;
  videoUrl: string; // Quando tiver vídeos reais
  isComingSoon?: boolean;
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'getting-started',
    title: '🚀 Primeiros Passos',
    description: 'Aprenda a configurar sua conta e adicionar suas primeiras transações',
    duration: '2:30',
    category: 'basico',
    thumbnail: '/thumbnails/getting-started.jpg',
    videoUrl: 'https://youtube.com/watch?v=EXEMPLO',
    isComingSoon: true,
  },
  {
    id: 'add-transactions',
    title: '💰 Adicionando Transações',
    description: 'Como adicionar receitas e despesas rapidamente',
    duration: '1:45',
    category: 'basico',
    thumbnail: '/thumbnails/transactions.jpg',
    videoUrl: 'https://youtube.com/watch?v=EXEMPLO',
    isComingSoon: true,
  },
  {
    id: 'categories-budgets',
    title: '📊 Categorias e Orçamentos',
    description: 'Organize seus gastos e crie orçamentos por categoria',
    duration: '3:15',
    category: 'basico',
    thumbnail: '/thumbnails/budgets.jpg',
    videoUrl: 'https://youtube.com/watch?v=EXEMPLO',
    isComingSoon: true,
  },
  {
    id: 'goals',
    title: '🎯 Criando Metas',
    description: 'Defina e acompanhe suas metas financeiras',
    duration: '2:00',
    category: 'intermediario',
    thumbnail: '/thumbnails/goals.jpg',
    videoUrl: 'https://youtube.com/watch?v=EXEMPLO',
    isComingSoon: true,
  },
  {
    id: 'open-banking',
    title: '🏦 Open Banking',
    description: 'Conecte seu banco e importe transações automaticamente',
    duration: '4:30',
    category: 'intermediario',
    thumbnail: '/thumbnails/open-banking.jpg',
    videoUrl: 'https://youtube.com/watch?v=EXEMPLO',
    isComingSoon: true,
  },
  {
    id: 'collaborative',
    title: '👥 Modo Colaborativo',
    description: 'Gerencie finanças em família ou equipe',
    duration: '3:45',
    category: 'avancado',
    thumbnail: '/thumbnails/collaborative.jpg',
    videoUrl: 'https://youtube.com/watch?v=EXEMPLO',
    isComingSoon: true,
  },
  {
    id: 'gamification',
    title: '🎮 Gamificação',
    description: 'Ganhe XP, conquistas e suba de nível',
    duration: '2:15',
    category: 'intermediario',
    thumbnail: '/thumbnails/gamification.jpg',
    videoUrl: 'https://youtube.com/watch?v=EXEMPLO',
    isComingSoon: true,
  },
  {
    id: 'ai-insights',
    title: '🤖 IA e Insights',
    description: 'Use inteligência artificial para otimizar suas finanças',
    duration: '3:00',
    category: 'avancado',
    thumbnail: '/thumbnails/ai.jpg',
    videoUrl: 'https://youtube.com/watch?v=EXEMPLO',
    isComingSoon: true,
  },
];

const CATEGORY_COLORS = {
  basico: 'bg-green-100 text-green-800 border-green-300',
  intermediario: 'bg-blue-100 text-blue-800 border-blue-300',
  avancado: 'bg-purple-100 text-purple-800 border-purple-300',
};

const CATEGORY_LABELS = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

export function TutorialsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Play className="h-4 w-4" />
          Tutoriais
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-6 w-6" />
            Vídeos Tutoriais
          </DialogTitle>
          <DialogDescription>
            Aprenda a usar o sistema com vídeos curtos e práticos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TUTORIALS.map((tutorial) => (
              <Card key={tutorial.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-video bg-muted flex items-center justify-center">
                  {tutorial.isComingSoon ? (
                    <div className="text-center">
                      <Play className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <Badge variant="secondary">Em breve</Badge>
                    </div>
                  ) : (
                    <>
                      {/* Placeholder para thumbnail */}
                      <img
                        src={tutorial.thumbnail}
                        alt={tutorial.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback se imagem não existir
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Play className="h-16 w-16 text-white" />
                      </div>
                    </>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge className={CATEGORY_COLORS[tutorial.category]}>
                      {CATEGORY_LABELS[tutorial.category]}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {tutorial.duration}
                    </Badge>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                  <CardDescription>{tutorial.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  {tutorial.isComingSoon ? (
                    <Button variant="outline" disabled className="w-full">
                      Em breve
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full gap-2"
                      onClick={() => window.open(tutorial.videoUrl, '_blank')}
                    >
                      <Play className="h-4 w-4" />
                      Assistir
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            💡 Dica: Assista no ritmo que preferir. Todos os vídeos têm legendas.
          </p>
          <Button variant="link" size="sm" className="gap-1">
            Ver no YouTube
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Tutorial Widget (para dashboard)
 */
export function TutorialWidget() {
  const basicTutorials = TUTORIALS.filter((t) => t.category === 'basico').slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Tutoriais Rápidos
        </CardTitle>
        <CardDescription>Aprenda em minutos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {basicTutorials.map((tutorial) => (
          <div
            key={tutorial.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="p-2 rounded bg-primary/10">
              <Play className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{tutorial.title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {tutorial.duration}
              </p>
            </div>
            {tutorial.isComingSoon && (
              <Badge variant="secondary" className="text-xs">
                Em breve
              </Badge>
            )}
          </div>
        ))}

        <TutorialsDialog />
      </CardContent>
    </Card>
  );
}
