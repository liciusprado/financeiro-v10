import { db } from "../db";
import {
  userGamification,
  achievements,
  userAchievements,
  challenges,
  userChallenges,
  xpTransactions,
  type InsertUserGamification,
  type InsertUserAchievement,
  type InsertXpTransaction,
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Tabela de XP por nível (curva exponencial)
 */
const XP_PER_LEVEL = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, // 1-10
  3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450, // 11-20
  11500, 12600, 13750, 14950, 16200, 17500, 18850, 20250, 21700, 23200, // 21-30
  24750, 26350, 28000, 29700, 31450, 33250, 35100, 37000, 38950, 40950, // 31-40
  43000, 45100, 47250, 49450, 51700, 54000, 56350, 58750, 61200, 63700, // 41-50
];

/**
 * Serviço de Gamificação
 */
export class GamificationService {
  /**
   * Inicializar gamificação para novo usuário
   */
  async initializeUser(userId: number) {
    const [existing] = await db
      .select()
      .from(userGamification)
      .where(eq(userGamification.userId, userId));

    if (!existing) {
      await db.insert(userGamification).values({
        userId,
        xp: 0,
        level: 1,
        totalXp: 0,
        streak: 0,
        lastActivityDate: new Date().toISOString().split('T')[0],
      });
    }

    return this.getUserStats(userId);
  }

  /**
   * Obter estatísticas do usuário
   */
  async getUserStats(userId: number) {
    let [stats] = await db
      .select()
      .from(userGamification)
      .where(eq(userGamification.userId, userId));

    if (!stats) {
      await this.initializeUser(userId);
      [stats] = await db
        .select()
        .from(userGamification)
        .where(eq(userGamification.userId, userId));
    }

    // Calcular XP para próximo nível
    const currentLevel = stats.level;
    const nextLevel = currentLevel + 1;
    const xpForNextLevel = nextLevel <= 50 ? XP_PER_LEVEL[nextLevel] : XP_PER_LEVEL[50] * Math.pow(1.1, nextLevel - 50);
    const xpProgress = (stats.xp / xpForNextLevel) * 100;

    return {
      ...stats,
      xpForNextLevel: Math.floor(xpForNextLevel),
      xpProgress: Math.min(100, xpProgress),
    };
  }

  /**
   * Adicionar XP ao usuário
   */
  async addXP(userId: number, amount: number, reason: string, source: string, sourceId?: number) {
    // Registrar transação de XP
    await db.insert(xpTransactions).values({
      userId,
      amount,
      reason,
      source,
      sourceId,
    });

    // Atualizar XP do usuário
    const stats = await this.getUserStats(userId);
    const newXp = stats.xp + amount;
    const newTotalXp = stats.totalXp + amount;

    // Verificar se subiu de nível
    let newLevel = stats.level;
    let remainingXp = newXp;

    while (newLevel < 50 && remainingXp >= XP_PER_LEVEL[newLevel + 1]) {
      remainingXp -= XP_PER_LEVEL[newLevel + 1];
      newLevel++;
    }

    await db
      .update(userGamification)
      .set({
        xp: remainingXp,
        level: newLevel,
        totalXp: newTotalXp,
      })
      .where(eq(userGamification.userId, userId));

    // Verificar conquista de nível
    if (newLevel > stats.level) {
      await this.checkLevelAchievements(userId, newLevel);
    }

    return {
      xpAdded: amount,
      newLevel,
      leveledUp: newLevel > stats.level,
    };
  }

