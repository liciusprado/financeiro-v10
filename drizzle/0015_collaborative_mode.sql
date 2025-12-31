-- Migration: Collaborative Mode
-- Versão: 10.5.0

-- ========== TABELA: groups ==========
-- Grupos/Famílias para colaboração
CREATE TABLE IF NOT EXISTS `groups` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: group_members ==========
-- Membros de cada grupo com permissões
CREATE TABLE IF NOT EXISTS group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invited_by INT,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY unique_member (group_id, user_id),
  INDEX idx_group (group_id),
  INDEX idx_user (user_id),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: entry_comments ==========
-- Comentários em transações (já pode existir)
CREATE TABLE IF NOT EXISTS entry_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  type ENUM('comment', 'question', 'approval_request', 'approval', 'rejection') DEFAULT 'comment',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entry (entry_id),
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: approvals ==========
-- Sistema de aprovação de despesas
CREATE TABLE IF NOT EXISTS approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  requested_by INT NOT NULL,
  approver_id INT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  response_comment TEXT,
  INDEX idx_entry (entry_id),
  INDEX idx_requester (requested_by),
  INDEX idx_approver (approver_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: activity_logs ==========
-- Log de todas atividades no sistema
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  group_id INT,
  activity_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  description TEXT NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_group (group_id),
  INDEX idx_type (activity_type),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: chat_messages ==========
-- Chat em tempo real entre membros
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  reply_to INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group (group_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: shared_entries ==========
-- Mapeamento de transações compartilhadas
CREATE TABLE IF NOT EXISTS shared_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  group_id INT NOT NULL,
  shared_by INT NOT NULL,
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_share (entry_id, group_id),
  INDEX idx_entry (entry_id),
  INDEX idx_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: approval_rules ==========
-- Regras automáticas de aprovação
CREATE TABLE IF NOT EXISTS approval_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  rule_name VARCHAR(100) NOT NULL,
  condition_type ENUM('amount_above', 'category', 'always') NOT NULL,
  condition_value DECIMAL(15, 2),
  category_id INT,
  approver_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group (group_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

COMMIT;
