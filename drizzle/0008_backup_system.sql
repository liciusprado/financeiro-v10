-- Migration: Backup System
-- Created: 2025-12-28
-- Description: Sistema completo de backup e restore automático

CREATE TABLE IF NOT EXISTS backups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  fileKey VARCHAR(500) NOT NULL,
  fileSize INT NOT NULL,
  type ENUM('auto', 'manual') DEFAULT 'auto',
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt)
);

CREATE TABLE IF NOT EXISTS backup_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'weekly',
  time TIME DEFAULT '02:00:00',
  enabled BOOLEAN DEFAULT true,
  lastRun TIMESTAMP NULL,
  nextRun TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_schedule (userId)
);

CREATE TABLE IF NOT EXISTS backup_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  backupId INT NOT NULL,
  action ENUM('started', 'completed', 'failed', 'restored') NOT NULL,
  message TEXT,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (backupId) REFERENCES backups(id) ON DELETE CASCADE,
  INDEX idx_backupId (backupId)
);