  /**
   * Atualizar streak
   */
  async updateStreak(userId: number) {
    const stats = await this.getUserStats(userId);
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = stats.lastActivityDate;

    if (lastActivity === today) {
      // Já fez atividade hoje
      return stats.streak;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = stats.streak;

    if (lastActivity === yesterdayStr) {
      // Continuou o streak
      newStreak++;
    } else {
      // Quebrou o streak
      newStreak = 1;
    }

    await db
      .update(userGamification)
      .set({
        streak: newStreak,
        lastActivityDate: today,
      })
      .where(eq(userGamification.userId, userId));

    // Verificar conquistas de streak
    await this.checkStreakAchievements(userId, newStreak);

    // Dar XP por streak
    if (newStreak >= 3) {
      const streakBonus = Math.min(newStreak * 5, 100);
      await this.addXP(userId, streakBonus, `Streak de ${newStreak} dias!`, 'streak');
    }

    return newStreak;
  }

  /**
   * Listar todas as conquistas
   */
  async listAchievements() {
    return await db.select().from(achievements).orderBy(achievements.category, achievements.tier);
  }

  /**
   * Obter conquistas do usuário
   */
  async getUserAchievements(userId: number) {
    const all = await this.listAchievements();
    const unlocked = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    return all.map((achievement) => {
      const userAch = unlocked.find((u) => u.achievementId === achievement.id);
      return {
        ...achievement,
        unlocked: userAch?.completed || false,
        unlockedAt: userAch?.unlockedAt,
        progress: userAch?.progress || 0,
      };
    });
  }

  /**
   * Desbloquear conquista
   */
  async unlockAchievement(userId: number, achievementCode: string) {
    const [achievement] = await db
      .select()
      .from(achievements)
      .where(eq(achievements.code, achievementCode));

    if (!achievement) return { success: false, message: 'Conquista não encontrada' };

    // Verificar se já desbloqueou
    const [existing] = await db
      .select()
      .from(userAchievements)
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievement.id)
        )
      );

    if (existing?.completed) {
      return { success: false, message: 'Conquista já desbloqueada' };
    }

    // Desbloquear
    if (existing) {
      await db
        .update(userAchievements)
        .set({ completed: true, progress: 100 })
        .where(eq(userAchievements.id, existing.id));
    } else {
      await db.insert(userAchievements).values({
        userId,
        achievementId: achievement.id,
        completed: true,
        progress: 100,
      });
    }

    // Dar XP
    if (achievement.xpReward > 0) {
      await this.addXP(
        userId,
        achievement.xpReward,
        `Conquista: ${achievement.name}`,
        'achievement',
        achievement.id
      );
    }

    return {
      success: true,
      achievement,
      xpEarned: achievement.xpReward,
    };
  }

  /**
   * Verificar conquistas de nível
   */
  private async checkLevelAchievements(userId: number, level: number) {
    const levelAchievements = ['level_10', 'level_25', 'level_50'];
    
    for (const code of levelAchievements) {
      const targetLevel = parseInt(code.split('_')[1]);
      if (level >= targetLevel) {
        await this.unlockAchievement(userId, code);
      }
    }
  }

  /**
   * Verificar conquistas de streak
   */
  private async checkStreakAchievements(userId: number, streak: number) {
    const streakMap: Record<number, string> = {
      3: 'streak_3',
      7: 'streak_7',
      30: 'streak_30',
      100: 'streak_100',
    };

    const code = streakMap[streak];
    if (code) {
      await this.unlockAchievement(userId, code);
    }
  }

  /**
   * Listar desafios ativos
   */
  async listActiveChallenges() {
    const today = new Date().toISOString().split('T')[0];
    
    return await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.isActive, true),
          sql`${challenges.startDate} <= ${today}`,
          sql`${challenges.endDate} >= ${today}`
        )
      )
      .orderBy(challenges.endDate);
  }

  /**
   * Obter desafios do usuário
   */
  async getUserChallenges(userId: number) {
    const active = await this.listActiveChallenges();
    
    const userProgress = await db
      .select()
      .from(userChallenges)
      .where(eq(userChallenges.userId, userId));

    return active.map((challenge) => {
      const progress = userProgress.find((p) => p.challengeId === challenge.id);
      return {
        ...challenge,
        userProgress: progress?.progress || 0,
        completed: progress?.completed || false,
        completedAt: progress?.completedAt,
      };
    });
  }

  /**
   * Obter leaderboard
   */
  async getLeaderboard(limit: number = 10) {
    return await db
      .select({
        userId: userGamification.userId,
        level: userGamification.level,
        totalXp: userGamification.totalXp,
        streak: userGamification.streak,
      })
      .from(userGamification)
      .orderBy(desc(userGamification.totalXp))
      .limit(limit);
  }

  /**
   * Obter histórico de XP
   */
  async getXPHistory(userId: number, limit: number = 20) {
    return await db
      .select()
      .from(xpTransactions)
      .where(eq(xpTransactions.userId, userId))
      .orderBy(desc(xpTransactions.createdAt))
      .limit(limit);
  }
}

export const gamificationService = new GamificationService();
