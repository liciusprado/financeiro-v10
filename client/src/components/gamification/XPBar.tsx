import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function XPBar() {
  const { data: stats } = trpc.gamification.getStats.useQuery();

  if (!stats) return null;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Star className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium">Nível {stats.level}</p>
            <p className="text-xs text-muted-foreground">
              {stats.xp} / {stats.xpForNextLevel} XP
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {stats.streak > 0 && (
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3 text-orange-500" />
              <span className="text-xs">{stats.streak} dias</span>
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1">
            <Trophy className="h-3 w-3" />
            <span className="text-xs">{stats.totalXp} Total</span>
          </Badge>
        </div>
      </div>

      <Progress value={stats.xpProgress} className="h-2" />
      
      <p className="text-xs text-muted-foreground mt-1 text-right">
        {Math.floor(stats.xpProgress)}% para o próximo nível
      </p>
    </div>
  );
}
