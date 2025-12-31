-- Migration: Dashboard Layouts
-- Created: 2025-12-28
-- Description: Sistema de dashboard personalizável com widgets drag-and-drop

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  isDefault BOOLEAN DEFAULT false,
  layout JSON NOT NULL, -- Array de widgets com posições
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_isDefault (isDefault)
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'balance', 'expenses', 'chart', 'goals', etc
  title VARCHAR(200),
  config JSON, -- Configurações específicas do widget
  enabled BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_type (type)
);

CREATE TABLE IF NOT EXISTS dashboard_presets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  layout JSON NOT NULL,
  thumbnail VARCHAR(500), -- URL da thumbnail
  category ENUM('basic', 'advanced', 'professional', 'custom') DEFAULT 'basic',
  isPublic BOOLEAN DEFAULT true,
  usageCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX idx_category (category),
  INDEX idx_isPublic (isPublic)
);
