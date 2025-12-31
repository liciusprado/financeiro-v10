import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, Zap, Award, Target, TrendingUp } from 'lucide-react';
import { XPBar } from '@/components/gamification/XPBar';

export default function GamificationPage() {
  const { data: stats } = trpc.gamification.getStats.useQuery();
  const { data: achievements = [] } = trpc.gamification.getUserAchievements.useQuery();
  const { data: challenges = [] } = trpc.gamification.getUserChallenges.useQuery();
  const { data: leaderboard = [] } = trpc.gamification.getLeaderboard.useQuery({ limit: 10 });
  const { data: history = [] } = trpc.gamification.getXPHistory.useQuery({ limit: 20 });

  const unlockedCount = achievements.filter((a: any) => a.unlocked).length;
  const totalAchievements = achievements.length;
  const completedChallenges = challenges.filter((c: any) => c.completed).length;

  const tierColors = {
    bronze: 'text-orange-700 bg-orange-100',
    silver: 'text-gray-700 bg-gray-100',
    gold: 'text-yellow-700 bg-yellow-100',
    platinum: 'text-cyan-700 bg-cyan-100',
    diamond: 'text-purple-700 bg-purple-100',
  };

  const tierIcons = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '👑',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Trophy className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gamificação</h1>
              <p className="text-sm text-muted-foreground">
                Conquiste, evolua e domine suas finanças!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* XP Bar */}
        <XPBar />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Nível</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats?.level || 1}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalXp || 0} XP Total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conquistas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {unlockedCount}/{totalAchievements}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round((unlockedCount / totalAchievements) * 100)}% completo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                <Zap className="h-6 w-6" />
                {stats?.streak || 0}
              </div>
              <p className="text-xs text-muted-foreground">dias consecutivos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Desafios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {completedChallenges}/{challenges.length}
              </div>
              <p className="text-xs text-muted-foreground">completos este mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="achievements" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
            <TabsTrigger value="challenges">Desafios</TabsTrigger>
            <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
          </TabsList>

          {/* Conquistas */}
          <TabsContent value="achievements" className="space-y-4">
            {['bronze', 'silver', 'gold', 'platinum', 'diamond'].map((tier) => {
              const tierAchievements = achievements.filter((a: any) => a.tier === tier);
              if (tierAchievements.length === 0) return null;

              return (
                <div key={tier}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span>{tierIcons[tier as keyof typeof tierIcons]}</span>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {tierAchievements.map((achievement: any) => (
                      <Card
                        key={achievement.id}
                        className={achievement.unlocked ? 'border-yellow-500/50' : 'opacity-60'}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-3xl">{achievement.icon}</div>
                              <div>
                                <CardTitle className="text-base">{achievement.name}</CardTitle>
                                <CardDescription className="text-sm">
                                  {achievement.description}
                                </CardDescription>
                              </div>
                            </div>
                            {achievement.unlocked && (
                              <Badge variant="default" className="bg-yellow-500">
                                ✓
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              +{achievement.xpReward} XP
                            </span>
                            {achievement.unlocked && achievement.unlockedAt && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(achievement.unlockedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* Desafios */}
          <TabsContent value="challenges" className="space-y-4">
            {challenges.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum desafio ativo no momento
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {challenges.map((challenge: any) => (
                  <Card key={challenge.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{challenge.name}</CardTitle>
                          <CardDescription>{challenge.description}</CardDescription>
                        </div>
                        {challenge.completed && (
                          <Badge variant="default" className="bg-green-500">
                            Completo!
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progresso</span>
                          <span className="font-medium">{challenge.userProgress}%</span>
                        </div>
                        <Progress value={challenge.userProgress} />
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Recompensa: +{challenge.xpReward} XP</span>
                          <span>
                            Até {new Date(challenge.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Leaderboard */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Jogadores</CardTitle>
                <CardDescription>Ranking global por XP total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.map((entry: any, index: number) => (
                    <div
                      key={entry.userId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">Usuário #{entry.userId}</p>
                          <p className="text-sm text-muted-foreground">
                            Nível {entry.level} • Streak: {entry.streak}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">{entry.totalXp} XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Histórico de XP */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Histórico de XP</CardTitle>
            <CardDescription>Últimas 20 transações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.reason}</p>
                      <p className="text-xs text-muted-foreground">{tx.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">+{tx.amount} XP</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
