-- Migration: Gamification System v10.2.0

CREATE TABLE IF NOT EXISTS user_gamification (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  level INT NOT NULL DEFAULT 1,
  current_xp INT NOT NULL DEFAULT 0,
  total_xp INT NOT NULL DEFAULT 0,
  xp_to_next_level INT NOT NULL DEFAULT 100,
  streak_days INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_achievements INT NOT NULL DEFAULT 0,
  total_challenges_completed INT NOT NULL DEFAULT 0,
  rank_position INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('savings', 'expenses', 'goals', 'streak', 'social', 'milestones') NOT NULL,
  icon VARCHAR(50) NOT NULL,
  xp_reward INT NOT NULL DEFAULT 0,
  rarity ENUM('common', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  achievement_id INT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  notification_sent BOOLEAN DEFAULT FALSE,
  UNIQUE KEY unique_user_achievement (user_id, achievement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS challenges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  type ENUM('daily', 'weekly', 'monthly', 'special') NOT NULL,
  category ENUM('savings', 'expenses', 'budget', 'streak', 'mixed') NOT NULL,
  xp_reward INT NOT NULL,
  bonus_reward INT DEFAULT 0,
  difficulty ENUM('easy', 'medium', 'hard', 'expert') NOT NULL DEFAULT 'medium',
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_challenges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  challenge_id INT NOT NULL,
  progress INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_challenge (user_id, challenge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS xp_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  xp_amount INT NOT NULL,
  reason VARCHAR(100) NOT NULL,
  source_type ENUM('achievement', 'challenge', 'daily_login', 'streak', 'action', 'bonus') NOT NULL,
  source_id INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leaderboard (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  total_xp INT NOT NULL,
  level INT NOT NULL,
  achievements_count INT NOT NULL DEFAULT 0,
  rank_position INT NOT NULL,
  rank_change INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seeds de conquistas
INSERT INTO achievements (code, name, description, category, icon, xp_reward, rarity, requirement_type, requirement_value, order_index) VALUES
('first_save', 'Primeira Economia', 'Economize pela primeira vez', 'savings', '💰', 50, 'common', 'save_money', 1, 1),
('save_1k', 'Economizador Iniciante', 'Economize R$ 1.000', 'savings', '💵', 100, 'common', 'total_saved', 1000, 2),
('save_5k', 'Economizador Experiente', 'Economize R$ 5.000', 'savings', '💎', 250, 'rare', 'total_saved', 5000, 3),
('save_10k', 'Economizador Master', 'Economize R$ 10.000', 'savings', '👑', 500, 'epic', 'total_saved', 10000, 4),
('first_expense', 'Primeira Despesa', 'Registre sua primeira despesa', 'expenses', '📝', 25, 'common', 'add_expense', 1, 6),
('track_100', 'Controlador Dedicado', 'Registre 100 despesas', 'expenses', '📊', 200, 'rare', 'total_expenses', 100, 7),
('first_goal', 'Primeira Meta', 'Crie sua primeira meta financeira', 'goals', '🎯', 50, 'common', 'create_goal', 1, 10),
('goal_complete', 'Realizador', 'Complete uma meta', 'goals', '⭐', 150, 'rare', 'complete_goal', 1, 11),
('streak_7', 'Uma Semana Forte', 'Acesse o app por 7 dias seguidos', 'streak', '🔥', 100, 'common', 'login_streak', 7, 14),
('streak_30', 'Um Mês Dedicado', 'Acesse o app por 30 dias seguidos', 'streak', '🔥🔥', 300, 'rare', 'login_streak', 30, 15),
('level_10', 'Nível 10', 'Alcance o nível 10', 'milestones', '🎖️', 200, 'rare', 'reach_level', 10, 20),
('level_25', 'Nível 25', 'Alcance o nível 25', 'milestones', '🏅', 500, 'epic', 'reach_level', 25, 21);
