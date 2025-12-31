-- Migration: Custom Alerts System
-- Created: 2025-12-28
-- Description: Sistema completo de alertas customizáveis com condições complexas

CREATE TABLE IF NOT EXISTS custom_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  conditions JSON NOT NULL, -- Array de condições IF/THEN
  channels JSON NOT NULL, -- ["push", "email", "whatsapp"]
  frequency ENUM('realtime', 'daily', 'weekly', 'monthly') DEFAULT 'realtime',
  lastTriggered TIMESTAMP NULL,
  triggerCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_enabled (enabled)
);

CREATE TABLE IF NOT EXISTS alert_triggers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alertId INT NOT NULL,
  triggeredAt TIMESTAMP DEFAULT NOW(),
  conditionsMet JSON NOT NULL, -- Quais condições foram atendidas
  channelsSent JSON NOT NULL, -- ["push", "email"] - canais que foram enviados
  message TEXT NOT NULL,
  metadata JSON, -- Dados adicionais (valores, itens, etc)
  success BOOLEAN DEFAULT true,
  error TEXT,
  FOREIGN KEY (alertId) REFERENCES custom_alerts(id) ON DELETE CASCADE,
  INDEX idx_alertId (alertId),
  INDEX idx_triggeredAt (triggeredAt)
);

CREATE TABLE IF NOT EXISTS alert_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  conditions JSON NOT NULL,
  channels JSON NOT NULL,
  isPublic BOOLEAN DEFAULT false, -- Templates públicos (compartilhados)
  usageCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_isPublic (isPublic)
);

CREATE TABLE IF NOT EXISTS alert_channels_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL UNIQUE,
  emailEnabled BOOLEAN DEFAULT false,
  emailAddress VARCHAR(320),
  whatsappEnabled BOOLEAN DEFAULT false,
  whatsappNumber VARCHAR(20),
  pushEnabled BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
