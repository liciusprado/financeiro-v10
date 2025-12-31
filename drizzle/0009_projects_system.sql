-- Migration: Projects System
-- Created: 2025-12-28
-- Description: Sistema de orçamento por projeto/evento (casamento, reforma, viagem, etc)

CREATE TABLE IF NOT EXISTS projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  type ENUM('wedding', 'renovation', 'travel', 'event', 'other') DEFAULT 'other',
  startDate DATE NOT NULL,
  endDate DATE,
  totalBudget INT NOT NULL, -- cents
  status ENUM('planning', 'active', 'completed', 'cancelled') DEFAULT 'planning',
  color VARCHAR(20) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'briefcase',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_dates (startDate, endDate)
);

CREATE TABLE IF NOT EXISTS project_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  budget INT NOT NULL, -- cents
  color VARCHAR(20) DEFAULT '#6b7280',
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_projectId (projectId)
);

CREATE TABLE IF NOT EXISTS project_expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  categoryId INT,
  description VARCHAR(200) NOT NULL,
  plannedValue INT NOT NULL, -- cents
  actualValue INT DEFAULT 0, -- cents
  date DATE NOT NULL,
  paid BOOLEAN DEFAULT false,
  notes TEXT,
  attachmentUrl TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES project_categories(id) ON DELETE SET NULL,
  INDEX idx_projectId (projectId),
  INDEX idx_categoryId (categoryId),
  INDEX idx_date (date),
  INDEX idx_paid (paid)
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  dueDate DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_projectId (projectId),
  INDEX idx_dueDate (dueDate)
);
